import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { LibraryItem } from '@core/models/library-item';
import { LoanCartService } from '@core/services/loan-cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-library-item-info-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule],
  templateUrl: './library-item-info-dialog.component.html'
})
export class LibraryItemInfoDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public item: LibraryItem,
    private dialogRef: MatDialogRef<LibraryItemInfoDialogComponent>,
    private cart: LoanCartService,
    private snack: MatSnackBar
  ) {}

  addToCart(): void {
    this.cart.addItem(this.item);
    this.snack.open('Zur Anfrage hinzugefügt', undefined, { duration: 2000 });
    this.dialogRef.close();
  }
}
