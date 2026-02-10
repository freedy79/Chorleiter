import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';

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
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      choirName: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
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
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    const formData = {
      firstName: this.registerForm.value.firstName,
      name: this.registerForm.value.name,
      email: this.registerForm.value.email.toLowerCase(),
      choirName: this.registerForm.value.choirName,
      password: this.registerForm.value.password
    };

    this.apiService.signup(formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Registrierung erfolgreich! Sie werden in Kürze weitergeleitet...';
        this.registerForm.reset();

        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 409 || err.error?.message?.includes('already exists')) {
          this.errorMessage = 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.';
        } else if (err.status === 400) {
          this.errorMessage = err.error?.message || 'Ungültige Eingabedaten. Bitte überprüfen Sie Ihre Angaben.';
        } else {
          this.errorMessage = 'Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.';
        }
        console.error('Registration failed', err);
      }
    });
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
