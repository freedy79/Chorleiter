import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

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
export class FilterPresetDialogComponent extends BaseFormDialog<any, FilterPresetDialogData> implements OnInit {
  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<FilterPresetDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: FilterPresetDialogData | undefined
  ) {
    super(fb, dialogRef, data);
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      visibility: ['personal', Validators.required]
    });
  }
}
