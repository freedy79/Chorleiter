import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { LibraryItem } from '@core/models/library-item';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-library-status-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule],
  templateUrl: './library-status-dialog.component.html'
})
export class LibraryStatusDialogComponent extends BaseFormDialog<any, { item: LibraryItem }> implements OnInit {
  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<LibraryStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: { item: LibraryItem } | undefined
  ) {
    super(fb, dialogRef, data);
  }

  protected buildForm(): FormGroup {
    const item = this.data?.item;
    const endDate = item?.availableAt ? new Date(item.availableAt) : null;
    const startDate = endDate ? new Date(endDate) : null;
    if (startDate) startDate.setMonth(startDate.getMonth() - 3);

    return this.fb.group({
      borrower: [''],
      status: [item?.status],
      startDate: [startDate],
      endDate: [endDate]
    });
  }

  protected override getResult(): any {
    const { status, endDate } = this.form.value;
    return {
      status,
      availableAt: endDate ? endDate.toISOString() : null
    };
  }

  extendPeriod(): void {
    const current: Date = this.form.value.endDate ? new Date(this.form.value.endDate) : new Date();
    current.setMonth(current.getMonth() + 3);
    this.form.patchValue({ endDate: current });
  }

  // Preserve original method names for template compatibility
  save(): void {
    this.onSave();
  }

  cancel(): void {
    this.onCancel();
  }
}
