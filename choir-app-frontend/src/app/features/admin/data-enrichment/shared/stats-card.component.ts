import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-enrichment-stats-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <mat-card class="stats-card" [class.highlight]="highlight">
      <div class="card-header">
        <mat-icon class="card-icon" *ngIf="icon">{{ icon }}</mat-icon>
        <div class="card-title">{{ title }}</div>
      </div>
      <div class="card-value">{{ value }}</div>
      <div class="card-subtitle" *ngIf="subtitle">{{ subtitle }}</div>
    </mat-card>
  `,
  styleUrls: ['./stats-card.component.scss']
})
export class StatsCardComponent {
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() highlight = false;
}
