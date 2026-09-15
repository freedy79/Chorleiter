import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  requestId: number | null = null;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private notification: NotificationService
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      choirName: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      congregation: [''],
      district: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      verificationCode: [''],
      acceptTerms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  get isVerificationStarted(): boolean {
    return this.requestId !== null;
  }

  get choirDataLocked(): boolean {
    return this.isVerificationStarted;
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get passwordMismatch(): boolean {
    const form = this.registerForm;
    return !!(form.errors?.['passwordMismatch'] &&
             form.get('confirmPassword')?.touched);
  }

  onSubmit(): void {
    if (this.isVerificationStarted) {
      this.notification.info('Die Registrierung läuft bereits. Bitte jetzt den E-Mail-Code bestätigen.');
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    const formData = {
      requesterName: `${this.registerForm.value.firstName} ${this.registerForm.value.name}`.trim(),
      requesterEmail: this.registerForm.value.email.toLowerCase(),
      choirName: this.registerForm.value.choirName,
      city: this.registerForm.value.city || this.registerForm.value.choirName,
      requesterPhone: this.registerForm.value.phone || undefined,
      congregation: this.registerForm.value.congregation || undefined,
      district: this.registerForm.value.district || undefined
    };

    this.apiService.startPublicChoirRegistration(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.requestId = response.requestId;
        this.successMessage = 'Verifizierungscode wurde an deine E-Mail gesendet. Bitte Code eingeben und bestätigen.';
        this.lockChoirDataControls();
        this.notification.success('Verifizierungscode gesendet. Bitte jetzt den Code aus der E-Mail bestätigen.', 7000);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 400 || err.status === 429 || err.status === 410) {
          this.errorMessage = err.error?.message || 'Ungültige Eingabedaten. Bitte überprüfen Sie Ihre Angaben.';
        } else {
          this.errorMessage = 'Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.';
        }
        this.notification.error(this.errorMessage);
        console.error('Registration failed', err);
      }
    });
  }

  verifyRegistration(): void {
    if (!this.requestId) {
      this.errorMessage = 'Bitte zuerst Registrierung starten.';
      this.notification.warning(this.errorMessage);
      return;
    }
    const code = String(this.registerForm.value.verificationCode || '').trim();
    if (!code) {
      this.errorMessage = 'Bitte Verifizierungscode eingeben.';
      this.notification.warning(this.errorMessage);
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.apiService.verifyChoirRegistration(this.requestId, code).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message || 'E-Mail bestätigt. Deine Anfrage wurde zur Freigabe eingereicht.';
        this.notification.success(this.successMessage, 9000);
        this.registerForm.reset();
        this.unlockChoirDataControls();
        this.requestId = null;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Verifizierung fehlgeschlagen.';
        this.notification.error(this.errorMessage);
      }
    });
  }

  private lockChoirDataControls(): void {
    this.registerForm.get('choirName')?.disable();
    this.registerForm.get('city')?.disable();
    this.registerForm.get('congregation')?.disable();
    this.registerForm.get('district')?.disable();
  }

  private unlockChoirDataControls(): void {
    this.registerForm.get('choirName')?.enable();
    this.registerForm.get('city')?.enable();
    this.registerForm.get('congregation')?.enable();
    this.registerForm.get('district')?.enable();
  }

  getErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (!field || !field.touched) return '';

    if (field.hasError('required')) {
      return 'Dieses Feld ist erforderlich';
    }
    if (field.hasError('email')) {
      return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }
    if (field.hasError('minlength')) {
      const minLength = field.errors?.['minlength']?.requiredLength;
      return `Mindestens ${minLength} Zeichen erforderlich`;
    }
    return '';
  }
}
