import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface StatusWidget {
  title: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
  trend?: number;
}

@Component({
  selector: 'app-admin-status-widget',
  template: `
    <div class="status-grid">
      <div class="status-card" *ngFor="let widget of statusWidgets" [ngClass]="'status-' + widget.color">
        <div class="status-icon">
          <mat-icon>{{ widget.icon }}</mat-icon>
        </div>
        <div class="status-info">
          <div class="status-value">{{ widget.value }}{{ widget.unit }}</div>
          <div class="status-title">{{ widget.title }}</div>
          <div class="status-trend" *ngIf="widget.trend">
            <span [class.positive]="widget.trend > 0" [class.negative]="widget.trend < 0">
              {{ widget.trend > 0 ? '+' : '' }}{{ widget.trend }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .status-card {
      display: flex;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      background: #f9f9f9;
      border-left: 4px solid #ddd;
      align-items: center;

      &.status-primary {
        background: rgba(25, 118, 210, 0.08);
        border-left-color: #1976d2;
      }

      &.status-success {
        background: rgba(76, 175, 80, 0.08);
        border-left-color: #4caf50;
      }

      &.status-warning {
        background: rgba(255, 193, 7, 0.08);
        border-left-color: #ffc107;
      }

      &.status-error {
        background: rgba(244, 67, 54, 0.08);
        border-left-color: #f44336;
      }

      .status-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: rgba(0,0,0,0.05);
        border-radius: 50%;

        mat-icon {
          font-size: 1.25rem;
          width: 20px;
          height: 20px;
        }
      }

      .status-info {
        .status-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #333;
        }

        .status-title {
          font-size: 0.75rem;
          color: #999;
          margin-bottom: 4px;
        }

        .status-trend {
          font-size: 0.6875rem;

          .positive {
            color: #4caf50;
          }

          .negative {
            color: #f44336;
          }
        }
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class AdminStatusWidgetComponent implements OnInit {
  statusWidgets: StatusWidget[] = [
    { title: 'Aktive Benutzer', value: 24, unit: '', icon: 'people', color: 'primary', trend: 8 },
    { title: 'Chöre', value: 12, unit: '', icon: 'account_balance', color: 'success' },
    { title: 'System Health', value: 99, unit: '%', icon: 'favorite', color: 'success' },
    { title: 'Ausstehend', value: 3, unit: '', icon: 'notifications_active', color: 'warning' }
  ];

  ngOnInit(): void {
    // TODO: Load real data from admin service
  }
}
