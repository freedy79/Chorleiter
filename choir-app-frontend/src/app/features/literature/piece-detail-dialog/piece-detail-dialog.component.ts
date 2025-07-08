import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Piece } from '@core/models/piece';
import { EventTypeLabelPipe } from '@shared/pipes/event-type-label.pipe';
import { PieceStatusLabelPipe } from '@shared/pipes/piece-status-label.pipe';

@Component({
  selector: 'app-piece-detail-dialog',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, EventTypeLabelPipe, PieceStatusLabelPipe],
  templateUrl: './piece-detail-dialog.component.html',
  styleUrls: ['./piece-detail-dialog.component.scss']
})
export class PieceDetailDialogComponent implements OnInit {
  piece?: Piece;

  constructor(
    private apiService: ApiService,
    public dialogRef: MatDialogRef<PieceDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { pieceId: number }
  ) {}

  ngOnInit(): void {
    this.apiService.getRepertoirePiece(this.data.pieceId).subscribe(p => this.piece = p);
  }
}
