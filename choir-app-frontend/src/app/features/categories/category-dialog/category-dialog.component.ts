import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './category-dialog.component.html',
})
export class CategoryDialogComponent extends BaseFormDialog<string> {
  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<CategoryDialogComponent>
  ) {
    super(fb, dialogRef);
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required]
    });
  }

  protected override getResult(): string {
    return this.form.value.name;
  }
}
