import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { PieceService } from '@core/services/piece.service';
import { Piece } from '@core/models/piece';
import { Router } from '@angular/router';
import { PaginatorService } from '@core/services/paginator.service';
import { AlphabetFilterComponent } from '@shared/components/alphabet-filter/alphabet-filter.component';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-collection-piece-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, AlphabetFilterComponent],
  templateUrl: './collection-piece-list.component.html',
  styleUrls: ['./collection-piece-list.component.scss']
})
export class CollectionPieceListComponent implements OnInit, AfterViewInit {
  pieces: Piece[] = [];
  dataSource = new MatTableDataSource<Piece>();
  displayedColumns = ['title', 'composer', 'author', 'collections'];
  totalPieces = 0;
  pageSizeOptions: number[] = [10, 25, 50];
  pageSize = 10;
  viewMode: 'collections' | 'pieces' = 'pieces';
  isHandset$: Observable<boolean>;
  selectedPiece: Piece | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private pieceService: PieceService,
              private router: Router,
              private paginatorService: PaginatorService,
              private responsive: ResponsiveService) {
    this.pageSize = this.paginatorService.getPageSize('collection-piece-list', this.pageSizeOptions[0]);
    this.isHandset$ = this.responsive.isHandset$;
  }

  ngOnInit(): void {
    this.loadPieces();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.dataSource.paginator = this.paginator;
      this.paginator.page.subscribe(e => {
        this.paginatorService.setPageSize('collection-piece-list', e.pageSize);
        // Trigger re-filtering to update the view when page size changes
        this.dataSource._updateChangeSubscription();
      });
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'composer':
            return item.composer?.name || item.origin || '';
          case 'author':
            return item.author?.name || '';
          default:
            return (item as any)[property];
        }
      };
    }
  }

  loadPieces(): void {
    this.pieceService.getGlobalPieces().subscribe(pieces => {
      this.pieces = pieces;
      this.onFilteredPieces(pieces); // Initial load shows all pieces
    });
  }

  onFilteredPieces(filteredPieces: Piece[]): void {
    this.dataSource.data = filteredPieces;
    this.totalPieces = filteredPieces.length;
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage();
    }
  }

  openPiece(piece: Piece): void {
    this.router.navigate(['/pieces', piece.id]);
  }

  toggleSelection(piece: Piece): void {
    this.selectedPiece = this.selectedPiece === piece ? null : piece;
  }

  onViewChange(value: 'collections' | 'pieces'): void {
    if (value === 'collections') {
      this.router.navigate(['/collections']);
    }
  }
}
