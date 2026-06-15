import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-choir-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './choir-registration.component.html'
})
export class ChoirRegistrationComponent {
  readonly token: string;
  requestId: number | null = null;
  loading = false;
  verifying = false;
  verificationCompleted = false;
  message: string | null = null;
  error: string | null = null;

  form;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private api: ApiService,
    private notification: NotificationService
  ) {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.form = this.fb.group({
      requesterName: ['', [Validators.required, Validators.minLength(2)]],
      requesterEmail: ['', [Validators.required, Validators.email]],
      requesterPhone: [''],
      choirName: ['', [Validators.required, Validators.minLength(2)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      congregation: [''],
      district: [''],
      code: ['']
    });
  }

  get verificationUnlocked(): boolean {
    return this.requestId !== null;
  }

  get choirDataLocked(): boolean {
    return this.verificationUnlocked;
  }

  start(): void {
    if (this.verificationUnlocked) {
      this.notification.info('Die Registrierung läuft bereits. Bitte jetzt den E-Mail-Code bestätigen.');
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = null;
    this.message = null;

    this.api.startChoirRegistration(this.token, {
      requesterName: this.form.value.requesterName || '',
      requesterEmail: this.form.value.requesterEmail || '',
      requesterPhone: this.form.value.requesterPhone || undefined,
      choirName: this.form.value.choirName || '',
      city: this.form.value.city || '',
      congregation: this.form.value.congregation || undefined,
      district: this.form.value.district || undefined
    }).subscribe({
      next: (res) => {
        this.requestId = res.requestId;
        this.message = 'Verifizierungscode wurde per E-Mail versendet.';
        this.lockChoirDataControls();
        this.notification.success('Verifizierungscode wurde versendet. Bitte E-Mail prüfen und Code eingeben.', 7000);
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Registrierungsstart fehlgeschlagen.';
        this.notification.error(this.error);
        this.loading = false;
      }
    });
  }

  verify(): void {
    if (!this.requestId) {
      this.error = 'Bitte zuerst Registrierung starten.';
      this.notification.warning(this.error);
      return;
    }
    const code = (this.form.value.code || '').trim();
    if (!code) {
      this.error = 'Bitte Verifizierungscode eingeben.';
      this.notification.warning(this.error);
      return;
    }

    this.verifying = true;
    this.error = null;

    this.api.verifyChoirRegistration(this.requestId, code).subscribe({
      next: (res) => {
        this.message = res.message || 'Verifiziert und eingereicht.';
        this.verificationCompleted = true;
        this.notification.success(this.message, 9000);
        this.verifying = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Verifizierung fehlgeschlagen.';
        this.notification.error(this.error);
        this.verifying = false;
      }
    });
  }

  private lockChoirDataControls(): void {
    this.form.get('choirName')?.disable();
    this.form.get('city')?.disable();
    this.form.get('congregation')?.disable();
    this.form.get('district')?.disable();
  }
}
