import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-create-practice-list-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, MatDialogModule],
  template: `
    <h1 mat-dialog-title>Neue Übungsliste</h1>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Name der Liste</mat-label>
        <input
          matInput
          [(ngModel)]="listName"
          maxlength="60"
          placeholder="z.\u00A0B. Altstimmen Probe"
          (keyup.enter)="submit()"
          cdkFocusInitial
        />
        <mat-hint align="end">{{ listName.length }}/60</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Abbrechen</button>
      <button mat-flat-button color="primary" [disabled]="!listName.trim()" (click)="submit()">
        Erstellen
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-dialog-content { min-width: min(80vw, 360px); }
  `]
})
export class CreatePracticeListDialogComponent {
  listName = '';

  constructor(public dialogRef: MatDialogRef<CreatePracticeListDialogComponent, string>) {}

  submit(): void {
    const name = this.listName.trim();
    if (name) {
      this.dialogRef.close(name);
    }
  }
}
