import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-composer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule
  ],
  templateUrl: './composer-dialog.component.html',
  styleUrls: ['./composer-dialog.component.scss']
})
export class ComposerDialogComponent {
  form: FormGroup; // <-- 1. Declare the property without initializing it here.

  constructor(
    private fb: FormBuilder, // fb is injected and available here
    public dialogRef: MatDialogRef<ComposerDialogComponent>
  ) {
    // 2. Initialize the property inside the constructor where fb is defined.
    this.form = this.fb.group({
      name: ['', Validators.required]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.name); // Pass back only the name string
    }
  }
}
