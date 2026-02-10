import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { ApiHelperService } from '@core/services/api-helper.service';
import { NotificationService } from '@core/services/notification.service';
import { Collection } from '@core/models/collection';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { PaginatorService } from '@core/services/paginator.service';
import { LibraryItem } from '@core/models/library-item';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { NavigationStateService, ListViewState } from '@core/services/navigation-state.service';
import { BaseListComponent } from '@shared/components/base-list.component';
import { ImageCacheService } from '@core/services/image-cache.service';
import { CachedImageDirective } from '@shared/directives/cached-image.directive';

@Component({
  selector: 'app-collection-list',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    RouterLink,
    CachedImageDirective
  ],
  templateUrl: './collection-list.component.html',
  styleUrls: ['./collection-list.component.scss']
})
export class CollectionListComponent extends BaseListComponent<Collection> implements OnInit, AfterViewInit {
  public isDirector = false;
  public isChoirAdmin = false;
  public isAdmin = false;
  public viewMode: 'collections' | 'pieces' = 'collections';
  public displayedColumns: string[] = ['cover', 'status', 'title', 'titles', 'publisher', 'actions'];
  public libraryItemIds = new Set<number>();
  public isHandset$: Observable<boolean>;
  public selectedCollection: Collection | null = null;
  public composerCache = new Map<number, string>();
  private readonly stateKey = 'collection-list';
  private initialState: ListViewState | null = null;

  constructor(
    paginatorService: PaginatorService,
    public apiService: ApiService,
    private apiHelper: ApiHelperService,
    private notification: NotificationService,
    private router: Router,
    private authService: AuthService,
    private breakpointObserver: BreakpointObserver,
    private navState: NavigationStateService,
    private imageCacheService: ImageCacheService
  ) {
    super(paginatorService);
    this.isHandset$ = this.breakpointObserver.observe([Breakpoints.Handset]).pipe(map(result => result.matches));
    // Update cached state when navigating with browser history
    this.navState.onPopState(this.stateKey, s => this.initialState = s);
  }

  get paginatorKey(): string {
    return 'collection-list';
  }

  loadData(): Observable<Collection[]> {
    return this.apiService.getCollections();
  }

  protected override onDataLoaded(collections: Collection[]): void {
    // Prefetch cover images in background for better UX
    const coversToPrefetch = collections
      .filter(c => c.coverImage)
      .map(c => ({ type: 'collection' as const, id: c.id }));

    if (coversToPrefetch.length) {
      this.imageCacheService.prefetch(coversToPrefetch, { priority: 'low' }).subscribe();
    }

    // Restore selected collection from navigation state
    if (this.initialState) {
      const sel = this.dataSource.data.find(c => c.id === this.initialState!.selectedId);
      if (sel) this.selectedCollection = sel;
    }
  }

  override ngOnInit(): void {
    this.initialState = this.navState.getState(this.stateKey);

    // Load library items to show which collections are in library
    this.apiService.getLibraryItems().subscribe((items: LibraryItem[]) => {
      this.libraryItemIds.clear();
      items.forEach(i => {
        const id = i.collectionId || i.collection?.id;
        if (id != null) {
          this.libraryItemIds.add(id);
        }
      });
    });

    // Subscribe to auth state
    this.authService.isChoirAdmin$.subscribe(v => this.isChoirAdmin = v);
    this.authService.isDirector$.subscribe(v => this.isDirector = v);
    this.authService.isAdmin$.subscribe(v => this.isAdmin = v);

    // Call parent ngOnInit to trigger data loading
    super.ngOnInit();
  }

  override ngAfterViewInit(): void {
    // Call parent to setup sort/paginator
    super.ngAfterViewInit();

    // Restore page from navigation state
    if (this.paginator && this.initialState) {
      this.paginator.pageIndex = this.initialState.page;
    }
  }

  toggleSelection(collection: Collection): void {
    this.selectedCollection = this.selectedCollection === collection ? null : collection;
  }

  syncCollection(collection: Collection): void {
    this.apiHelper.handleApiCall(
      this.apiService.addCollectionsToChoir([collection.id]),
      {
        successMessage: collection.isAdded
          ? `Sammlung '${collection.title}' wurde aktualisiert.`
          : `Sammlung '${collection.title}' wurde zum Chorrepertoire hinzugefügt.`,
        onSuccess: () => this.refresh()
      }
    ).subscribe();
  }

  syncAllCollections(): void {
    const ids = this.dataSource.data.map(c => c.id);
    if (!ids.length) { return; }
    this.apiHelper.handleApiCall(
      this.apiService.addCollectionsToChoir(ids),
      {
        successMessage: 'Alle Sammlungen wurden synchronisiert.',
        onSuccess: () => this.refresh()
      }
    ).subscribe();
  }

  openCollection(collection: Collection): void {
    if (!this.isChoirAdmin && !this.isAdmin) { return; }
    const page = this.paginator ? this.paginator.pageIndex : 0;
    this.navState.saveState(this.stateKey, { page, selectedId: collection.id });
    // Create an extra history entry so the back button returns to this list with state
    this.navState.pushPlaceholderState();
    this.router.navigate(['/collections/edit', collection.id]);
  }

  onViewChange(value: 'collections' | 'pieces'): void {
    if (value === 'pieces') {
      this.router.navigate(['/collections/pieces']);
    }
  }

  public getCollectionComposer(collection: Collection): string {
    if (collection.pieceCount === 1) {
      const cached = this.composerCache.get(collection.id);
      if (cached !== undefined) {
        return cached;
      }
      this.composerCache.set(collection.id, '');
      this.apiService.getCollectionById(collection.id).subscribe(col => {
        const name = col.pieces?.[0]?.composer?.name || col.pieces?.[0]?.origin || '';
        this.composerCache.set(collection.id, name);
      });
    }
    return '';
  }
}
