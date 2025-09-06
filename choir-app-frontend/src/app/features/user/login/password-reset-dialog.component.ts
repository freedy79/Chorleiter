import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-password-reset-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Passwort zurücksetzen</h2>
    <div mat-dialog-content>
      <p>Du hast dein Passwort dreimal falsch eingegeben. Wir haben dir eine E-Mail geschickt, mit der du dein Passwort zurücksetzen kannst. Bis dahin ist kein Login möglich.</p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>OK</button>
    </div>
  `,
})
export class PasswordResetDialogComponent {}
