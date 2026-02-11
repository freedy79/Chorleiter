import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Loan } from '@core/models/loan';
import { LoanStatusLabelPipe } from '@shared/pipes/loan-status-label.pipe';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-loan-edit-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule, LoanStatusLabelPipe],
  templateUrl: './loan-edit-dialog.component.html'
})
export class LoanEditDialogComponent extends BaseFormDialog<any, { loan: Loan }> implements OnInit {
  statuses = ['available', 'requested', 'borrowed', 'due', 'partial_return'];

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<LoanEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: { loan: Loan } | undefined
  ) {
    super(fb, dialogRef, data);
  }

  protected buildForm(): FormGroup {
    const loan = this.data?.loan;
    return this.fb.group({
      startDate: [loan?.startDate ? new Date(loan.startDate) : null],
      endDate: [loan?.endDate ? new Date(loan.endDate) : null],
      status: [loan?.status]
    });
  }

  protected override getResult(): any {
    const { startDate, endDate, status } = this.form.value;
    return {
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      status
    };
  }

  // Preserve original method names for template compatibility
  save(): void {
    this.onSave();
  }

  cancel(): void {
    this.onCancel();
  }
}
