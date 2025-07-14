import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { UserInChoir } from '@core/models/user';

export interface SendPlanDialogData {
  members: UserInChoir[];
}

@Component({
  selector: 'app-send-plan-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './send-plan-dialog.component.html',
  styleUrls: ['./send-plan-dialog.component.scss']
})
export class SendPlanDialogComponent {
  selected = new Set<number>();

  constructor(
    public dialogRef: MatDialogRef<SendPlanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SendPlanDialogData
  ) {}

  toggle(id: number, checked: boolean): void {
    if (checked) this.selected.add(id); else this.selected.delete(id);
  }

  send(): void {
    this.dialogRef.close(Array.from(this.selected));
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
