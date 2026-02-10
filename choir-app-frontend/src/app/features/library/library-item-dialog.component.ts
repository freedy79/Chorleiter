import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Collection } from '@core/models/collection';
import { Observable } from 'rxjs';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-library-item-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule],
  templateUrl: './library-item-dialog.component.html'
})
export class LibraryItemDialogComponent extends BaseFormDialog<any, { collections$: Observable<Collection[]> }> implements OnInit {
  collections$!: Observable<Collection[]>;

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<LibraryItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: { collections$: Observable<Collection[]> }
  ) {
    super(fb, dialogRef, data);
    this.collections$ = data.collections$;
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      collectionId: [null, Validators.required],
      copies: [1, [Validators.required, Validators.min(1)]],
      isBorrowed: [false]
    });
  }
}
