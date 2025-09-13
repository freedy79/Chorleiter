import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { Lending } from '@core/models/lending';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-collection-copies-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule, FormsModule],
  templateUrl: './collection-copies-dialog.component.html'
})
export class CollectionCopiesDialogComponent implements OnInit {
  copies: Lending[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { collectionId: number },
    private dialogRef: MatDialogRef<CollectionCopiesDialogComponent>,
    private api: ApiService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getCollectionCopies(this.data.collectionId).subscribe(copies => (this.copies = copies));
  }

  save(copy: Lending): void {
    const { borrowerName, status } = copy;
    this.api.updateCollectionCopy(copy.id, { borrowerName, status }).subscribe(() => {
      this.snack.open('Gespeichert', undefined, { duration: 2000 });
      this.load();
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
