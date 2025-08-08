import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { LibraryItem } from '@core/models/library-item';
import { Collection } from '@core/models/collection';
import { Piece } from '@core/models/piece';
import { Observable, forkJoin } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { LibraryItemDialogComponent } from './library-item-dialog.component';
import { LoanCartService } from '@core/services/loan-cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FileUploadService } from '@core/services/file-upload.service';
import { LibraryUtilService } from '@core/services/library-util.service';
import { map } from 'rxjs/operators';
import { LoanStatusLabelPipe } from '@shared/pipes/loan-status-label.pipe';


@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule, LoanStatusLabelPipe],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('libraryPaginator') paginator!: MatPaginator;

  collections$!: Observable<Collection[]>;
  isAdmin = false;
  isLibrarian = false;
  displayedColumns: string[] = ['cover', 'title', 'copies', 'status', 'availableAt', 'actions'];

  dataSource = new MatTableDataSource<LibraryItem>();
  expandedItem: LibraryItem | null = null;
  expandedPieces: Piece[] = [];
  piecePageSize = 10;
  piecePageIndex = 0;
  private composerCache = new Map<number, string>();


  constructor(
    private apiService: ApiService,
    private auth: AuthService,
    private dialog: MatDialog,
    private cart: LoanCartService,
    private snack: MatSnackBar,
    private fileUpload: FileUploadService,
    public libraryUtil: LibraryUtilService
  ) {}

  ngOnInit(): void {
    this.load();
    this.collections$ = this.apiService.getCollections();
    this.auth.isAdmin$.subscribe(a => this.isAdmin = a);
    this.auth.isLibrarian$.subscribe(l => this.isLibrarian = l);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'title':
          return item.collection?.title.toLowerCase() || '';
        case 'availableAt':
          return item.availableAt ? new Date(item.availableAt).getTime() : 0;
        default:
          return (item as any)[property];
      }
    };
  }

  load(): void {
    this.apiService.getLibraryItems().subscribe(items => {
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
          this.dataSource.data = items;
        });
      } else {
        this.dataSource.data = items;
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.fileUpload.importLibraryCsv(file).subscribe(() => this.load());
    }
  }

  openAddDialog(): void {
    const ref = this.dialog.open(LibraryItemDialogComponent, { data: { collections$: this.collections$ } });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.addLibraryItem(result).subscribe(() => this.load());
      }
    });
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
    this.snack.open('Zur Anfrage hinzugefügt', undefined, { duration: 2000 });
  }

  editCopies(item: LibraryItem, event: Event): void {
    event.stopPropagation();
    const input = prompt('Neue Anzahl Exemplare:', item.copies.toString());
    if (input !== null) {
      const copies = Number(input);
      if (!isNaN(copies) && copies > 0) {
        this.apiService.updateLibraryItem(item.id, { copies }).subscribe(() => this.load());
      }
    }
  }

  changeStatus(item: LibraryItem, event: Event): void {
    event.stopPropagation();
    const newStatus = item.status === 'available' ? 'borrowed' : 'available';
    this.apiService.updateLibraryItem(item.id, { status: newStatus }).subscribe(() => this.load());
  }

  deleteItem(item: LibraryItem, event: Event): void {
    event.stopPropagation();
    if (confirm('Diesen Eintrag wirklich löschen?')) {
      this.apiService.deleteLibraryItem(item.id).subscribe(() => this.load());
    }
  }
}
