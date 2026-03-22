import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AdminService } from '@core/services/admin.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-ota-login',
  template: `
    <div class="ota-login-container">
      @if (loading) {
        <mat-spinner diameter="48"></mat-spinner>
        <p>Zugang wird hergestellt…</p>
      }
      @if (error) {
        <mat-icon class="error-icon">error_outline</mat-icon>
        <h2>Zugang fehlgeschlagen</h2>
        <p>{{ error }}</p>
        <button mat-raised-button routerLink="/login">Zum Login</button>
      }
    </div>
  `,
  styles: [`
    .ota-login-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
      padding: 32px;
    }
    .error-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--warn-color, #f44336);
      margin-bottom: 16px;
    }
    h2 { margin-bottom: 8px; }
    p { color: var(--text-secondary, rgba(0,0,0,0.6)); margin-bottom: 24px; }
  `],
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule, MatButtonModule],
})
export class OtaLoginComponent implements OnInit {
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.error = 'Kein Token angegeben.';
      this.loading = false;
      return;
    }

    this.adminService.consumeOtaToken(token).subscribe({
      next: (user) => {
        this.authService.establishSession(user);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Token ungültig oder abgelaufen.';
      },
    });
  }
}
