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

@Component({
  selector: 'app-collection-piece-list',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './collection-piece-list.component.html',
  styleUrls: ['./collection-piece-list.component.scss']
})
export class CollectionPieceListComponent implements OnInit, AfterViewInit {
  pieces: Piece[] = [];
  dataSource = new MatTableDataSource<Piece>();
  displayedColumns = ['title', 'composer', 'author', 'collections'];
  letters: string[] = ['Alle','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  selectedLetter = 'Alle';
  totalPieces = 0;
  pageSizeOptions: number[] = [10, 25, 50];
  pageSize = 10;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private pieceService: PieceService,
              private router: Router,
              private paginatorService: PaginatorService) {
    this.pageSize = this.paginatorService.getPageSize('collection-piece-list', this.pageSizeOptions[0]);
  }

  ngOnInit(): void {
    this.loadPieces();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.dataSource.paginator = this.paginator;
      this.paginator.page.subscribe(e => this.paginatorService.setPageSize('collection-piece-list', e.pageSize));
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'composer':
            return item.composer?.name || '';
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
      this.applyFilter();
    });
  }

  applyFilter(): void {
    let filtered = this.pieces;
    if (this.selectedLetter !== 'Alle') {
      const letter = this.selectedLetter.toUpperCase();
      filtered = filtered.filter(p => p.title.toUpperCase().startsWith(letter));
    }
    this.dataSource.data = filtered;
    this.totalPieces = filtered.length;
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage();
    }
  }

  onLetterSelect(letter: string): void {
    this.selectedLetter = letter;
    this.applyFilter();
  }

  openPiece(piece: Piece): void {
    this.router.navigate(['/pieces', piece.id]);
  }
}
