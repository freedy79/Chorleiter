import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';

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
      password: ['', Validators.required],
      passwordRepeat: ['', Validators.required]
    }, { validators: this.passwordsMatch });
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
