import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-plan-entry-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './plan-entry-dialog.component.html',
  styleUrls: ['./plan-entry-dialog.component.scss']
})
export class PlanEntryDialogComponent {
  form = this.fb.group({
    date: [new Date(), Validators.required],
    type: ['SERVICE', Validators.required],
    notes: ['']
  });

  constructor(private fb: FormBuilder,
              public dialogRef: MatDialogRef<PlanEntryDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
