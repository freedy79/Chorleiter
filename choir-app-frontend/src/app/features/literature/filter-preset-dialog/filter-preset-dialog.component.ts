import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

export interface FilterPresetDialogData {
  isAdmin: boolean;
  isChoirAdmin: boolean;
}

@Component({
  selector: 'app-filter-preset-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './filter-preset-dialog.component.html',
})
export class FilterPresetDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<FilterPresetDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FilterPresetDialogData
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      visibility: ['personal', Validators.required]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
