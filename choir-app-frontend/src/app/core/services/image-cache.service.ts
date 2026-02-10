import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, defer, from } from 'rxjs';
import { switchMap, catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { CachedImage, CacheConfig, CacheStats, ImageRef, PreloadOptions } from '../models/cached-image';
import { IndexedDBCacheService } from './indexed-db-cache.service';

@Injectable({
  providedIn: 'root'
})
export class ImageCacheService {
  private memoryCache = new Map<string, CachedImage>();
  private accessOrder: string[] = [];
  private idbAvailable = true;

  private config: CacheConfig = {
    memory: {
      maxItems: 50,
      maxSizeBytes: 50 * 1024 * 1024 // 50 MB
    },
    indexedDB: {
      maxItems: 500,
      maxSizeBytes: 200 * 1024 * 1024, // 200 MB
      dbName: 'choirapp-image-cache',
      version: 1
    }
  };

  private stats = {
    hits: { memory: 0, indexedDB: 0, serviceWorker: 0 },
    misses: 0,
    errors: { network: 0, indexedDB: 0, quota: 0 }
  };

  // Cache for in-flight requests to prevent duplicate network calls
  private inFlightRequests = new Map<string, Observable<string>>();

  constructor(
    private http: HttpClient,
    private idb: IndexedDBCacheService
  ) {
    this.initializeCache();
  }

  /**
   * Initialize cache and check IndexedDB availability
   */
  private async initializeCache(): Promise<void> {
    try {
      this.idbAvailable = this.idb.isAvailable();
      if (!this.idbAvailable) {
        console.warn('[ImageCache] IndexedDB unavailable, using memory-only cache');
        this.config.memory.maxItems = 100;
        this.config.memory.maxSizeBytes = 100 * 1024 * 1024; // 100 MB
      }
    } catch (error) {
      console.error('[ImageCache] Initialization error:', error);
      this.idbAvailable = false;
    }
  }

  /**
   * Get image from cache or fetch from network
   * Checks: Memory → IndexedDB → Service Worker/Network
   */
  getImage(type: 'piece' | 'collection' | 'post', id: number): Observable<string> {
    const key = this.createKey(type, id);

    // Check if request is already in flight
    const inFlight = this.inFlightRequests.get(key);
    if (inFlight) {
      return inFlight;
    }

    const request$ = defer(() => from(this.checkMemoryAndIDB(key))).pipe(
      switchMap(cached => {
        if (cached) {
          return of(cached);
        }
        // Cache miss - fetch from network
        this.stats.misses++;
        return this.fetchFromNetwork(type, id);
      }),
      tap(data => {
        // Populate cache with fetched data
        if (data && !this.memoryCache.has(key)) {
          this.setCacheData(key, data, type, id);
        }
      }),
      catchError(error => {
        this.stats.errors.network++;
        console.error(`[ImageCache] Failed to load image ${key}:`, error);
        return of(this.getPlaceholderImage(type));
      }),
      shareReplay(1)
    );

    // Store in-flight request
    this.inFlightRequests.set(key, request$);

    // Clean up after request completes
    request$.subscribe({
      complete: () => {
        this.inFlightRequests.delete(key);
      },
      error: () => {
        this.inFlightRequests.delete(key);
      }
    });

    return request$;
  }

  /**
   * Check memory cache and IndexedDB
   */
  private async checkMemoryAndIDB(key: string): Promise<string | null> {
    // Check memory first
    const memCached = this.getFromMemory(key);
    if (memCached) {
      this.stats.hits.memory++;
      return memCached.data;
    }

    // Check IndexedDB
    if (this.idbAvailable) {
      try {
        const idbCached = await this.idb.get(key);
        if (idbCached && this.validateCacheEntry(idbCached)) {
          this.stats.hits.indexedDB++;
          // Promote to memory cache
          this.setInMemory(idbCached);
          // Update access timestamp
          await this.idb.touch(key);
          return idbCached.data;
        }
      } catch (error) {
        this.stats.errors.indexedDB++;
        console.error('[ImageCache] IndexedDB read error:', error);
      }
    }

    return null;
  }

  /**
   * Fetch image from network via appropriate service
   */
  private fetchFromNetwork(type: 'piece' | 'collection' | 'post', id: number): Observable<string> {
    const apiUrl = environment.apiUrl;

    switch (type) {
      case 'piece':
        return this.http.get<{ data: string }>(`${apiUrl}/pieces/${id}/image`).pipe(
          switchMap(res => res.data ? of(res.data) : of(this.getPlaceholderImage(type)))
        );

      case 'collection':
        return this.http.get<{ data: string }>(`${apiUrl}/collections/${id}/cover`).pipe(
          switchMap(res => res.data ? of(res.data) : of(this.getPlaceholderImage(type)))
        );

      case 'post':
        // Posts use direct URL, need to fetch and convert
        return this.http.get(`${apiUrl}/posts/${id}/attachment`, { responseType: 'blob' }).pipe(
          switchMap(blob => this.blobToBase64(blob)),
          catchError(() => of(this.getPlaceholderImage(type)))
        );

      default:
        return of(this.getPlaceholderImage(type));
    }
  }

  /**
   * Convert Blob to base64 data URL
   */
  private blobToBase64(blob: Blob): Observable<string> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onloadend = () => {
        observer.next(reader.result as string);
        observer.complete();
      };
      reader.onerror = error => observer.error(error);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Preload images (blocking, waits for completion)
   */
  preload(images: ImageRef[], options?: PreloadOptions): Observable<void> {
    const maxConcurrent = options?.maxConcurrent || 5;
    const loadQueue = [...images];
    let activeLoads = 0;
    const results: Observable<string>[] = [];

    return new Observable(observer => {
      const loadNext = () => {
        while (activeLoads < maxConcurrent && loadQueue.length > 0) {
          const image = loadQueue.shift()!;
          activeLoads++;

          this.getImage(image.type, image.id).subscribe({
            next: () => {
              activeLoads--;
              loadNext();
            },
            error: () => {
              activeLoads--;
              loadNext();
            }
          });
        }

        if (activeLoads === 0 && loadQueue.length === 0) {
          observer.next();
          observer.complete();
        }
      };

      loadNext();
    });
  }

  /**
   * Prefetch images in background (non-blocking)
   */
  prefetch(images: ImageRef[], options?: PreloadOptions): Observable<number> {
    return new Observable(observer => {
      let loaded = 0;
      const total = images.length;

      images.forEach(image => {
        this.getImage(image.type, image.id).subscribe({
          next: () => {
            loaded++;
            if (loaded === total) {
              observer.next(loaded);
              observer.complete();
            }
          },
          error: () => {
            loaded++;
            if (loaded === total) {
              observer.next(loaded);
              observer.complete();
            }
          }
        });
      });
    });
  }

  /**
   * Invalidate specific image from all cache tiers
   */
  async invalidate(key: string): Promise<void> {
    // Remove from memory
    this.memoryCache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);

    // Remove from IndexedDB
    if (this.idbAvailable) {
      await this.idb.delete(key);
    }

    console.log(`[ImageCache] Invalidated: ${key}`);
  }

  /**
   * Invalidate all images of a specific type
   */
  async invalidateByType(type: 'piece' | 'collection' | 'post'): Promise<void> {
    const prefix = `${type}:`;

    // Remove from memory
    const keysToDelete = Array.from(this.memoryCache.keys()).filter(k => k.startsWith(prefix));
    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    });

    // Remove from IndexedDB
    if (this.idbAvailable) {
      await this.idb.deleteByType(type);
    }

    console.log(`[ImageCache] Invalidated all ${type} images`);
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    this.accessOrder = [];

    if (this.idbAvailable) {
      await this.idb.clear();
    }

    console.log('[ImageCache] Cleared all caches');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits.memory + this.stats.hits.indexedDB + this.stats.misses;

    return {
      memory: {
        items: this.memoryCache.size,
        sizeBytes: this.getMemorySize(),
        hitRate: totalRequests > 0 ? this.stats.hits.memory / totalRequests : 0
      },
      indexedDB: {
        items: 0, // Could be fetched async if needed
        sizeBytes: 0,
        hitRate: totalRequests > 0 ? this.stats.hits.indexedDB / totalRequests : 0
      },
      network: {
        requests: this.stats.misses,
        failures: this.stats.errors.network
      }
    };
  }

  /**
   * Get image from memory cache
   */
  private getFromMemory(key: string): CachedImage | null {
    const cached = this.memoryCache.get(key);
    if (cached) {
      // Update LRU order
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
      cached.timestamp = Date.now();
      cached.accessCount++;
      return cached;
    }
    return null;
  }

  /**
   * Set image in memory cache
   */
  private setInMemory(image: CachedImage): void {
    this.memoryCache.set(image.key, image);
    this.accessOrder.push(image.key);
    this.evictMemoryIfNeeded();
  }

  /**
   * Store data in both memory and IndexedDB
   */
  private async setCacheData(key: string, data: string, type: string, id: number): Promise<void> {
    const size = this.calculateBase64Size(data);
    const cachedImage: CachedImage = {
      key,
      data,
      timestamp: Date.now(),
      size,
      accessCount: 1,
      metadata: {
        type: type as 'piece' | 'collection' | 'post',
        id,
        mimeType: this.extractMimeType(data)
      }
    };

    // Store in memory
    this.setInMemory(cachedImage);

    // Store in IndexedDB
    if (this.idbAvailable) {
      try {
        await this.idb.set(cachedImage);
        await this.evictIDBIfNeeded();
      } catch (error: any) {
        if (error?.name === 'QuotaExceededError') {
          this.stats.errors.quota++;
          await this.handleQuotaExceeded();
        } else {
          this.stats.errors.indexedDB++;
          console.error('[ImageCache] IndexedDB write error:', error);
        }
      }
    }
  }

  /**
   * Evict oldest items from memory if limits exceeded
   */
  private evictMemoryIfNeeded(): void {
    // Evict by item count
    while (this.memoryCache.size > this.config.memory.maxItems) {
      const keyToEvict = this.accessOrder.shift();
      if (keyToEvict) {
        this.memoryCache.delete(keyToEvict);
      }
    }

    // Evict by size
    while (this.getMemorySize() > this.config.memory.maxSizeBytes && this.accessOrder.length > 0) {
      const keyToEvict = this.accessOrder.shift();
      if (keyToEvict) {
        this.memoryCache.delete(keyToEvict);
      }
    }
  }

  /**
   * Evict oldest items from IndexedDB if limits exceeded
   */
  private async evictIDBIfNeeded(): Promise<void> {
    if (!this.idbAvailable) return;

    try {
      const count = await this.idb.count();
      const size = await this.idb.getTotalSize();

      if (count > this.config.indexedDB.maxItems || size > this.config.indexedDB.maxSizeBytes) {
        const targetSize = this.config.indexedDB.maxSizeBytes * 0.8; // Evict to 80%
        await this.idb.evictLRU(targetSize);
      }
    } catch (error) {
      console.error('[ImageCache] Eviction error:', error);
    }
  }

  /**
   * Handle quota exceeded error
   */
  private async handleQuotaExceeded(): Promise<void> {
    console.warn('[ImageCache] Storage quota exceeded, performing aggressive eviction');

    if (this.idbAvailable) {
      const targetSize = this.config.indexedDB.maxSizeBytes * 0.5; // Evict to 50%
      await this.idb.evictLRU(targetSize);
    }
  }

  /**
   * Get total memory cache size in bytes
   */
  private getMemorySize(): number {
    let total = 0;
    this.memoryCache.forEach(image => {
      total += image.size;
    });
    return total;
  }

  /**
   * Calculate base64 string size in bytes
   */
  private calculateBase64Size(base64: string): number {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const padding = (base64Data.match(/=/g) || []).length;
    return Math.floor((base64Data.length * 3) / 4 - padding);
  }

  /**
   * Extract MIME type from base64 data URL
   */
  private extractMimeType(data: string): string | undefined {
    const match = data.match(/^data:([^;]+);base64,/);
    return match ? match[1] : undefined;
  }

  /**
   * Validate cache entry
   */
  private validateCacheEntry(item: CachedImage): boolean {
    return !!(
      item.key &&
      item.data &&
      item.data.startsWith('data:image') &&
      item.timestamp > 0
    );
  }

  /**
   * Get placeholder image for type
   */
  private getPlaceholderImage(type: string): string {
    // Simple SVG placeholder images
    const placeholders: Record<string, string> = {
      piece: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=',
      collection: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBDb3ZlcjwvdGV4dD48L3N2Zz4=',
      post: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBBdHRhY2htZW50PC90ZXh0Pjwvc3ZnPg=='
    };
    return placeholders[type] || placeholders['piece'];
  }

  /**
   * Create cache key from type and ID
   */
  private createKey(type: string, id: number): string {
    return `${type}:${id}`;
  }
}
