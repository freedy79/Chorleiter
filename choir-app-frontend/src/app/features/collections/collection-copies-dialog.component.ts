import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { Lending } from '@core/models/lending';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserInChoir } from '@core/models/user';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'app-collection-copies-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule, FormsModule],
  templateUrl: './collection-copies-dialog.component.html'
})
export class CollectionCopiesDialogComponent implements OnInit {
  copies: Lending[] = [];
  members: UserInChoir[] = [];
  displayedColumns = ['number', 'name', 'borrowed', 'returned', 'actions'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { collectionId: number },
    private dialogRef: MatDialogRef<CollectionCopiesDialogComponent>,
    private api: ApiService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
    this.api.getChoirMembers().subscribe(m => (this.members = m));
  }

  load(): void {
    this.api.getCollectionCopies(this.data.collectionId).subscribe(copies => (this.copies = copies));
  }

  save(copy: Lending): void {
    const data: any = { borrowerName: copy.borrowerName };
    if (copy.borrowerId) data.borrowerId = copy.borrowerId;
    this.api.updateCollectionCopy(copy.id, data).subscribe(() => {
      this.snack.open('Gespeichert', undefined, { duration: 2000 });
      this.load();
    });
  }

  fullName(u: UserInChoir): string {
    return u.firstName ? `${u.name}, ${u.firstName}` : u.name;
  }

  onNameSelected(copy: Lending, event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value as string;
    const member = this.members.find(m => this.fullName(m) === value);
    copy.borrowerId = member?.id;
    copy.borrowerName = value;
    this.save(copy);
  }

  onNameBlur(copy: Lending): void {
    if (!copy.borrowerName) return;
    const member = this.members.find(m => this.fullName(m) === copy.borrowerName);
    copy.borrowerId = member?.id;
    this.save(copy);
  }

  returnCopy(copy: Lending): void {
    this.api.updateCollectionCopy(copy.id, { borrowerName: null, borrowerId: null }).subscribe(() => {
      this.snack.open('Gespeichert', undefined, { duration: 2000 });
      this.load();
    });
  }

  adjustCopies(): void {
    const copiesStr = prompt('Neue Anzahl der Exemplare eingeben:');
    const copies = copiesStr ? parseInt(copiesStr, 10) : NaN;
    if (isNaN(copies) || copies < 1) {
      return;
    }
    if (copies < this.copies.length && this.copies.some(c => c.status === 'borrowed')) {
      this.snack.open('Reduzierung nicht möglich: Ausleihen vorhanden.', undefined, { duration: 3000 });
      return;
    }
    this.api.setCollectionCopies(this.data.collectionId, copies).subscribe({
      next: () => {
        this.snack.open('Gespeichert', undefined, { duration: 2000 });
        this.load();
      },
      error: err => {
        this.snack.open(err.error?.message || 'Fehler beim Speichern', undefined, { duration: 3000 });
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
