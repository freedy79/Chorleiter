import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.scss']
})
export class PasswordResetComponent {
  form: ReturnType<FormBuilder['group']>;
  isLoading = false;
  message = '';
  token: string;

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private api: ApiService) {
    this.token = this.route.snapshot.params['token'];
    this.form = this.fb.group({
      password: ['', Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.isLoading = true;
    this.api.resetPassword(this.token, this.form.value.password || '').subscribe({
      next: () => {
        this.message = 'Dein Passwort wurde aktualisiert. Du kannst dich jetzt anmelden.';
        this.isLoading = false;
      },
      error: err => {
        this.message = err.error?.message || 'Link ungültig oder abgelaufen.';
        this.isLoading = false;
      }
    });
  }
}
