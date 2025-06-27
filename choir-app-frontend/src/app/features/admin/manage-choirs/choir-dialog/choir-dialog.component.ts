import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Choir } from 'src/app/core/models/choir';

@Component({
  selector: 'app-choir-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './choir-dialog.component.html',
  styleUrls: ['./choir-dialog.component.scss']
})
export class ChoirDialogComponent {
  form: FormGroup;
  title = 'Add Choir';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ChoirDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Choir | null
  ) {
    this.title = data ? 'Edit Choir' : 'Add Choir';
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      description: [data?.description || ''],
      location: [data?.location || '']
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
