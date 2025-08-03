import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Collection } from '@core/models/collection';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-library-item-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule],
  templateUrl: './library-item-dialog.component.html'
})
export class LibraryItemDialogComponent {
  form: FormGroup;
  collections$!: Observable<Collection[]>;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LibraryItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { collections$: Observable<Collection[]> }
  ) {
    this.collections$ = data.collections$;
    this.form = this.fb.group({
      pieceId: [null, Validators.required],
      collectionId: [null, Validators.required],
      copies: [1, [Validators.required, Validators.min(1)]],
      isBorrowed: [false]
    });
  }

  save(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
