import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { PersonalAddressBookEntry } from '@core/models/personal-address-book-entry';

export interface AddressBookEntryDialogData {
  entry?: PersonalAddressBookEntry;
}

@Component({
  selector: 'app-address-book-entry-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <h1 mat-dialog-title>{{ data.entry ? 'Kontakt bearbeiten' : 'Kontakt hinzufügen' }}</h1>
    <form [formGroup]="form" (ngSubmit)="save()">
      <div mat-dialog-content class="entry-form">
        <mat-form-field appearance="outline">
          <mat-label>Nachname</mat-label>
          <input matInput formControlName="name" autocomplete="family-name">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Vorname</mat-label>
          <input matInput formControlName="firstName" autocomplete="given-name">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>E-Mail</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="email" required>
          <mat-error *ngIf="form.controls.email.hasError('required')">E-Mail ist erforderlich.</mat-error>
          <mat-error *ngIf="form.controls.email.hasError('email')">Bitte eine gültige E-Mail-Adresse eingeben.</mat-error>
        </mat-form-field>
      </div>
      <div mat-dialog-actions align="end">
        <button mat-button type="button" (click)="cancel()">Abbrechen</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Speichern</button>
      </div>
    </form>
  `,
  styles: [`
    .entry-form {
      display: grid;
      gap: 12px;
      min-width: min(420px, 80vw);
    }

    mat-form-field {
      width: 100%;
    }
  `]
})
export class AddressBookEntryDialogComponent {
  form: FormGroup<{
    name: FormControl<string>;
    firstName: FormControl<string>;
    email: FormControl<string>;
  }>;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddressBookEntryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddressBookEntryDialogData
  ) {
    this.form = this.fb.nonNullable.group({
      name: [this.data.entry?.name || ''],
      firstName: [this.data.entry?.firstName || ''],
      email: [this.data.entry?.email || '', [Validators.required, Validators.email]]
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
