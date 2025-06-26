import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, BehaviorSubject, merge, of } from 'rxjs';
import { switchMap, map, startWith, catchError, tap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { Piece } from 'src/app/core/models/piece';
import { Collection } from 'src/app/core/models/collection';
import { PieceDialogComponent } from '../piece-dialog/piece-dialog.component';

@Component({
  selector: 'app-literature-list',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './literature-list.component.html',
  styleUrls: ['./literature-list.component.scss']
})
export class LiteratureListComponent implements OnInit, AfterViewInit {
  // --- Reactive Subjects for triggering updates ---
  private refresh$ = new BehaviorSubject<void>(undefined);
  public filterByCollectionId$ = new BehaviorSubject<number | null>(null);

  // --- Observables for filter display ---
  public collections$!: Observable<Collection[]>;

  // --- Table, Paginator, and Sort Logic ---
  public displayedColumns: string[] = ['title', 'composer', 'category', 'reference', 'status', 'actions'];
  public dataSource = new MatTableDataSource<Piece>();
  public totalPieces = 0;
  public pageSizeOptions: number[] = [10, 25, 50];
  public isLoading = true;

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
      this.dataSource.paginator = this._paginator;
    }
  }

  constructor(
    private apiService: ApiService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar // Inject MatSnackBar for feedback
  ) {}

  ngOnInit(): void {
    // Pre-fetch data for the filter dropdowns
    this.collections$ = this.apiService.getCollections();
  }

  ngAfterViewInit(): void {
    // Set the paginator and sort on the datasource AFTER the view has been initialized.
    this.dataSource.paginator = this._paginator;
    this.dataSource.sort = this._sort;

    // --- Custom Sorting Logic ---
    this.dataSource.sortingDataAccessor = (item: Piece, property) => {
      switch (property) {
        case 'reference': return this.formatReferenceForSort(item);
        case 'composer': return item.composer?.name || '';
        case 'category': return item.category?.name || '';
        default:
          // Default case for properties like 'title'
          const value = (item as any)[property];
          return typeof value === 'string' ? value.toLowerCase() : value;
      }
    };

    // --- The Main Reactive Data Stream ---
    merge(this.refresh$, this.filterByCollectionId$)
      .pipe(
        startWith({}), // Trigger initial data load
        tap(() => this.isLoading = true),
        switchMap(() => {
          // Fetch the entire relevant repertoire from the server.
          // Sorting and pagination will be handled on the client-side by MatTableDataSource.
          return this.apiService.getMyRepertoire(
            undefined, // We could add composer filter here in the future
            undefined, // We could add category filter here in the future
            this.filterByCollectionId$.value ?? undefined
          ).pipe(
            // Handle potential API errors gracefully
            catchError(() => {
              this.snackBar.open('Could not load repertoire.', 'Close', { duration: 5000 });
              return of([]); // Return an empty array on error
            })
          );
        }),
        map(data => {
          this.isLoading = false;
          this.totalPieces = data.length;
          // Dynamically add the "All" option if it's not already there and there's data
          if (data.length > 0 && !this.pageSizeOptions.includes(data.length)) {
             this.pageSizeOptions = [10, 25, 50, data.length];
          }
          return data;
        })
      ).subscribe(data => {
        // Assign the new data to our datasource. The table and paginator will update.
        this.dataSource.data = data;
      });
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

  /**
   * Formats the reference into a sortable value (e.g., pads numbers with zeros).
   */
  private formatReferenceForSort(piece: Piece): string {
    if (piece.collections && piece.collections.length > 0) {
      const ref = piece.collections[0];
      const num = (ref as any).collection_piece.numberInCollection;
      // Try to parse the number part to sort numerically (e.g., 2 before 10)
      const numericPart = parseInt(num, 10);
      if (!isNaN(numericPart)) {
        // Pad with leading zeros to ensure correct string sorting
        return `${ref.prefix || ''}${numericPart.toString().padStart(5, '0')}`;
      }
      return `${ref.prefix || ''}${num}`; // Fallback for non-numeric refs
    }
    return ''; // Return empty string for non-collection pieces to sort them together
  }

  /**
   * Handles changes from the collection filter dropdown.
   */
  onCollectionFilterChange(collectionId: number | null): void {
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    this.filterByCollectionId$.next(collectionId);
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
    this.apiService.updatePieceStatus(pieceId, newStatus).subscribe({
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
}
