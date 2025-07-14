import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router, // Injizieren Sie den Angular Router
    private snackBar: MatSnackBar,
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
    });
  }

  onSubmit(): void {
    // Ignorieren, wenn das Formular ungültig ist
    if (this.loginForm.invalid) {
      return;
    }

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
        // Zeigen Sie dem Benutzer eine freundliche Fehlermeldung
        const errorMessage = err.error?.message || 'Anmeldung fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.';
        this.snackBar.open(errorMessage, 'Schließen', {
          duration: 5000,
          verticalPosition: 'top'
        });
        console.error('Login failed', err);
      },
      // --- WIRD IMMER AUSGEFÜHRT ---
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}
