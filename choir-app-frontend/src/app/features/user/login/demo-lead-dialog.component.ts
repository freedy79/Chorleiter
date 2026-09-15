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
    <h1 mat-dialog-title class="dialog-title">Demo testen</h1>
    <form [formGroup]="form" (ngSubmit)="submit()" mat-dialog-content class="dialog-content">
      <p class="intro">
        Schön, dass du NAK Chorleiter ausprobieren möchtest.
        Gib einfach deine E-Mail-Adresse ein — wir schicken dir dann den Bestätigungslink.
      </p>
      <p class="hint">
        Danach kannst du die Applikation direkt im Demo-Umfang entdecken.
      </p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>E-Mail</mat-label>
        <input matInput formControlName="email" type="email" autocomplete="email" />
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <mat-error>Bitte eine gültige E-Mail-Adresse eingeben.</mat-error>
        }
      </mat-form-field>
    </form>

    <div mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button type="button" (click)="close()">Abbrechen</button>
      <button mat-flat-button color="primary" type="button" [disabled]="form.invalid" (click)="submit()">Link anfordern</button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .dialog-title {
      margin: 0;
      font-size: 1.5rem;
      line-height: 1.25;
      color: var(--mat-sys-on-surface, inherit);
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: min(420px, calc(100vw - 64px));
      padding-top: 0.25rem;
    }

    .intro {
      margin: 0;
      line-height: 1.5;
      color: var(--mat-sys-on-surface, inherit);
    }

    .hint {
      margin: 0 0 0.25rem;
      color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.65));
      font-size: 0.95rem;
    }

    .full-width {
      width: 100%;
    }

    .dialog-actions {
      gap: 0.5rem;
      padding: 0 24px 20px;
    }

    @media (max-width: 599px) {
      .dialog-title {
        font-size: 1.65rem;
      }
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
