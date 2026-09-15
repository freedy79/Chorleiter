import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { NotificationService } from '@core/services/notification.service';
import { LibraryItem } from '@core/models/library-item';
import { Collection } from '@core/models/collection';
import { Piece } from '@core/models/piece';
import { Observable, forkJoin } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { RouterModule } from '@angular/router';
import { LibraryItemDialogComponent } from './library-item-dialog.component';
import { LibraryStatusDialogComponent } from './library-status-dialog.component';
import { LoanCartService } from '@core/services/loan-cart.service';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FileUploadService } from '@core/services/file-upload.service';
import { LibraryUtilService } from '@core/services/library-util.service';
import { map, takeUntil } from 'rxjs/operators';
import { LoanListComponent } from './loan-list.component';
import { BaseListComponent } from '@shared/components/base-list.component';
import { PaginatorService } from '@core/services/paginator.service';
import { TextInputDialogComponent } from '@shared/components/text-input-dialog/text-input-dialog.component';
import { DataStateComponent } from '@shared/components/data-state/data-state.component';


@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule, LoanListComponent, DataStateComponent],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent extends BaseListComponent<LibraryItem> {
  @ViewChild(MatSort) override sort?: MatSort = undefined;
  @ViewChild('libraryPaginator') override paginator?: MatPaginator = undefined;

  collections$!: Observable<Collection[]>;
  isAdmin = false;
  isLibrarian = false;
  isSingerOnly = false;
  hasLoadError = false;
  loadErrorMessage = 'Die Bibliothekseinträge konnten nicht geladen werden.';
  displayedColumns: string[] = ['cover', 'title', 'copies', 'actions'];

  constructor(
    paginatorService: PaginatorService,
    private apiService: ApiService,
    private auth: AuthService,
    private dialogHelper: DialogHelperService,
    private cart: LoanCartService,
    private fileUpload: FileUploadService,
    public libraryUtil: LibraryUtilService,
    private notification: NotificationService
  ) {
    super(paginatorService);
  }

  get paginatorKey(): string {
    return 'library';
  }

  get isFilterActive(): boolean {
    return false;
  }

  get emptyStateTitle(): string {
    return 'Keine Bibliothekseinträge vorhanden';
  }

  get emptyStateMessage(): string {
    return 'Fügen Sie den ersten Bibliothekseintrag hinzu, um zu starten.';
  }

  loadData(): Observable<LibraryItem[]> {
    this.hasLoadError = false;
    return this.apiService.getLibraryItems();
  }

  protected override handleLoadError(): void {
    this.hasLoadError = true;
  }

  protected override onDataLoaded(items: LibraryItem[]): void {
    // Load cover images for collections that have them
    const coverRequests = items
      .filter(i => i.collection?.coverImage)
      .map(i =>
        this.apiService
          .getCollectionCover(i.collection!.id)
          .pipe(map(data => ({ id: i.collection!.id, data })))
      );

    if (coverRequests.length) {
      forkJoin(coverRequests).subscribe(results => {
        results.forEach(res => {
          items
            .filter(i => i.collection?.id === res.id)
            .forEach(i => {
              if (i.collection) {
                i.collection.coverImageData = res.data;
              }
            });
        });
        this.dataSource.data = [...items]; // Trigger change detection
      });
    }
  }

  protected override initDataSource(): void {
    super.initDataSource();

    // Custom sorting accessor for library items
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'title':
          return item.collection?.title.toLowerCase() || '';
        default:
          return (item as any)[property];
      }
    };
  }

  override ngOnInit(): void {
    this.collections$ = this.apiService.getCollections();
    this.auth.isAdmin$.subscribe(a => this.isAdmin = a);
    this.auth.isLibrarian$.subscribe(l => this.isLibrarian = l);
    this.auth.isSingerOnly$.subscribe(isSingerOnly => this.isSingerOnly = isSingerOnly);

    // Call parent ngOnInit to trigger data loading
    super.ngOnInit();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.fileUpload.importLibraryCsv(file).subscribe(() => this.refresh());
    }
  }

  openAddDialog(): void {
    this.dialogHelper.openDialogWithApi<
      LibraryItemDialogComponent,
      { collectionId: number; copies: number; isBorrowed?: boolean },
      LibraryItem
    >(
      LibraryItemDialogComponent,
      (result) => this.apiService.addLibraryItem(result),
      {
        dialogConfig: { data: { collections$: this.collections$ } },
        apiConfig: {
          silent: true,
          onSuccess: () => this.refresh()
        }
      }
    ).subscribe();
  }

  get expandedItem(): LibraryItem | null {
    return this.libraryUtil.expandedItem;
  }

  get expandedPieces(): Piece[] {
    return this.libraryUtil.expandedPieces;
  }

  get piecePageSize(): number {
    return this.libraryUtil.piecePageSize;
  }

  toggleCollection(item: LibraryItem): void {
    this.libraryUtil.toggleCollection(item);
  }

  onPiecePage(event: PageEvent): void {
    this.libraryUtil.onPiecePage(event);
  }

  get paginatedPieces(): Piece[] {
    return this.libraryUtil.paginatedPieces;
  }

  getCollectionHint(collection?: Collection): string {
    return this.libraryUtil.getCollectionHint(collection);
  }

  public getCollectionComposer(collection?: Collection): string {
    return this.libraryUtil.getCollectionComposer(collection);
  }

  addToCart(item: LibraryItem, event: Event): void {
    event.stopPropagation();
    this.cart.addItem(item);
    this.notification.success('Zur Anfrage hinzugefügt', 2000);
  }

  editCopies(item: LibraryItem, event: Event): void {
    event.stopPropagation();
    this.dialogHelper.openDialog<TextInputDialogComponent, string | undefined>(
      TextInputDialogComponent,
      {
        data: {
          title: 'Anzahl Exemplare ändern',
          message: 'Geben Sie die neue Anzahl der Exemplare ein:',
          label: 'Anzahl Exemplare',
          placeholder: item.copies.toString(),
          initialValue: item.copies.toString(),
          maxLength: 4
        }
      }
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result !== undefined) {
        const copies = Number(result);
        if (!isNaN(copies) && copies > 0) {
          this.apiService.updateLibraryItem(item.id, { copies }).pipe(
            takeUntil(this.destroy$)
          ).subscribe(() => this.refresh());
        }
      }
    });
  }

  changeStatus(item: LibraryItem, event: Event): void {
    event.stopPropagation();
    this.dialogHelper.openDialogWithApi<
      LibraryStatusDialogComponent,
      Partial<LibraryItem>
    >(
      LibraryStatusDialogComponent,
      (result) => this.apiService.updateLibraryItem(item.id, result),
      {
        dialogConfig: { data: { item } },
        apiConfig: {
          silent: true,
          onSuccess: () => this.refresh()
        }
      }
    ).subscribe();
  }

  deleteItem(item: LibraryItem, event: Event): void {
    event.stopPropagation();
    this.dialogHelper.confirmDelete(
      { itemName: 'diesen Eintrag' },
      () => this.apiService.deleteLibraryItem(item.id),
      {
        silent: true,
        onSuccess: () => this.refresh()
      }
    ).subscribe();
  }
}
