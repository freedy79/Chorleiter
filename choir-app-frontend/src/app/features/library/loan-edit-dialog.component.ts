import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Loan } from '@core/models/loan';
import { LoanStatusLabelPipe } from '@shared/pipes/loan-status-label.pipe';

@Component({
  selector: 'app-loan-edit-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule, LoanStatusLabelPipe],
  templateUrl: './loan-edit-dialog.component.html'
})
export class LoanEditDialogComponent {
  form: FormGroup;
  statuses = ['available', 'requested', 'borrowed', 'due', 'partial_return'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LoanEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { loan: Loan }
  ) {
    const loan = data.loan;
    this.form = this.fb.group({
      startDate: [loan.startDate ? new Date(loan.startDate) : null],
      endDate: [loan.endDate ? new Date(loan.endDate) : null],
      status: [loan.status]
    });
  }

  save(): void {
    if (this.form.valid) {
      const { startDate, endDate, status } = this.form.value;
      this.dialogRef.close({
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        status
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
