import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

export interface RejectReasonDialogData {
  title?: string;
  choirName: string;
  requesterName?: string;
  initialReason?: string;
}

@Component({
  selector: 'app-reject-reason-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './reject-reason-dialog.component.html',
  styleUrls: ['./reject-reason-dialog.component.scss'],
})
export class RejectReasonDialogComponent {
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<RejectReasonDialogComponent, string | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: RejectReasonDialogData
  ) {
    this.reason = data.initialReason || '';
  }

  onDismiss(): void {
    this.dialogRef.close(undefined);
  }

  onConfirm(): void {
    this.dialogRef.close(this.reason.trim());
  }
}
