import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Publisher } from '@core/models/publisher';

@Component({
  selector: 'app-publisher-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './publisher-dialog.component.html',
})
export class PublisherDialogComponent {
  form: FormGroup;
  title = 'Verlag hinzufügen';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<PublisherDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Publisher | null
  ) {
    this.title = data ? 'Verlag bearbeiten' : 'Verlag hinzufügen';
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required]
    });
  }

  onCancel(): void { this.dialogRef.close(); }
  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
