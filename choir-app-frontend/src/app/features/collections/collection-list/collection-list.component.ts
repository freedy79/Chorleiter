import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ApiService } from '@core/services/api.service';
import { Collection } from '@core/models/collection';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { PaginatorService } from '@core/services/paginator.service';
import { LibraryItem } from '@core/models/library-item';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { NavigationStateService, ListViewState } from '@core/services/navigation-state.service';

@Component({
  selector: 'app-collection-list',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    RouterLink
  ],
  templateUrl: './collection-list.component.html',
  styleUrls: ['./collection-list.component.scss']
})
export class CollectionListComponent implements OnInit, AfterViewInit {
  public dataSource = new MatTableDataSource<Collection>();
  public isLoading = true;
  public isChoirAdmin = false;
  public isAdmin = false;
  public viewMode: 'collections' | 'pieces' = 'collections';
  public pageSizeOptions: number[] = [10, 25, 50];
  public pageSize = 10;
  private _sort!: MatSort;
  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) {
      this._sort = sort;
      this.dataSource.sort = this._sort;
    }
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  public displayedColumns: string[] = ['cover', 'status', 'title', 'titles', 'publisher', 'actions'];
  public libraryItemIds = new Set<number>();
  public isHandset$: Observable<boolean>;
  public selectedCollection: Collection | null = null;
  private readonly stateKey = 'collection-list';
  private initialState: ListViewState | null = null;

  /**
   * Cache for the composer names of single-edition collections.
   * Keyed by the collection ID to avoid repeated API calls.
   */
  private composerCache = new Map<number, string>();

  constructor(
    public apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService,
    private paginatorService: PaginatorService,
    private breakpointObserver: BreakpointObserver,
    private navState: NavigationStateService
  ) {
    this.pageSize = this.paginatorService.getPageSize('collection-list', this.pageSizeOptions[0]);
    this.isHandset$ = this.breakpointObserver.observe([Breakpoints.Handset]).pipe(map(result => result.matches));
    // Update cached state when navigating with browser history
    this.navState.onPopState(this.stateKey, s => this.initialState = s);
  }

  ngOnInit(): void {
    this.initialState = this.navState.getState(this.stateKey);
    this.loadCollections();
    this.apiService.getLibraryItems().subscribe((items: LibraryItem[]) => {
      this.libraryItemIds.clear();
      items.forEach(i => {
        const id = i.collectionId || i.collection?.id;
        if (id != null) this.libraryItemIds.add(id);
      });
    });
    this.apiService.checkChoirAdminStatus().subscribe(r => this.isChoirAdmin = r.isChoirAdmin);
    this.authService.isAdmin$.subscribe(v => this.isAdmin = v);
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.dataSource.paginator = this.paginator;
      if (this.initialState) {
        this.paginator.pageIndex = this.initialState.page;
        const sel = this.dataSource.data.find(c => c.id === this.initialState!.selectedId);
        if (sel) this.selectedCollection = sel;
      }
      this.paginator.page.subscribe(e => this.paginatorService.setPageSize('collection-list', e.pageSize));
    }
  }

  toggleSelection(collection: Collection): void {
    this.selectedCollection = this.selectedCollection === collection ? null : collection;
  }

  loadCollections(): void {
    this.isLoading = true;
    this.apiService.getCollections().subscribe(collections => {
      const coverRequests = collections
        .filter(c => c.coverImage)
        .map(c => this.apiService.getCollectionCover(c.id).pipe(map(data => ({ id: c.id, data }))));

      if (coverRequests.length) {
        forkJoin(coverRequests).subscribe(results => {
          results.forEach(res => {
            const col = collections.find(c => c.id === res.id);
            if (col) col.coverImageData = res.data;
          });
          this.dataSource.data = collections;
          if (this.initialState) {
            const sel = this.dataSource.data.find(c => c.id === this.initialState!.selectedId);
            if (sel) this.selectedCollection = sel;
          }
          this.isLoading = false;
        });
      } else {
        this.dataSource.data = collections;
        if (this.initialState) {
          const sel = this.dataSource.data.find(c => c.id === this.initialState!.selectedId);
          if (sel) this.selectedCollection = sel;
        }
        this.isLoading = false;
      }
    });
  }


  syncCollection(collection: Collection): void {
    this.apiService.addCollectionsToChoir([collection.id]).subscribe({
      next: () => {
        const msg = collection.isAdded
          ? `Sammlung '${collection.title}' wurde aktualisiert.`
          : `Sammlung '${collection.title}' wurde zum Chorrepertoire hinzugefügt.`;
        this.snackBar.open(msg, 'OK', {
          duration: 3000,
          verticalPosition: 'top'
        });
        this.loadCollections();
      },
      error: (err) => {
        this.snackBar.open(`Fehler beim Aktualisieren der Sammlung: ${err.message}`, 'Schließen', {
          duration: 5000,
          verticalPosition: 'top'
        });
      }
    });
  }

  syncAllCollections(): void {
    const ids = this.dataSource.data.map(c => c.id);
    if (!ids.length) { return; }
    this.apiService.addCollectionsToChoir(ids).subscribe({
      next: () => {
        this.snackBar.open('Alle Sammlungen wurden synchronisiert.', 'OK', {
          duration: 3000,
          verticalPosition: 'top'
        });
        this.loadCollections();
      },
      error: (err) => {
        this.snackBar.open(`Fehler beim Aktualisieren der Sammlungen: ${err.message}`, 'Schließen', {
          duration: 5000,
          verticalPosition: 'top'
        });
      }
    });
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
