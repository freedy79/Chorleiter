import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { UserInChoir } from '@core/models/user';

export interface SendPlanDialogData {
  members: UserInChoir[];
}

@Component({
  selector: 'app-send-plan-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './send-plan-dialog.component.html',
  styleUrls: ['./send-plan-dialog.component.scss']
})
export class SendPlanDialogComponent {
  selected = new Set<number>();
  emails = '';

  constructor(
    public dialogRef: MatDialogRef<SendPlanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SendPlanDialogData
  ) {}

  toggle(id: number, checked: boolean): void {
    if (checked) this.selected.add(id); else this.selected.delete(id);
  }

  private parseEmails(): string[] {
    return this.emails
      .split(/[,;\s]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
  }

  get canSend(): boolean {
    return this.selected.size > 0 || this.parseEmails().length > 0;
  }

  send(): void {
    this.dialogRef.close({ ids: Array.from(this.selected), emails: this.parseEmails() });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
