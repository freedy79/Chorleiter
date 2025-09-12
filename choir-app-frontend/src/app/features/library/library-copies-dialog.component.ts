import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { Lending } from '@core/models/lending';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LibraryItem } from '@core/models/library-item';

@Component({
  selector: 'app-library-copies-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule, FormsModule],
  templateUrl: './library-copies-dialog.component.html'
})
export class LibraryCopiesDialogComponent implements OnInit {
  copies: Lending[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { item: LibraryItem },
    private dialogRef: MatDialogRef<LibraryCopiesDialogComponent>,
    private api: ApiService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getLibraryItemCopies(this.data.item.id).subscribe(copies => (this.copies = copies));
  }

  save(copy: Lending): void {
    const { borrowerName, status } = copy;
    this.api.updateLibraryCopy(copy.id, { borrowerName, status }).subscribe(() => {
      this.snack.open('Gespeichert', undefined, { duration: 2000 });
      this.load();
    });
  }

  download(): void {
    this.api.downloadLibraryCopiesPdf(this.data.item.id).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leihliste-${this.data.item.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
