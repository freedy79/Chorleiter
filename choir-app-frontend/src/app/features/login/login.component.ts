import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

import { AuthService } from 'src/app/core/services/auth.service';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  sessionExpired = false;
  loginError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router, // Injizieren Sie den Angular Router
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.sessionExpired = params.has('sessionExpired');
      if (!this.sessionExpired) {
        this.authService.isTokenValid().subscribe(valid => {
          if (!valid && this.authService.getToken()) {
            this.sessionExpired = true;
          }
        });
      }
    });
  }

  onSubmit(): void {
    // Ignorieren, wenn das Formular ungültig ist
    if (this.loginForm.invalid) {
      return;
    }

    this.loginError = null;
    this.isLoading = true;

    // Rufen Sie den AuthService auf, um den Benutzer anzumelden
    this.authService.login(this.loginForm.value).subscribe({
      // --- DIES IST DER ERFOLGSFALL ---
      next: () => {
        // Wenn der Login erfolgreich war, navigieren Sie zum Dashboard.
        // Die Route '/dashboard' ist in Ihrer app-routing.module.ts definiert.
        console.log('Login successful, navigating to dashboard...');
        this.router.navigate(['/dashboard']);
      },
      // --- DIES IST DER FEHLERFALL ---
      error: (err) => {
        this.isLoading = false;
        const status = err.status;
        if (status === 401 || status === 404 || status === 403) {
          this.loginError = 'Benutzer oder Passwort ungültig';
        } else {
          this.loginError = err.error?.message || 'Anmeldung fehlgeschlagen';
        }
        console.error('Login failed', err);
      },
      // --- WIRD IMMER AUSGEFÜHRT ---
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}
