import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './category-dialog.component.html',
  styleUrls: ['./category-dialog.component.scss']
})
export class CategoryDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CategoryDialogComponent>
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required]
    });
  }

  onCancel(): void { this.dialogRef.close(); }
  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.name);
    }
  }
}
