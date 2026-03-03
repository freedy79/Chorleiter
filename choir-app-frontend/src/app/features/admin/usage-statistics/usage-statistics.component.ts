import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';

interface ViewsByDay {
  date: string;
  viewCount: number;
}

interface TopEntity {
  entityId: number;
  entityLabel: string;
  viewCount: number;
  shareToken?: string;
  uniqueVisitors?: number;
}

interface TopPage {
  path: string;
  viewCount: number;
}

interface CategoryCount {
  category: string;
  viewCount: number;
}

interface SharedPieceStat {
  entityId: number;
  entityLabel: string;
  shareToken: string;
  totalViews: number;
  uniqueVisitors: number;
  firstView: string;
  lastView: string;
}

interface UsageSummary {
  period: { days: number; since: string };
  totalViews: number;
  uniqueVisitors: number;
  topPieces: TopEntity[];
  topSharedPieces: TopEntity[];
  topCollections: TopEntity[];
  topPages: TopPage[];
  viewsByDay: ViewsByDay[];
  viewsByCategory: CategoryCount[];
}

@Component({
  selector: 'app-usage-statistics',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './usage-statistics.component.html',
  styleUrls: ['./usage-statistics.component.scss']
})
export class UsageStatisticsComponent implements OnInit {
  summary: UsageSummary | null = null;
  sharedPieceStats: SharedPieceStat[] = [];
  loading = true;
  sharedLoading = false;
  selectedDays = 30;
  selectedTab = 0;

  dayOptions = [
    { value: 7, label: '7 Tage' },
    { value: 14, label: '14 Tage' },
    { value: 30, label: '30 Tage' },
    { value: 90, label: '90 Tage' },
    { value: 365, label: '1 Jahr' }
  ];

  // For the simple bar chart
  maxDailyViews = 0;

  constructor(
    private adminService: AdminService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadSummary();
    this.loadSharedPieceStats();
  }

  loadSummary(): void {
    this.loading = true;
    this.adminService.getUsageStatsSummary(this.selectedDays).subscribe({
      next: (data: UsageSummary) => {
        this.summary = data;
        this.maxDailyViews = Math.max(...(data.viewsByDay?.map(d => +d.viewCount) || [0]), 1);
        this.loading = false;
      },
      error: () => {
        this.notification.error('Fehler beim Laden der Statistiken.');
        this.loading = false;
      }
    });
  }

  loadSharedPieceStats(): void {
    this.sharedLoading = true;
    this.adminService.getSharedPieceStats(this.selectedDays).subscribe({
      next: (data: SharedPieceStat[]) => {
        this.sharedPieceStats = data;
        this.sharedLoading = false;
      },
      error: () => {
        this.notification.error('Fehler beim Laden der geteilten Stücke.');
        this.sharedLoading = false;
      }
    });
  }

  onDaysChange(): void {
    this.loadSummary();
    this.loadSharedPieceStats();
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'piece': 'Stücke',
      'shared-piece': 'Geteilte Stücke',
      'collection': 'Sammlungen',
      'page': 'Seiten'
    };
    return labels[category] || category;
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'piece': 'music_note',
      'shared-piece': 'share',
      'collection': 'library_music',
      'page': 'web'
    };
    return icons[category] || 'visibility';
  }

  getBarWidth(count: number): number {
    return Math.max((count / this.maxDailyViews) * 100, 2);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  cleanupOldData(): void {
    if (!confirm('Möchtest du Seitenaufrufe älter als 1 Jahr löschen?')) return;

    this.adminService.cleanupOldPageViews(365).subscribe({
      next: (result: any) => {
        this.notification.success(`${result.deleted} alte Einträge gelöscht.`);
        this.loadSummary();
      },
      error: () => {
        this.notification.error('Fehler beim Aufräumen.');
      }
    });
  }
}
