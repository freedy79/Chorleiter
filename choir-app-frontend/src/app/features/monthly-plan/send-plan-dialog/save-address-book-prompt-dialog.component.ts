import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

export type SaveAddressBookPromptResult = 'save' | 'send-only' | 'cancel';

export interface SaveAddressBookPromptData {
  emails: string[];
}

@Component({
  selector: 'app-save-address-book-prompt-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <h1 mat-dialog-title>Neue Empfänger übernehmen?</h1>
    <div mat-dialog-content>
      <p>Diese E-Mail-Adressen sind noch nicht in der Mitgliederliste oder deinem persönlichen Adressbuch enthalten:</p>
      <mat-list dense>
        <mat-list-item *ngFor="let email of data.emails">{{ email }}</mat-list-item>
      </mat-list>
      <p class="hint">Wenn du sie übernimmst, erscheinen sie beim nächsten Versand direkt in der Empfängerliste.</p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="close('cancel')">Abbrechen</button>
      <button mat-button (click)="close('send-only')">Nur senden</button>
      <button mat-flat-button color="primary" (click)="close('save')">Übernehmen und senden</button>
    </div>
  `,
  styles: [`
    .hint {
      margin-top: 12px;
    }
  `]
})
export class SaveAddressBookPromptDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<SaveAddressBookPromptDialogComponent, SaveAddressBookPromptResult>,
    @Inject(MAT_DIALOG_DATA) public data: SaveAddressBookPromptData
  ) {}

  close(result: SaveAddressBookPromptResult): void {
    this.dialogRef.close(result);
  }
}
