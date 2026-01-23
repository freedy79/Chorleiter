import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';

/**
 * Validator für sichere Passwörter (Option 1: Neue Anforderungen)
 * Mind. 12 Zeichen mit Großbuchstaben, Kleinbuchstaben, Zahlen und Sonderzeichen
 */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.value;
    if (!password) {
      return null;
    }

    const hasLength = password.length >= 12;
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    const isValid = hasLength && hasLowerCase && hasUpperCase && hasNumber && hasSpecialChar;

    if (!isValid) {
      return {
        weakPassword: {
          hasLength,
          hasLowerCase,
          hasUpperCase,
          hasNumber,
          hasSpecialChar
        }
      };
    }
    return null;
  };
}

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.scss']
})
export class PasswordResetComponent implements OnInit {
  form: ReturnType<FormBuilder['group']>;
  isLoading = false;
  message = '';
  token: string;

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private api: ApiService, private router: Router) {
    this.token = this.route.snapshot.params['token'];
    this.form = this.fb.group({
      password: ['', [Validators.required, strongPasswordValidator()]],
      passwordRepeat: ['', Validators.required]
    }, { validators: this.passwordsMatch });
  }

  // Password validation helper methods for template
  hasUpperCase(value: string): boolean {
    return /[A-Z]/.test(value);
  }

  hasLowerCase(value: string): boolean {
    return /[a-z]/.test(value);
  }

  hasNumber(value: string): boolean {
    return /\d/.test(value);
  }

  hasSpecialChar(value: string): boolean {
    return /[@$!%*?&]/.test(value);
  }

  private passwordsMatch(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const repeat = control.get('passwordRepeat')?.value;
    return password && repeat && password !== repeat ? { passwordsMismatch: true } : null;
  }

  ngOnInit(): void {
    this.api.validateResetToken(this.token).subscribe({
      error: err => {
        this.message = err.error?.message || 'Link ungültig oder abgelaufen.';
        this.form.disable();
        setTimeout(() => this.router.navigate(['/login']), 3000);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.isLoading = true;
    this.api.resetPassword(this.token, this.form.value.password || '').subscribe({
      next: () => {
        this.message = 'Dein Passwort wurde aktualisiert. Du wirst in 5 Sekunden zum Login weitergeleitet.';
        this.isLoading = false;
        setTimeout(() => this.router.navigate(['/login']), 5000);
      },
      error: err => {
        this.message = err.error?.message || 'Link ungültig oder abgelaufen.';
        this.isLoading = false;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      }
    });
  }
}
