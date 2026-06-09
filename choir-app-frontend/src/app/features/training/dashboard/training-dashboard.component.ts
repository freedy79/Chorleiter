import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, switchMap, takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { TrainingService } from '@core/services/training.service';
import { AuthService } from '@core/services/auth.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  TrainingProfile,
  BadgeDefinition,
  MODULE_LABELS,
  TrainingModule,
  WeeklyLeaderboard,
  DayActivity
} from '@core/models/training';

interface HeatmapCell {
  day: string;
  count: number;
  xp: number;
  level: 0 | 1 | 2 | 3;
  isToday: boolean;
}

@Component({
  selector: 'app-training-dashboard',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './training-dashboard.component.html',
  styleUrls: ['./training-dashboard.component.scss']
})
export class TrainingDashboardComponent implements OnInit, OnDestroy {
  profile: TrainingProfile | null = null;
  badges: BadgeDefinition[] = [];
  recentBadges: BadgeDefinition[] = [];
  leaderboard: WeeklyLeaderboard | null = null;
  leaderboardTab: 'xp' | 'time' = 'xp';
  isLeaderboardLoading = false;
  isLoading = true;
  error: string | null = null;
  isAdmin = false;
  isReseeding = false;
  reseedMessage: string | null = null;
  recentActivity: DayActivity[] = [];
  readonly dailyXpGoal = 60;
  readonly heatmapDayCount = 84;
  moduleProgress: Record<TrainingModule, { completed: number; total: number }> = {
    rhythm: { completed: 0, total: 0 },
    note_reading: { completed: 0, total: 0 },
    ear_training: { completed: 0, total: 0 }
  };

  moduleLabels = MODULE_LABELS;
  modules: TrainingModule[] = ['rhythm', 'note_reading', 'ear_training'];
  moduleIcons: Record<TrainingModule, string> = {
    rhythm: 'music_note',
    note_reading: 'library_music',
    ear_training: 'hearing'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private trainingService: TrainingService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.authService.isAdmin$.pipe(takeUntil(this.destroy$)).subscribe(
      isAdmin => this.isAdmin = isAdmin
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;
    this.trainingService.getProfile().pipe(takeUntil(this.destroy$)).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loadBadges();
        this.loadModuleProgress();
        this.loadLeaderboard();
        this.loadRecentActivity();
      },
      error: () => {
        this.error = 'Trainings-Profil konnte nicht geladen werden.';
        this.isLoading = false;
      }
    });
  }

  private loadLeaderboard(): void {
    this.isLeaderboardLoading = true;
    this.trainingService.getWeeklyLeaderboard().pipe(takeUntil(this.destroy$)).subscribe({
      next: (lb) => {
        this.leaderboard = lb;
        this.isLeaderboardLoading = false;
      },
      error: () => {
        this.leaderboard = null;
        this.isLeaderboardLoading = false;
      }
    });
  }

  formatDuration(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '–';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m === 0) return `${s}s`;
    return `${m}:${s.toString().padStart(2, '0')} min`;
  }

  private loadModuleProgress(): void {
    // Use a high limit so the completed/total counts remain accurate
    // even if more than the default page size of exercises is seeded.
    for (const mod of this.modules) {
      this.trainingService.getExercises({ module: mod, limit: 500 }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (result) => {
          const completed = result.exercises.filter(e => e.completed).length;
          const total = result.total ?? result.exercises.length;
          this.moduleProgress[mod] = { completed, total };
        }
      });
    }
  }

  private loadBadges(): void {
    this.trainingService.getBadges().pipe(takeUntil(this.destroy$)).subscribe({
      next: (badges) => {
        this.badges = badges;
        this.recentBadges = badges
          .filter(b => b.earned && b.earnedAt)
          .sort((a, b) => new Date(b.earnedAt as string).getTime() - new Date(a.earnedAt as string).getTime())
          .slice(0, 5);
        this.isLoading = false;
      },
      error: () => {
        this.badges = [];
        this.recentBadges = [];
        this.isLoading = false;
      }
    });
  }

  get xpProgress(): number {
    if (!this.profile || !this.profile.nextLevelXp) return 100;
    const currentLevelXp = this.profile.xpForCurrentLevel || 0;
    const range = this.profile.nextLevelXp - currentLevelXp;
    if (range <= 0) return 100;
    return Math.min(100, Math.round(((this.profile.totalXp - currentLevelXp) / range) * 100));
  }

  get weeklyProgress(): number {
    if (!this.profile) return 0;
    return Math.min(100, Math.round(((this.profile.weeklyMinutes || 0) / this.profile.weeklyGoalMinutes) * 100));
  }

  get earnedBadgeCount(): number {
    return this.badges.filter(b => b.earned).length;
  }

  get todayXp(): number {
    const today = this.toDayKey(new Date());
    const day = this.recentActivity.find(d => d.day === today);
    return day?.xp ?? 0;
  }

  get dailyXpProgress(): number {
    if (this.dailyXpGoal <= 0) return 0;
    return Math.min(100, Math.round((this.todayXp / this.dailyXpGoal) * 100));
  }

  get dailyGoalReached(): boolean {
    return this.todayXp >= this.dailyXpGoal;
  }

  get heatmapCells(): HeatmapCell[] {
    const activityByDay = new Map(this.recentActivity.map(d => [d.day, d]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: HeatmapCell[] = [];
    for (let offset = this.heatmapDayCount - 1; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const dayKey = this.toDayKey(date);
      const activity = activityByDay.get(dayKey);
      const count = activity?.count ?? 0;
      const xp = activity?.xp ?? 0;

      cells.push({
        day: dayKey,
        count,
        xp,
        level: this.heatmapLevel(count),
        isToday: offset === 0
      });
    }

    return cells;
  }

  heatmapAriaLabel(cell: HeatmapCell): string {
    const parts = cell.day.split('-').map(Number);
    const d = new Date(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1);
    const formatted = d.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
    return `${formatted}: ${cell.count} Übungen, ${cell.xp} XP`;
  }

  private loadRecentActivity(): void {
    this.trainingService.getStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.recentActivity = stats.recentActivity ?? [];
      },
      error: () => {
        this.recentActivity = [];
      }
    });
  }

  private heatmapLevel(count: number): 0 | 1 | 2 | 3 {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    return 3;
  }

  private toDayKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  reseedExercises(): void {
    if (this.isReseeding) return;

    const data: ConfirmDialogData = {
      title: 'Trainingsdaten zurücksetzen?',
      message:
        'Achtung: Alle Übungen, Versuche, Abzeichen-Definitionen, vergebenen Abzeichen und Theorie-Themen werden gelöscht und aus den Seed-Daten neu erstellt.\n\nBenutzer verlieren dadurch ihren Trainingsfortschritt (Versuchs-Historie und Abzeichen). Profile (XP, Level, Streak) bleiben erhalten.\n\nMöchtest du wirklich fortfahren?',
      confirmButtonText: 'Ja, neu erzeugen',
      cancelButtonText: 'Abbrechen'
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '480px', autoFocus: false })
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        takeUntil(this.destroy$),
        switchMap(() => {
          this.isReseeding = true;
          this.reseedMessage = null;
          return this.trainingService.reseedExercises();
        })
      )
      .subscribe({
        next: (result) => {
          this.reseedMessage = result.message;
          this.isReseeding = false;
          // Daten neu laden, damit Fortschrittsanzeigen aktuell sind
          this.loadData();
        },
        error: () => {
          this.reseedMessage = 'Fehler beim Zurücksetzen der Übungen.';
          this.isReseeding = false;
        }
      });
  }
}
