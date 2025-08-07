import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-piece-report-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './piece-report-dialog.component.html',
  styleUrls: ['./piece-report-dialog.component.scss']
})
export class PieceReportDialogComponent {
  category = 'Fehlerhafte Daten';
  reason = '';
  categories = ['Fehlerhafte Daten', 'Urheberrechtsverletzung', 'Defekte Verknüpfungen', 'Sonstiges'];

  constructor(
    private api: ApiService,
    public dialogRef: MatDialogRef<PieceReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { pieceId: number }
  ) {}

  send(): void {
    if (!this.reason) return;
    this.api.reportPiece(this.data.pieceId, this.category, this.reason).subscribe(() => {
      this.dialogRef.close(true);
    });
  }
}

