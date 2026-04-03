import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { AuthService } from '@core/services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-form-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, MaterialModule],
  template: `
    <div class="form-layout">
      <header class="form-toolbar">
        <a routerLink="/dashboard" class="brand" matTooltip="Zurück zum Dashboard">
          <mat-icon>music_note</mat-icon>
          <span class="brand-text">Chorleiter</span>
        </a>

        <nav class="nav-links" *ngIf="isLoggedIn$ | async">
          <a mat-button routerLink="/forms" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            <mat-icon>description</mat-icon>
            <span>Formulare</span>
          </a>
          <a mat-button routerLink="/dashboard">
            <mat-icon>dashboard</mat-icon>
            <span>Dashboard</span>
          </a>
        </nav>

        <span class="spacer"></span>

        <ng-container *ngIf="isLoggedIn$ | async; else loginLink">
          <span class="user-name" *ngIf="currentUser$ | async as user">{{ user.firstName }}</span>
        </ng-container>
        <ng-template #loginLink>
          <a mat-button routerLink="/login">Anmelden</a>
        </ng-template>
      </header>

      <main class="form-content">
        <router-outlet></router-outlet>
      </main>

      <footer class="form-footer">
        <span>© {{ currentYear }} NAK Chorleiter</span>
        <a routerLink="/imprint">Impressum</a>
        <a routerLink="/privacy">Datenschutz</a>
      </footer>
    </div>
  `,
  styles: [`
    @use '../../../../themes/breakpoints' as bp;
    @use '../../../../themes/dark-mode-variables' as dm;

    .form-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: #fafafa;

      @include dm.dark-mode {
        background: var(--bg-color, #303030);
      }
    }

    .form-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 24px;
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      z-index: 10;
      height: 56px;

      @include dm.dark-mode {
        background: var(--card-bg, #424242);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      @include bp.handset {
        padding: 8px 12px;
      }
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: #1976d2;
      font-weight: 600;
      font-size: 1.1rem;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      @include bp.handset {
        .brand-text { display: none; }
      }
    }

    .nav-links {
      display: flex;
      gap: 4px;
      margin-left: 16px;

      a {
        font-size: 0.875rem;

        &.active {
          background: rgba(25, 118, 210, 0.08);
          color: #1976d2;
        }
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }

      @include bp.handset {
        span { display: none; }
        gap: 0;
      }
    }

    .spacer { flex: 1; }

    .user-name {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);

      @include dm.dark-mode {
        color: rgba(255, 255, 255, 0.6);
      }
    }

    .form-content {
      flex: 1;
      padding: 0;
    }

    .form-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 16px;
      font-size: 0.8rem;
      color: rgba(0, 0, 0, 0.45);
      border-top: 1px solid rgba(0, 0, 0, 0.06);

      a {
        color: inherit;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      @include dm.dark-mode {
        color: rgba(255, 255, 255, 0.45);
        border-color: rgba(255, 255, 255, 0.06);
      }
    }
  `],
})
export class FormLayoutComponent {
  currentYear = new Date().getFullYear();
  isLoggedIn$: Observable<boolean>;
  currentUser$: Observable<any>;

  constructor(private authService: AuthService) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
    this.currentUser$ = this.authService.currentUser$;
  }
}
