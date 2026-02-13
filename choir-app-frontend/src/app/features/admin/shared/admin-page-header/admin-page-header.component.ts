import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="admin-page-header">
      <button
        mat-icon-button
        (click)="backToDashboard()"
        class="back-button"
        matTooltip="Zurück zum Admin Dashboard"
        aria-label="Zurück zum Admin Dashboard">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <div class="header-content">
        <h1>{{ title }}</h1>
        <p *ngIf="description" class="description">{{ description }}</p>
      </div>
    </div>
  `,
  styles: [`
    .admin-page-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 24px;
      padding: 16px 0;

      .back-button {
        margin-top: 4px;
        flex-shrink: 0;
        color: var(--text-secondary, rgba(0, 0, 0, 0.6));

        &:hover {
          color: var(--primary, #0093e4);
          background-color: var(--hover-overlay, rgba(0, 0, 0, 0.04));
        }
      }

      .header-content {
        flex: 1;
        min-width: 0; // Prevents flex overflow

        h1 {
          margin: 0 0 8px 0;
          font-size: 1.75rem;
          font-weight: 500;
          color: var(--text-primary, #333);
          line-height: 1.2;

          @media (max-width: 600px) {
            font-size: 1.375rem;
          }
        }

        .description {
          margin: 0;
          color: var(--text-secondary, #666);
          font-size: 0.875rem;
          line-height: 1.4;
        }
      }
    }

    // Dark mode support
    @media (prefers-color-scheme: dark) {
      .admin-page-header {
        .back-button {
          color: var(--text-secondary-dark, rgba(255, 255, 255, 0.7));

          &:hover {
            color: var(--primary-dark, #4db4eb);
            background-color: var(--hover-overlay-dark, rgba(255, 255, 255, 0.08));
          }
        }

        .header-content {
          h1 {
            color: var(--text-primary-dark, #fff);
          }

          .description {
            color: var(--text-secondary-dark, rgba(255, 255, 255, 0.7));
          }
        }
      }
    }

    // Tablet and mobile refinements
    @media (max-width: 768px) {
      .admin-page-header {
        padding: 12px 0;
        gap: 8px;
      }
    }
  `]
})
export class AdminPageHeaderComponent {
  @Input() title: string = '';
  @Input() description?: string;
  @Input() backRoute: string = '/admin/dashboard';

  constructor(private router: Router) {}

  backToDashboard(): void {
    this.router.navigate([this.backRoute]);
  }
}
