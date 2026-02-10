import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { PaginatorService } from '@core/services/paginator.service';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, BehaviorSubject, merge, of } from 'rxjs';
import { switchMap, map, startWith, catchError, tap, take, takeUntil } from 'rxjs/operators';
import { BaseComponent } from '@shared/components/base.component';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { ApiHelperService } from '@core/services/api-helper.service';
import { NotificationService } from '@core/services/notification.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { PieceService } from 'src/app/core/services/piece.service';
import { Piece } from 'src/app/core/models/piece';
import { Collection } from 'src/app/core/models/collection';
import { Category } from 'src/app/core/models/category';
import { Composer } from 'src/app/core/models/composer';
import { PieceDialogComponent } from '../piece-dialog/piece-dialog.component';
import { RepertoireFilter } from '@core/models/repertoire-filter';
import { FilterPresetService } from '@core/services/filter-preset.service';
import { AuthService } from '@core/services/auth.service';
import { FilterPresetDialogComponent, FilterPresetDialogData } from '../filter-preset-dialog/filter-preset-dialog.component';
import { ErrorService } from '@core/services/error.service';
import { UserPreferencesService } from '@core/services/user-preferences.service';
import { UserPreferences } from '@core/models/user-preferences';
import { Router, RouterModule } from '@angular/router';
import { PieceStatusLabelPipe } from '@shared/pipes/piece-status-label.pipe';
import { ImageCacheService } from '@core/services/image-cache.service';
import { ReferencePipe } from '@shared/pipes/reference.pipe';

@Component({
  selector: 'app-literature-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, RouterModule, PieceStatusLabelPipe, ReferencePipe],
  templateUrl: './literature-list.component.html',
  styleUrls: ['./literature-list.component.scss']
})
export class LiteratureListComponent extends BaseComponent implements OnInit, AfterViewInit {
  // --- Reactive Subjects for triggering updates ---
  private refresh$ = new BehaviorSubject<void>(undefined);
  public filterByComposerIds$ = new BehaviorSubject<number[]>([]);
  public filterByCollectionIds$ = new BehaviorSubject<number[]>([]);
  public filterByCategoryIds$ = new BehaviorSubject<number[]>([]);
  public filterByLicense$ = new BehaviorSubject<string[]>([]);
  public status$ = new BehaviorSubject<('CAN_BE_SUNG' | 'IN_REHEARSAL' | 'NOT_READY')[]>([]);
  public searchControl = new FormControl('');
  public filtersExpanded = false;
  private readonly FILTER_KEY = 'repertoireFilters';

  // --- Observables for filter display ---
  public collections$!: Observable<Collection[]>;
  public composers$!: Observable<Composer[]>;
  public categories$!: Observable<Category[]>;
  public licenseOptions = [
    { type: 'CC0', label: 'CC0' },
    { type: 'CC-BY', label: 'CC BY' },
    { type: 'CC-BY-SA', label: 'CC BY-SA' },
    { type: 'CC-BY-NC', label: 'CC BY-NC' },
    { type: 'CC-BY-ND', label: 'CC BY-ND' }
  ];
  public licenseHintMap: Record<string, string> = {
    'CC0': 'Keine Rechte vorbehalten',
    'CC-BY': 'Namensnennung erforderlich',
    'CC-BY-SA': 'Weitergabe unter gleichen Bedingungen',
    'CC-BY-NC': 'Keine kommerzielle Nutzung',
    'CC-BY-ND': 'Keine Bearbeitungen'
  };

  // --- Table, Paginator, and Sort Logic ---
  public displayedColumns: string[] = [];
  public showLastSung = false;
  public showLastRehearsed = false;
  public showTimesSung = false;
  public showTimesRehearsed = false;
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
  isDirector = false;

  // --- Hover Image Preview ---
  hoverImage: string | null = null;
  hoverX = 0;
  hoverY = 0;
  private hoverTimeout: any;

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
      this._paginator.page.pipe(
        takeUntil(this.destroy$)
      ).subscribe(e => this.paginatorService.setPageSize('literature-list', e.pageSize));
    }
  }

  constructor(
    private apiService: ApiService,
    private pieceService: PieceService,
    private filterPresetService: FilterPresetService,
    private authService: AuthService,
    public dialog: MatDialog,
    private apiHelper: ApiHelperService,
    private notification: NotificationService,
    private dialogHelper: DialogHelperService,
    private paginatorService: PaginatorService,
    private errorService: ErrorService,
    private prefs: UserPreferencesService,
    private router: Router,
    private imageCacheService: ImageCacheService
  ) {
    super(); // Call BaseComponent constructor
    this.pageSize = this.paginatorService.getPageSize('literature-list', this.pageSizeOptions[0]);
  }

  ngOnInit(): void {
    this.updateDisplayedColumns();
    // Pre-fetch data for the filter dropdowns - only collections present in the choir
    this.collections$ = this.apiService.getChoirCollections();
    this.composers$ = this.apiService.getComposers();
    this.categories$ = this.filterByCollectionIds$.pipe(
      startWith(this.filterByCollectionIds$.value),
      switchMap(ids => this.apiService.getCategories(ids.length ? ids : undefined))
    );
    this.loadPresets();

    // Subscribe with automatic cleanup on component destroy
    this.authService.isChoirAdmin$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isChoirAdmin => this.isChoirAdmin = isChoirAdmin);

    this.authService.isAdmin$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(a => this.isAdmin = a);

    this.authService.isDirector$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isDirector => this.isDirector = isDirector);

    const saved = localStorage.getItem(this.FILTER_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (Array.isArray(s.composerIds)) {
          this.filterByComposerIds$.next(s.composerIds);
        } else if (s.composerId !== undefined && s.composerId !== null) {
          this.filterByComposerIds$.next([s.composerId]);
        }
        if (Array.isArray(s.collectionIds)) {
          this.filterByCollectionIds$.next(s.collectionIds);
        } else if (s.collectionId !== undefined && s.collectionId !== null) {
          this.filterByCollectionIds$.next([s.collectionId]);
        }
        if (s.categoryIds !== undefined) {
          this.filterByCategoryIds$.next(s.categoryIds);
        } else if ((s as any).categoryId !== undefined && (s as any).categoryId !== null) {
          this.filterByCategoryIds$.next([(s as any).categoryId]);
        }
        if (Array.isArray(s.statuses)) {
          this.status$.next(s.statuses);
        } else if (s.status !== undefined && s.status !== null) {
          this.status$.next([s.status]);
        }
        if (s.licenses !== undefined) {
          this.filterByLicense$.next(s.licenses);
        }
        if (s.search !== undefined) this.searchControl.setValue(s.search, { emitEvent: false });
        if (
          (s.composerIds && s.composerIds.length) ||
          s.composerId ||
          (s.collectionIds && s.collectionIds.length) ||
          s.collectionId ||
          (s.categoryIds && s.categoryIds.length) ||
          (s as any).categoryId ||
          (Array.isArray(s.statuses) && s.statuses.length) ||
          s.status ||
          (s.licenses && s.licenses.length)
        ) {
          this.filtersExpanded = true;
        }
      } catch {
        this.filtersExpanded = false;
      }
    }

    const load$: Observable<UserPreferences | null> =
      this.prefs.isLoaded() ? of(null) : this.prefs.load();
    load$.pipe(take(1)).subscribe(() => {
      const cols = this.prefs.getPreference('repertoireColumns') || {};
      this.showLastSung = !!cols.lastSung;
      this.showLastRehearsed = !!cols.lastRehearsed;
      this.showTimesSung = !!cols.timesSung;
      this.showTimesRehearsed = !!cols.timesRehearsed;
      this.updateDisplayedColumns();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this._sort;

    const sort$ = this._sort.sortChange.pipe(tap(() => this._paginator.pageIndex = 0));
    const page$ = this._paginator.page.pipe(tap(e => this.paginatorService.setPageSize('literature-list', e.pageSize)));
    const search$ = this.searchControl.valueChanges.pipe(startWith(this.searchControl.value || ''));

    merge(this.refresh$, this.filterByComposerIds$, this.filterByCollectionIds$, this.filterByCategoryIds$, this.status$, this.filterByLicense$, sort$, page$, search$)
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
          const dir = this._sort.direction ? this._sort.direction.toUpperCase() as 'ASC' | 'DESC' : 'ASC';
          const statuses = this.status$.value.length
            ? this.status$.value
            : undefined;
          return this.pieceService.getMyRepertoire(
            this.filterByCategoryIds$.value,
            this.filterByCollectionIds$.value,
            this._sort.active as any,
            pageIndex + 1,
            this._paginator.pageSize,
            statuses,
            dir,
            this.searchControl.value || undefined,
            this.filterByLicense$.value.length ? this.filterByLicense$.value : undefined,
            this.filterByComposerIds$.value.length ? this.filterByComposerIds$.value : undefined
          ).pipe(
            catchError((err) => {
              const msg = err.error?.message || 'Could not load repertoire.';
              console.error('Failed to load repertoire list', err);
              this.errorService.setError({
                message: msg,
                status: err.status,
                details: err.error?.details,
                stack: err.stack,
                url: this.router.url
              });
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
        }),
        takeUntil(this.destroy$)
      ).subscribe(data => {
        this.dataSource.data = data;
      });
  }

  private currentCacheKey(): string {
    return [
      this.filterByComposerIds$.value.join(','),
      this.filterByCollectionIds$.value.join(','),
      this.filterByCategoryIds$.value.join(','),
      this.status$.value.join(','),
      this.filterByLicense$.value.join(','),
      this.searchControl.value,
      this._sort.active,
      this._sort.direction
    ].join('|');
  }

  private prefetchNextPage(): void {
    const nextIndex = this._paginator.pageIndex + 1;
    if (nextIndex * this._paginator.pageSize >= this.totalPieces) return;
    if (this.pageCache.has(nextIndex)) return;
    const dir = this._sort.direction ? this._sort.direction.toUpperCase() as 'ASC' | 'DESC' : 'ASC';
    const statuses = this.status$.value.length
      ? this.status$.value
      : undefined;
    this.pieceService.getMyRepertoire(
      this.filterByCategoryIds$.value,
      this.filterByCollectionIds$.value,
      this._sort.active as any,
      nextIndex + 1,
      this._paginator.pageSize,
      statuses,
      dir,
      this.searchControl.value || undefined,
      undefined,
      this.filterByComposerIds$.value.length ? this.filterByComposerIds$.value : undefined
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(res => this.pageCache.set(nextIndex, res.data));
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
  onCollectionFilterChange(collectionIds: number[]): void {
    if (this._paginator) {
      this._paginator.firstPage();
    }
    this.filterByCollectionIds$.next(collectionIds);
    this.saveFilters();
    this.refresh$.next();
  }

  onComposerFilterChange(composerIds: number[]): void {
    if (this._paginator) {
      this._paginator.firstPage();
    }
    this.filterByComposerIds$.next(composerIds);
    this.saveFilters();
    this.refresh$.next();
  }

  onCategoryFilterChange(categoryIds: number[]): void {
    if (this._paginator) {
      this._paginator.firstPage();
    }
    this.filterByCategoryIds$.next(categoryIds);
    this.saveFilters();
    this.refresh$.next();
  }


  onStatusFilterChange(statuses: ('CAN_BE_SUNG' | 'IN_REHEARSAL' | 'NOT_READY')[]): void {
    if (this._paginator) {
      this._paginator.firstPage();
    }
    this.status$.next(statuses);
    this.saveFilters();
    this.refresh$.next();
  }

  onLicenseFilterChange(licenses: string[]): void {
    if (this._paginator) {
      this._paginator.firstPage();
    }
    this.filterByLicense$.next(licenses);
    this.saveFilters();
    this.refresh$.next();
  }

  clearFilters(): void {
    this.filterByComposerIds$.next([]);
    this.filterByCollectionIds$.next([]);
    this.filterByCategoryIds$.next([]);
    this.status$.next([]);
    this.filterByLicense$.next([]);
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
      composerIds: this.filterByComposerIds$.value,
      collectionIds: this.filterByCollectionIds$.value,
      categoryIds: this.filterByCategoryIds$.value,
      statuses: this.status$.value,
      search: this.searchControl.value,
      licenses: this.filterByLicense$.value
    };
    localStorage.setItem(this.FILTER_KEY, JSON.stringify(state));
    this.filtersExpanded = !!(
      (state.composerIds && state.composerIds.length) ||
      (state.collectionIds && state.collectionIds.length) ||
      (state.categoryIds && state.categoryIds.length) ||
      (state.statuses && state.statuses.length) ||
      (state.licenses && state.licenses.length)
    );
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
    this.dialogHelper.openDialog<PieceDialogComponent, boolean>(
      PieceDialogComponent,
      {
        width: '90vw',
        maxWidth: '1000px',
        data: { pieceId: null }
      }
    ).subscribe(wasPieceAdded => {
      if (wasPieceAdded) {
        this.notification.success('New piece added to repertoire!');
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
    this.apiHelper.handleApiCall(
      this.pieceService.updatePieceStatus(pieceId, newStatus),
      {
        successMessage: 'Status updated.',
        successDuration: 2000,
        onSuccess: () => {
          // Update the currently displayed data so the change is visible without reload
          const data = [...this.dataSource.data];
          const idx = data.findIndex(p => p.id === pieceId);
          if (idx !== -1) {
            const piece = { ...data[idx] };
            piece.choir_repertoire = piece.choir_repertoire || { status: 'CAN_BE_SUNG' };
            piece.choir_repertoire.status = newStatus as any;
            data[idx] = piece;
            this.dataSource.data = data;
          }

          // Keep cached pages in sync
          this.pageCache.forEach((arr, key) => {
            const i = arr.findIndex(p => p.id === pieceId);
            if (i !== -1) {
              const pc = [...arr];
              const p = { ...pc[i] };
              p.choir_repertoire = p.choir_repertoire || { status: 'CAN_BE_SUNG' };
              p.choir_repertoire.status = newStatus as any;
              pc[i] = p;
              this.pageCache.set(key, pc);
            }
          });
        },
        onError: (err) => {
          const msg = err.error?.message || 'Could not update status.';
          this.errorService.setError({
            message: msg,
            status: err.status,
            stack: err.stack,
            url: this.router.url
          });
          // Revert changes by triggering a refresh
          this.refresh$.next();
        },
        errorMessage: 'Fehler: Status konnte nicht aktualisiert werden.'
      }
    ).subscribe();
  }

  onRatingChange(newRating: number | null, pieceId: number): void {
    // Silent update - no notification needed for rating changes
    this.apiHelper.handleApiCall(
      this.pieceService.updatePieceRating(pieceId, newRating),
      {
        silent: true,
        onSuccess: () => {
          const data = [...this.dataSource.data];
          const idx = data.findIndex(p => p.id === pieceId);
          if (idx !== -1) {
            const piece = { ...data[idx] };
            const rep = piece.choir_repertoire ?? ({ status: 'CAN_BE_SUNG' } as any);
            rep.rating = newRating ?? null;
            piece.choir_repertoire = rep;
            data[idx] = piece;
            this.dataSource.data = data;
          }
        }
      }
    ).subscribe();
  }

  get canRate(): boolean {
    return this.isDirector || this.isChoirAdmin || this.isAdmin;
  }

  openEditPieceDialog(pieceId: number): void {
    this.dialogHelper.openDialog<PieceDialogComponent, boolean>(
      PieceDialogComponent,
      {
        width: '90vw',
        maxWidth: '1000px',
        data: { pieceId: pieceId }
      }
    ).subscribe(wasUpdated => {
      if (wasUpdated) {
        this.notification.success('Piece updated successfully!');
        this.refresh$.next();
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
    if (Array.isArray((preset.data as any).composerIds)) {
      this.filterByComposerIds$.next((preset.data as any).composerIds);
    } else if ((preset.data as any).composerId !== undefined && (preset.data as any).composerId !== null) {
      this.filterByComposerIds$.next([(preset.data as any).composerId]);
    } else {
      this.filterByComposerIds$.next([]);
    }
    if (Array.isArray(preset.data.collectionIds)) {
      this.filterByCollectionIds$.next(preset.data.collectionIds);
    } else if (preset.data.collectionId !== undefined && preset.data.collectionId !== null) {
      this.filterByCollectionIds$.next([preset.data.collectionId]);
    } else {
      this.filterByCollectionIds$.next([]);
    }
    if (preset.data.categoryIds !== undefined) {
      this.filterByCategoryIds$.next(preset.data.categoryIds);
    } else {
      const singleId = (preset.data as any).categoryId;
      if (singleId !== undefined && singleId !== null) {
        this.filterByCategoryIds$.next([singleId]);
      }
    }
    if (Array.isArray(preset.data.statuses)) {
      this.status$.next(preset.data.statuses);
    } else if (preset.data.status !== undefined && preset.data.status !== null) {
      this.status$.next([preset.data.status]);
    }
    if (Array.isArray((preset.data as any).licenses)) {
      this.filterByLicense$.next((preset.data as any).licenses);
    } else {
      this.filterByLicense$.next([]);
    }
    this.searchControl.setValue(preset.data.search || '', { emitEvent: false });
    const singleId = (preset.data as any).categoryId;
    this.filtersExpanded = !!(
      ((preset.data as any).composerIds && (preset.data as any).composerIds.length) ||
      (preset.data as any).composerId ||
      (preset.data.collectionIds && preset.data.collectionIds.length) ||
      preset.data.collectionId ||
      (preset.data.categoryIds && preset.data.categoryIds.length) ||
      singleId ||
      (Array.isArray(preset.data.statuses) && preset.data.statuses.length) ||
      preset.data.status ||
      ((preset.data as any).licenses && (preset.data as any).licenses.length)
    );
    if (this._paginator) {
      this._paginator.firstPage();
    }
    this.refresh$.next();
  }

  saveCurrentPreset(): void {
    this.dialogHelper.openDialog<FilterPresetDialogComponent, {name: string; visibility: 'personal' | 'local' | 'global'} | undefined>(
      FilterPresetDialogComponent,
      {
        width: '400px',
        data: { isAdmin: this.isAdmin, isChoirAdmin: this.isChoirAdmin }
      }
    ).subscribe(result => {
      if (!result) return;
      const data = {
        composerIds: this.filterByComposerIds$.value,
        collectionIds: this.filterByCollectionIds$.value,
        categoryIds: this.filterByCategoryIds$.value,
        statuses: this.status$.value,
        search: this.searchControl.value,
        licenses: this.filterByLicense$.value
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

  reloadList(): void {
    this.pageCache.clear();
    this.refresh$.next();
  }

  // ------- Hover Image Helpers -------
  onRowMouseEnter(event: MouseEvent, piece: Piece): void {
    if (!piece.imageIdentifier) {
      return;
    }
    this.hoverX = event.clientX;
    this.hoverY = event.clientY;
    this.hoverTimeout = setTimeout(() => {
      this.imageCacheService.getImage('piece', piece.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(img => {
          this.hoverImage = img;
        });
    }, 2000);
  }

  onRowMouseMove(event: MouseEvent): void {
    this.hoverX = event.clientX;
    this.hoverY = event.clientY;
  }

  onRowMouseLeave(): void {
    clearTimeout(this.hoverTimeout);
    this.hoverImage = null;
  }

  private updateDisplayedColumns(): void {
    this.displayedColumns = ['title', 'composer', 'category', 'reference'];
    if (this.showLastSung) this.displayedColumns.push('lastSung');
    if (this.showLastRehearsed) this.displayedColumns.push('lastRehearsed');
    if (this.showTimesSung) this.displayedColumns.push('timesSung');
    if (this.showTimesRehearsed) this.displayedColumns.push('timesRehearsed');
    this.displayedColumns.push('rating', 'status', 'actions');
  }

  toggleColumn(col: 'lastSung' | 'lastRehearsed' | 'timesSung' | 'timesRehearsed'): void {
    switch (col) {
      case 'lastSung':
        this.showLastSung = !this.showLastSung;
        break;
      case 'lastRehearsed':
        this.showLastRehearsed = !this.showLastRehearsed;
        break;
      case 'timesSung':
        this.showTimesSung = !this.showTimesSung;
        break;
      case 'timesRehearsed':
        this.showTimesRehearsed = !this.showTimesRehearsed;
        break;
    }
    this.saveColumnPrefs();
    this.updateDisplayedColumns();
  }

  private saveColumnPrefs(): void {
    const prefs = {
      lastSung: this.showLastSung,
      lastRehearsed: this.showLastRehearsed,
      timesSung: this.showTimesSung,
      timesRehearsed: this.showTimesRehearsed
    };
    this.prefs.update({ repertoireColumns: prefs }).subscribe();
  }
}
