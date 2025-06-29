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
  title = 'Neuen Komponisten erstellen';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ComposerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { role: 'composer' | 'author'; record?: any }
  ) {
    const isEdit = !!data.record;
    this.title = data.role === 'author'
      ? isEdit ? 'Dichter bearbeiten' : 'Neuen Dichter erstellen'
      : isEdit ? 'Komponist bearbeiten' : 'Neuen Komponisten erstellen';
    this.form = this.fb.group({
      name: [data.record?.name || '', Validators.required],
      birthYear: [data.record?.birthYear || ''],
      deathYear: [data.record?.deathYear || '']
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
