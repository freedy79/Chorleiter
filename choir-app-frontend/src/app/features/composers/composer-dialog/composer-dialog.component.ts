import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
  form: FormGroup;
  title = 'Add New Composer';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ComposerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { role: 'composer' | 'author' }
  ) {
    this.title = data.role === 'author' ? 'Add New Author' : 'Add New Composer';
    this.form = this.fb.group({
      name: ['', Validators.required],
      birthYear: [''],
      deathYear: ['']
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
