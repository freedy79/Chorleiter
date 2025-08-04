import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Collection } from '@core/models/collection';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-library-collection-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, MatDialogModule, RouterLink],
  templateUrl: './library-collection-dialog.component.html'
})
export class LibraryCollectionDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public collection: Collection, public dialogRef: MatDialogRef<LibraryCollectionDialogComponent>) {}
}

