import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { RouterModule } from '@angular/router';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-password-reset-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, RouterModule],
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
        this.message = 'Wenn du registriert bist, erhältst du eine E-Mail mit einem Link zum Erstellen eines neuen Passworts.';
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Wenn du registriert bist, erhältst du eine E-Mail mit einem Link zum Erstellen eines neuen Passworts.';
        this.isLoading = false;
      }
    });
  }
}
