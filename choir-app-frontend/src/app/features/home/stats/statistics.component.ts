import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { StatsSummary, PieceStat } from '@core/models/stats-summary';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { Piece } from '@core/models/piece';
import { NotificationService } from '@core/services/notification.service';
import { finalize } from 'rxjs/operators';

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
  globalMode = false;

  leastUsedStatusUpdates = new Set<number>();

  collapsedSections: { [key: string]: boolean } = {
    topService: false,
    topRehearsal: false,
    leastUsed: false,
    repertoire: false,
    rehearsal: false
  };

  constructor(private apiService: ApiService, private notification: NotificationService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.apiService.getStatistics(this.startDate, this.endDate, this.activeMonths, this.globalMode)
      .subscribe(s => {
        this.stats = s;
        this.leastUsedPieces = s.leastUsedPieces;
        this.globalMode = s.isGlobal;
        if (!this.globalMode) {
          this.loadRehearsalPieces();
        } else {
          this.rehearsalDataSource.data = [];
        }
      });
  }

  onModeChange(): void {
    this.loadStats();
  }

  resetRehearsalStatus(piece: PieceStat): void {
    if (this.globalMode || this.leastUsedStatusUpdates.has(piece.id)) return;
    this.leastUsedStatusUpdates.add(piece.id);
    this.apiService
      .updatePieceStatus(piece.id, 'NOT_READY')
      .pipe(finalize(() => this.leastUsedStatusUpdates.delete(piece.id)))
      .subscribe({
        next: () => {
          this.notification.success('Probenstatus auf "Nicht im Repertoire" gesetzt.');
          this.loadStats();
        },
        error: () => {
          this.notification.error('Status konnte nicht aktualisiert werden.');
        }
      });
  }

  isLeastUsedUpdating(pieceId: number): boolean {
    return this.leastUsedStatusUpdates.has(pieceId);
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

  toggleSection(sectionKey: string): void {
    this.collapsedSections[sectionKey] = !this.collapsedSections[sectionKey];
  }
}
