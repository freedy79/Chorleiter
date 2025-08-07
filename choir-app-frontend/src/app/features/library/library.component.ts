import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { LibraryItem } from '@core/models/library-item';
import { Collection } from '@core/models/collection';
import { Piece } from '@core/models/piece';
import { Observable } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { LibraryItemDialogComponent } from './library-item-dialog.component';
import { LoanCartService } from '@core/services/loan-cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { FileUploadService } from '@core/services/file-upload.service';
import { LibraryUtilService } from '@core/services/library-util.service';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {
  items$!: Observable<LibraryItem[]>;
  collections$!: Observable<Collection[]>;
  isAdmin = false;
  displayedColumns: string[] = ['title', 'copies', 'status', 'availableAt', 'actions'];

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
  }

  load(): void {
    this.items$ = this.apiService.getLibraryItems();
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
}
