import { Directive, ElementRef, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { ImageCacheService } from '@core/services/image-cache.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Directive({
  selector: 'img[appCachedImage]',
  standalone: true
})
export class CachedImageDirective implements OnInit, OnDestroy {
  @Input() appCachedImage!: number;
  @Input() cacheType!: 'piece' | 'collection' | 'post';
  @Input() lazyLoad = true;
  @Input() loadingPlaceholder?: string;
  @Input() errorPlaceholder?: string;
  @Output() imageLoaded = new EventEmitter<void>();
  @Output() imageError = new EventEmitter<Error>();

  private destroy$ = new Subject<void>();
  private observer?: IntersectionObserver;
  private hasLoaded = false;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private imageCacheService: ImageCacheService
  ) {}

  ngOnInit(): void {
    if (!this.cacheType) {
      console.error('[CachedImageDirective] cacheType is required');
      return;
    }

    if (this.appCachedImage === undefined || this.appCachedImage === null) {
      console.error('[CachedImageDirective] appCachedImage (id) is required');
      return;
    }

    // Set loading placeholder immediately
    if (this.loadingPlaceholder) {
      this.el.nativeElement.src = this.loadingPlaceholder;
    }

    if (this.lazyLoad) {
      this.setupLazyLoading();
    } else {
      this.loadImage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * Setup IntersectionObserver for lazy loading
   */
  private setupLazyLoading(): void {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback for browsers without IntersectionObserver
      this.loadImage();
      return;
    }

    const options: IntersectionObserverInit = {
      root: null, // viewport
      rootMargin: '50px', // Load 50px before entering viewport
      threshold: 0.01 // Trigger when 1% visible
    };

    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.hasLoaded) {
          this.loadImage();
          this.observer?.disconnect(); // Stop observing after load
        }
      });
    }, options);

    this.observer.observe(this.el.nativeElement);
  }

  /**
   * Load image from cache service
   */
  private loadImage(): void {
    if (this.hasLoaded) return;

    this.hasLoaded = true;

    this.imageCacheService
      .getImage(this.cacheType, this.appCachedImage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (imageData: string) => {
          if (imageData) {
            this.el.nativeElement.src = imageData;
            this.el.nativeElement.classList.add('cached-image-loaded');
            this.imageLoaded.emit();
          } else if (this.errorPlaceholder) {
            this.el.nativeElement.src = this.errorPlaceholder;
          }
        },
        error: (error: Error) => {
          console.error(`[CachedImageDirective] Failed to load ${this.cacheType}:${this.appCachedImage}:`, error);
          if (this.errorPlaceholder) {
            this.el.nativeElement.src = this.errorPlaceholder;
          }
          this.imageError.emit(error);
        }
      });
  }
}
