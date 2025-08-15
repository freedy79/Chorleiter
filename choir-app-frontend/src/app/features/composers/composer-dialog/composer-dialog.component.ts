import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-composer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule
  ],
  templateUrl: './composer-dialog.component.html',
})
export class ComposerDialogComponent extends BaseFormDialog<{ name: string; birthYear: string; deathYear: string }, { role: 'composer' | 'author'; record?: any }> {
  title = 'Neuen Komponisten erstellen';

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<ComposerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public override data: { role: 'composer' | 'author'; record?: any }
  ) {
    super(fb, dialogRef, data);
    const isEdit = !!data.record;
    this.title = data.role === 'author'
      ? isEdit ? 'Dichter bearbeiten' : 'Neuen Dichter erstellen'
      : isEdit ? 'Komponist bearbeiten' : 'Neuen Komponisten erstellen';
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: [this.data?.record?.name || '', Validators.required],
      birthYear: [this.data?.record?.birthYear || ''],
      deathYear: [this.data?.record?.deathYear || '']
    });
  }
}
