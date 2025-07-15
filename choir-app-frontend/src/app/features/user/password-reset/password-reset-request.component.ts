import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-password-reset-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './password-reset-request.component.html',
  styleUrls: ['./password-reset-request.component.scss']
})
export class PasswordResetRequestComponent {
  form;
  isLoading = false;
  message = '';

  constructor(private fb: FormBuilder, private api: ApiService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.isLoading = true;
    this.api.requestPasswordReset(this.form.value.email || '').subscribe({
      next: () => {
        this.message = 'Wenn du registriert bist, erhältst du eine E-Mail mit einem Link zum Erstellen eines neuen Passworts. <br> Bitte beachte, dass diese Mail eventuell in dem Spamordner deines Emailproviders landen kann. Falls du innerhalb der nächsten 5 Minuten keine Mail erhältst, schaue bitte dort nach.';
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Wenn du registriert bist, erhältst du eine E-Mail mit einem Link zum Erstellen eines neuen Passworts. <br> Bitte beachte, dass diese Mail eventuell in dem Spamordner deines Emailproviders landen kann. Falls du innerhalb der nächsten 5 Minuten keine Mail erhältst, schaue bitte dort nach.';
        this.isLoading = false;
      }
    });
  }
}
