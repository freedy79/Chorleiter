import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';
import { StatsCardComponent } from '../shared/stats-card.component';

interface EnrichmentStatistics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalCosts: number;
  totalSuggestions: number;
  appliedSuggestions: number;
}

interface ProviderStatus {
  name: string;
  available: boolean;
  pricing?: { name?: string; estimatedCostPerPiece?: number };
  connection?: { ok: boolean; message?: string };
}

@Component({
  selector: 'app-enrichment-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTooltipModule,
    StatsCardComponent
  ],
  templateUrl: './enrichment-dashboard.component.html',
  styleUrls: ['./enrichment-dashboard.component.scss']
})
export class EnrichmentDashboardComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;

  stats: EnrichmentStatistics = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalCosts: 0,
    totalSuggestions: 0,
    appliedSuggestions: 0
  };

  providers: ProviderStatus[] = [];
  monthlyBudget = 50;

  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    timer(0, 30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadDashboard());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = null;

    this.adminService.getEnrichmentStatistics().subscribe({
      next: (response) => {
        this.stats = response.statistics || this.stats;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading enrichment stats:', err);
        this.error = 'Fehler beim Laden der Statistik.';
        this.loading = false;
      }
    });

    this.adminService.getEnrichmentProviders().subscribe({
      next: (response) => {
        this.providers = response.providers || [];
      },
      error: (err) => {
        console.error('Error loading provider status:', err);
        this.notification.error('Provider-Status konnte nicht geladen werden.');
      }
    });

    this.adminService.getEnrichmentSettings().subscribe({
      next: (response) => {
        const budgetSetting = response.settings?.enrichment_monthly_budget?.value;
        if (budgetSetting !== undefined) {
          this.monthlyBudget = Number(budgetSetting);
        }
      },
      error: () => {
        // ignore, fallback to default
      }
    });
  }

  get approvalRate(): number {
    if (!this.stats.totalSuggestions) return 0;
    return Math.round((this.stats.appliedSuggestions / this.stats.totalSuggestions) * 100);
  }

  get completionRate(): number {
    if (!this.stats.totalJobs) return 0;
    return Math.round((this.stats.completedJobs / this.stats.totalJobs) * 100);
  }

  get budgetUsedPercentage(): number {
    if (!this.monthlyBudget) return 0;
    return Math.min(100, Math.round((this.stats.totalCosts / this.monthlyBudget) * 100));
  }

  formatCurrency(value: number): string {
    return value ? `€ ${value.toFixed(2)}` : '€ 0.00';
  }
}
