import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { PaginatorService } from '@core/services/paginator.service';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, BehaviorSubject, merge, of } from 'rxjs';
import { switchMap, map, startWith, catchError, tap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { PieceService } from 'src/app/core/services/piece.service';
import { Piece } from 'src/app/core/models/piece';
import { Collection } from 'src/app/core/models/collection';
import { Category } from 'src/app/core/models/category';
import { PieceDialogComponent } from '../piece-dialog/piece-dialog.component';
import { RepertoireFilter } from '@core/models/repertoire-filter';
import { FilterPresetService } from '@core/services/filter-preset.service';
import { AuthService } from '@core/services/auth.service';
import { FilterPresetDialogComponent, FilterPresetDialogData } from '../filter-preset-dialog/filter-preset-dialog.component';

@Component({
  selector: 'app-literature-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './literature-list.component.html',
  styleUrls: ['./literature-list.component.scss']
})
export class LiteratureListComponent implements OnInit, AfterViewInit {
  // --- Reactive Subjects for triggering updates ---
  private refresh$ = new BehaviorSubject<void>(undefined);
  public filterByCollectionId$ = new BehaviorSubject<number | null>(null);
  public filterByCategoryId$ = new BehaviorSubject<number | null>(null);
  public onlySingable$ = new BehaviorSubject<boolean>(false);
  public searchControl = new FormControl('');
  public filtersExpanded = false;
  private readonly FILTER_KEY = 'repertoireFilters';

  // --- Observables for filter display ---
  public collections$!: Observable<Collection[]>;
  public categories$!: Observable<Category[]>;

  // --- Table, Paginator, and Sort Logic ---
  public displayedColumns: string[] = ['title', 'composer', 'category', 'reference', 'status', 'actions'];
  public dataSource = new MatTableDataSource<Piece>();
  public totalPieces = 0;
  public pageSizeOptions: number[] = [10, 25, 50];
  public pageSize = 10;
  public isLoading = true;
  private pageCache = new Map<number, Piece[]>();
  private lastCacheKey = '';

  // --- Filter Presets ---
  presets: RepertoireFilter[] = [];
  selectedPresetId: number | null = null;
  isChoirAdmin = false;
  isAdmin = false;

  // --- Bulletproof @ViewChild Setters ---
  private _sort!: MatSort;
  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) {
      this._sort = sort;
      this.dataSource.sort = this._sort;
    }
  }

  private _paginator!: MatPaginator;
  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    if (paginator) {
      this._paginator = paginator;
      this._paginator.pageSize = this.pageSize;
      this.dataSource.paginator = this._paginator;
      this._paginator.page.subscribe(e => this.paginatorService.setPageSize('literature-list', e.pageSize));
    }
  }

  constructor(
    private apiService: ApiService,
    private pieceService: PieceService,
    private filterPresetService: FilterPresetService,
    private authService: AuthService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar, // Inject MatSnackBar for feedback
    private paginatorService: PaginatorService
  ) {
    this.pageSize = this.paginatorService.getPageSize('literature-list', this.pageSizeOptions[0]);
  }

  ngOnInit(): void {
    // Pre-fetch data for the filter dropdowns
    this.collections$ = this.apiService.getCollections();
    this.categories$ = this.apiService.getCategories();
    this.loadPresets();
    this.apiService.checkChoirAdminStatus().subscribe(s => this.isChoirAdmin = s.isChoirAdmin);
    this.authService.isAdmin$.subscribe(a => this.isAdmin = a);

    const saved = localStorage.getItem(this.FILTER_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.collectionId !== undefined) this.filterByCollectionId$.next(s.collectionId);
        if (s.categoryId !== undefined) this.filterByCategoryId$.next(s.categoryId);
        if (s.onlySingable !== undefined) this.onlySingable$.next(s.onlySingable);
        if (s.search !== undefined) this.searchControl.setValue(s.search, { emitEvent: false });
        if (s.collectionId || s.categoryId || s.onlySingable) this.filtersExpanded = true;
      } catch { }
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this._paginator;
    this.dataSource.sort = this._sort;

    const sort$ = this._sort.sortChange.pipe(tap(() => this._paginator.pageIndex = 0));
    const page$ = this._paginator.page.pipe(tap(e => this.paginatorService.setPageSize('literature-list', e.pageSize)));
    const search$ = this.searchControl.valueChanges.pipe(startWith(this.searchControl.value || ''));

    merge(this.refresh$, this.filterByCollectionId$, this.filterByCategoryId$, this.onlySingable$, sort$, page$, search$)
      .pipe(
        startWith({}),
        tap(() => {
          this.isLoading = true;
          const key = this.currentCacheKey();
          if (key !== this.lastCacheKey) {
            this.pageCache.clear();
            this.lastCacheKey = key;
          }
        }),
        switchMap(() => {
          const pageIndex = this._paginator.pageIndex;
          const cached = this.pageCache.get(pageIndex);
          if (cached) {
            return of({ data: cached, total: this.totalPieces });
          }
          return this.pieceService.getMyRepertoire(
            this.filterByCategoryId$.value ?? undefined,
            this.filterByCollectionId$.value ?? undefined,
            this._sort.active as any,
            pageIndex + 1,
            this._paginator.pageSize,
            this.onlySingable$.value ? 'CAN_BE_SUNG' : undefined,
            this._sort.direction.toUpperCase() as 'ASC' | 'DESC',
            this.searchControl.value || undefined
          ).pipe(
            catchError(() => {
              this.snackBar.open('Could not load repertoire.', 'Close', { duration: 5000 });
              return of({ data: [], total: 0 });
            })
          );
        }),
        map(res => {
          this.isLoading = false;
          this.totalPieces = res.total;
          if (res.total > 0 && !this.pageSizeOptions.includes(res.total)) {
            this.pageSizeOptions = [10, 25, 50, res.total];
          }
          this.pageCache.set(this._paginator.pageIndex, res.data);
          this.prefetchNextPage();
          return res.data;
        })
      ).subscribe(data => {
        this.dataSource.data = data;
      });
  }

  private currentCacheKey(): string {
    return [
      this.filterByCollectionId$.value,
      this.filterByCategoryId$.value,
      this.onlySingable$.value,
      this.searchControl.value,
      this._sort.active,
      this._sort.direction
    ].join('|');
  }

  private prefetchNextPage(): void {
    const nextIndex = this._paginator.pageIndex + 1;
    if (nextIndex * this._paginator.pageSize >= this.totalPieces) return;
    if (this.pageCache.has(nextIndex)) return;
    this.pieceService.getMyRepertoire(
      this.filterByCategoryId$.value ?? undefined,
      this.filterByCollectionId$.value ?? undefined,
      this._sort.active as any,
      nextIndex + 1,
      this._paginator.pageSize,
      this.onlySingable$.value ? 'CAN_BE_SUNG' : undefined,
      this._sort.direction.toUpperCase() as 'ASC' | 'DESC',
      this.searchControl.value || undefined
    ).subscribe(res => this.pageCache.set(nextIndex, res.data));
  }

  /**
   * Formats the collection reference for display in the template.
   */
  formatReferenceForDisplay(piece: Piece): string {
    if (piece.collections && piece.collections.length > 0) {
      const ref = piece.collections[0];
      const num = (ref as any).collection_piece.numberInCollection;
      return `${ref.prefix || ''}${num}`;
    }
    return '-';
  }

  /*
   * Former helper for building a sortable reference string. Currently unused
   * but kept for potential future sorting requirements.
   *
   * private formatReferenceForSort(piece: Piece): string {
   *   if (piece.collections && piece.collections.length > 0) {
   *     const ref = piece.collections[0];
   *     const num = (ref as any).collection_piece.numberInCollection;
   *     const numericPart = parseInt(num, 10);
   *     if (!isNaN(numericPart)) {
   *       return `${ref.prefix || ''}${numericPart.toString().padStart(5, '0')}`;
   *     }
   *     return `${ref.prefix || ''}${num}`;
   *   }
   *   return '';
   * }
   */

  /**
   * Handles changes from the collection filter dropdown.
   */
  onCollectionFilterChange(collectionId: number | null): void {
    if (this._paginator) {
      this._paginator.firstPage();
    }
    this.filterByCollectionId$.next(collectionId);
    this.saveFilters();
    this.refresh$.next();
  }

  onCategoryFilterChange(categoryId: number | null): void {
    if (this._paginator) {
      this._paginator.firstPage();
    }
    this.filterByCategoryId$.next(categoryId);
    this.saveFilters();
    this.refresh$.next();
  }

  onSingableToggle(checked: boolean): void {
    if (this._paginator) {
      this._paginator.firstPage();
    }
    this.onlySingable$.next(checked);
    this.saveFilters();
    this.refresh$.next();
  }

  clearFilters(): void {
    this.filterByCollectionId$.next(null);
    this.filterByCategoryId$.next(null);
    this.onlySingable$.next(false);
    this.searchControl.setValue('', { emitEvent: false });
    this.filtersExpanded = false;
    this.pageCache.clear();
    if (this._paginator) {
      this._paginator.firstPage();
    }
    localStorage.removeItem(this.FILTER_KEY);
    this.refresh$.next();
  }

  private saveFilters(): void {
    const state = {
      collectionId: this.filterByCollectionId$.value,
      categoryId: this.filterByCategoryId$.value,
      onlySingable: this.onlySingable$.value,
      search: this.searchControl.value
    };
    localStorage.setItem(this.FILTER_KEY, JSON.stringify(state));
    this.filtersExpanded = !!(state.collectionId || state.categoryId || state.onlySingable);
  }

  // =======================================================================
  // === MISSING FUNCTION 1: openAddPieceDialog ============================
  // =======================================================================
  /**
   * Opens the dialog to add a new piece.
   * Note: The dialog now handles creating a global piece and adding it to the
   * choir's repertoire in one go.
   */
  openAddPieceDialog(): void {
    const dialogRef = this.dialog.open(PieceDialogComponent, {
      width: '90vw',
      maxWidth: '800px',
      data: { pieceId: null }
    });

    dialogRef.afterClosed().subscribe(wasPieceAdded => {
      // The dialog should return 'true' if a piece was successfully created and added.
      if (wasPieceAdded) {
        this.snackBar.open('New piece added to repertoire!', 'OK', { duration: 3000 });
        // Trigger a refresh of the repertoire list to show the new piece.
        this.refresh$.next();
      }
    });
  }

  // =======================================================================
  // === MISSING FUNCTION 2: onStatusChange ================================
  // =======================================================================
  /**
   * Called when a user changes the status of a piece from the dropdown in the table.
   */
  onStatusChange(newStatus: string, pieceId: number): void {
    this.pieceService.updatePieceStatus(pieceId, newStatus).subscribe({
      next: () => {
        // Log to console for debugging, a snackbar is optional here as the change is visual.
        console.log(`Status for piece ${pieceId} updated to ${newStatus}`);
        this.snackBar.open('Status updated.', 'OK', { duration: 2000 });
      },
      error: (err) => {
        console.error('Failed to update status', err);
        this.snackBar.open('Error: Could not update status.', 'Close', { duration: 5000 });
        // Optional: you might want to refresh the list here to revert the visual change
        this.refresh$.next();
      }
    });
  }

  openEditPieceDialog(pieceId: number): void {
    const dialogRef = this.dialog.open(PieceDialogComponent, {
      width: '90vw',
      maxWidth: '800px',
      data: { pieceId: pieceId }
    });

    dialogRef.afterClosed().subscribe(wasUpdated => {
      if (wasUpdated) {
        this.snackBar.open('Piece updated successfully!', 'OK', { duration: 3000 });
        this.refresh$.next(); // Refresh the list to show changes
      }
    });
  }

  // ------- Filter Preset Helpers -------
  private loadPresets(): void {
    this.apiService.getRepertoireFilters().subscribe(p => this.presets = p);
  }

  onPresetSelect(id: number): void {
    this.selectedPresetId = id;
    const preset = this.presets.find(pr => pr.id === id);
    if (preset) {
      this.applyPreset(preset);
    }
  }

  private applyPreset(preset: RepertoireFilter): void {
    this.filterByCollectionId$.next(preset.data.collectionId ?? null);
    this.filterByCategoryId$.next(preset.data.categoryId ?? null);
    this.onlySingable$.next(!!preset.data.onlySingable);
    this.searchControl.setValue(preset.data.search || '', { emitEvent: false });
    this.filtersExpanded = !!(preset.data.collectionId || preset.data.categoryId || preset.data.onlySingable);
    if (this._paginator) {
      this._paginator.firstPage();
    }
    this.refresh$.next();
  }

  saveCurrentPreset(): void {
    const dialogRef = this.dialog.open<FilterPresetDialogComponent, FilterPresetDialogData, {name: string; visibility: 'personal' | 'local' | 'global'} | undefined>(FilterPresetDialogComponent, {
      width: '400px',
      data: { isAdmin: this.isAdmin, isChoirAdmin: this.isChoirAdmin }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      const data = {
        collectionId: this.filterByCollectionId$.value,
        categoryId: this.filterByCategoryId$.value,
        onlySingable: this.onlySingable$.value,
        search: this.searchControl.value
      };
      this.apiService.saveRepertoireFilter({ name: result.name, data, visibility: result.visibility }).subscribe(() => this.loadPresets());
    });
  }

  canDeleteSelectedPreset(): boolean {
    const preset = this.presets.find(p => p.id === this.selectedPresetId);
    if (!preset) return false;
    if (preset.visibility === 'personal') return true;
    if (preset.visibility === 'local') return this.isChoirAdmin || this.isAdmin;
    if (preset.visibility === 'global') return this.isAdmin;
    return false;
  }

  deleteSelectedPreset(): void {
    const preset = this.presets.find(p => p.id === this.selectedPresetId);
    if (!preset) return;
    if (!this.canDeleteSelectedPreset()) return;
    if (confirm('Diesen Filter löschen?')) {
      this.apiService.deleteRepertoireFilter(preset.id).subscribe(() => {
        this.selectedPresetId = null;
        this.loadPresets();
      });
    }
  }
}
