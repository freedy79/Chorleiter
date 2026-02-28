import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-poll-reminder-vote',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="vote-consume-page">
      <mat-card>
        <mat-card-content>
          <div class="center" *ngIf="loading">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Deine Stimme wird übernommen…</p>
          </div>

          <div class="center" *ngIf="!loading && success">
            <mat-icon color="primary">check_circle</mat-icon>
            <h2>Vielen Dank für deine Stimme!</h2>
            <p>Du wirst jetzt zum Beitrag weitergeleitet.</p>
          </div>

          <div class="center" *ngIf="!loading && !success">
            <mat-icon color="warn">error</mat-icon>
            <h2>Link nicht mehr gültig</h2>
            <p>{{ errorMessage }}</p>
            <button mat-flat-button color="primary" (click)="goToLogin()">Zum Login</button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .vote-consume-page {
      max-width: 560px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .center {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
      min-height: 180px;
      justify-content: center;
    }

    mat-icon {
      font-size: 42px;
      width: 42px;
      height: 42px;
    }
  `]
})
export class PollReminderVoteComponent implements OnInit {
  loading = true;
  success = false;
  errorMessage = 'Der Abstimmungslink ist abgelaufen oder wurde bereits verwendet.';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loading = false;
      this.success = false;
      return;
    }

    this.api.consumePollReminderToken(token).subscribe({
      next: response => {
        this.auth.establishSession(response.user);
        this.loading = false;
        this.success = true;
        setTimeout(() => {
          this.router.navigate(['/posts'], { fragment: `post-${response.postId}` });
        }, 1200);
      },
      error: (err) => {
        this.loading = false;
        this.success = false;
        if (err?.error?.message) {
          this.errorMessage = err.error.message;
        }
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
