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
import { Router, RouterModule } from '@angular/router';
import { LibraryItemDialogComponent } from './library-item-dialog.component';
import { LoanCartService } from '@core/services/loan-cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';

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
  expandedItem: LibraryItem | null = null;
  expandedPieces: Piece[] = [];
  piecePageSize = 10;
  piecePageIndex = 0;

  constructor(private api: ApiService, private auth: AuthService, private dialog: MatDialog, private router: Router, private cart: LoanCartService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
    this.collections$ = this.api.getCollections();
    this.auth.isAdmin$.subscribe(a => this.isAdmin = a);
  }

  load(): void {
    this.items$ = this.api.getLibraryItems();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.api.importLibraryCsv(file).subscribe(() => this.load());
    }
  }

  openAddDialog(): void {
    const ref = this.dialog.open(LibraryItemDialogComponent, { data: { collections$: this.collections$ } });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.addLibraryItem(result).subscribe(() => this.load());
      }
    });
  }

  toggleCollection(item: LibraryItem): void {
    const colId = item.collection?.id;
    if (!colId) return;

    if (this.expandedItem === item) {
      this.expandedItem = null;
      return;
    }

    this.api.getCollectionById(colId).subscribe(col => {
      if ((col.singleEdition || (col.pieces && col.pieces.length === 1)) && col.pieces && col.pieces.length === 1) {
        this.router.navigate(['/pieces', col.pieces[0].id]);
      } else {
        this.expandedItem = item;
        this.expandedPieces = col.pieces || [];
        this.piecePageIndex = 0;
      }
    });
  }

  onPiecePage(event: PageEvent): void {
    this.piecePageIndex = event.pageIndex;
    this.piecePageSize = event.pageSize;
  }

  get paginatedPieces(): Piece[] {
    const start = this.piecePageIndex * this.piecePageSize;
    return this.expandedPieces.slice(start, start + this.piecePageSize);
  }

  addToCart(item: LibraryItem, event: Event): void {
    event.stopPropagation();
    this.cart.addItem(item);
    this.snack.open('Zur Anfrage hinzugefügt', undefined, { duration: 2000 });
  }
}
