import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { LibraryItem } from '@core/models/library-item';

@Component({
  selector: 'app-library-status-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule],
  templateUrl: './library-status-dialog.component.html'
})
export class LibraryStatusDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LibraryStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item: LibraryItem }
  ) {
    const item = data.item;
    const endDate = item.availableAt ? new Date(item.availableAt) : null;
    const startDate = endDate ? new Date(endDate) : null;
    if (startDate) startDate.setMonth(startDate.getMonth() - 3);
    this.form = this.fb.group({
      borrower: [''],
      status: [item.status],
      startDate: [startDate],
      endDate: [endDate]
    });
  }

  extendPeriod(): void {
    const current: Date = this.form.value.endDate ? new Date(this.form.value.endDate) : new Date();
    current.setMonth(current.getMonth() + 3);
    this.form.patchValue({ endDate: current });
  }

  save(): void {
    if (this.form.valid) {
      const { status, endDate } = this.form.value;
      this.dialogRef.close({
        status,
        availableAt: endDate ? endDate.toISOString() : null
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

