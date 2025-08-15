import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Publisher } from '@core/models/publisher';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-publisher-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './publisher-dialog.component.html',
})
export class PublisherDialogComponent extends BaseFormDialog<Publisher, Publisher | null> {
  title = 'Verlag hinzufügen';

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<PublisherDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public override data: Publisher | null
  ) {
    super(fb, dialogRef, data);
    this.title = data ? 'Verlag bearbeiten' : 'Verlag hinzufügen';
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: [this.data?.name || '', Validators.required]
    });
  }
}
