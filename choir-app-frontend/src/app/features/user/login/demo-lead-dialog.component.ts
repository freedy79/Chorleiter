import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-demo-lead-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Demo testen</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" mat-dialog-content class="dialog-content">
      <p>
        Schön, dass du NAK Chorleiter ausprobieren möchtest.
        Gib einfach deine E-Mail-Adresse ein — wir schicken dir dann den Bestätigungslink.
      </p>
      <p class="hint">
        Danach kannst du die Applikation direkt im Demo-Umfang entdecken.
      </p>

      <mat-form-field appearance="outline">
        <mat-label>E-Mail</mat-label>
        <input matInput formControlName="email" type="email" autocomplete="email" />
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <mat-error>Bitte eine gültige E-Mail-Adresse eingeben.</mat-error>
        }
      </mat-form-field>
    </form>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Abbrechen</button>
      <button mat-raised-button color="primary" type="button" [disabled]="form.invalid" (click)="submit()">Link anfordern</button>
    </div>
  `,
  styles: [`
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 320px;
    }

    .hint {
      margin-top: -4px;
      color: var(--text-secondary, rgba(0,0,0,0.65));
      font-size: 0.95rem;
    }
  `]
})
export class DemoLeadDialogComponent {
  form;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DemoLeadDialogComponent, string | undefined>,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.value.email?.trim());
  }

  close(): void {
    this.dialogRef.close(undefined);
  }
}
