import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { UserInChoir } from '@core/models/user';

export interface RequestAvailabilityDialogData {
  members: UserInChoir[];
}

@Component({
  selector: 'app-request-availability-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './request-availability-dialog.component.html',
  styleUrls: ['./request-availability-dialog.component.scss']
})
export class RequestAvailabilityDialogComponent {
  selected = new Set<number>();

  constructor(
    public dialogRef: MatDialogRef<RequestAvailabilityDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RequestAvailabilityDialogData
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
