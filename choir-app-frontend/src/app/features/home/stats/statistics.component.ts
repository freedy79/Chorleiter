import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { StatsSummary, PieceStat } from '@core/models/stats-summary';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { Piece } from '@core/models/piece';

@Component({
  selector: 'app-statistics',
  standalone: true,
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  imports: [CommonModule, FormsModule, MaterialModule, RouterModule]
})
export class StatisticsComponent implements OnInit {
  stats?: StatsSummary;

  leastUsedPieces: PieceStat[] = [];

  displayedRehearsalColumns: string[] = ['title', 'composer', 'reference'];
  rehearsalDataSource = new MatTableDataSource<Piece>();

  startDate?: Date;
  endDate?: Date;
  activeMonths?: number;


  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRehearsalPieces();
  }

  loadStats(): void {
    this.apiService.getStatistics(this.startDate, this.endDate, this.activeMonths)
      .subscribe(s => {
      this.stats = s;
      this.leastUsedPieces = s.leastUsedPieces;
    });
  }

  private loadRehearsalPieces(): void {
    this.apiService
      .getMyRepertoire(undefined, undefined, undefined, undefined, undefined, 100, ['IN_REHEARSAL'])
      .subscribe(res => (this.rehearsalDataSource.data = res.data));
  }

  formatReference(piece: Piece): string {
    if (piece.collectionPrefix && piece.collectionNumber) {
      return `${piece.collectionPrefix}${piece.collectionNumber}`;
    }
    if (piece.collections && piece.collections.length > 0) {
      const ref = piece.collections[0];
      const num = ref.collection_piece.numberInCollection;
      const prefix = ref.singleEdition ? piece.composer?.name || piece.origin || '' : ref.prefix || '';
      return `${prefix}${num}`;
    }
    return '-';
  }
}
