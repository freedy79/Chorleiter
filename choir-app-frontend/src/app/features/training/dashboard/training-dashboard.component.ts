import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { TrainingService } from '@core/services/training.service';
import { AuthService } from '@core/services/auth.service';
import {
  TrainingProfile,
  BadgeDefinition,
  MODULE_LABELS,
  TrainingModule,
  Exercise
} from '@core/models/training';

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
  isLoading = true;
  error: string | null = null;
  isAdmin = false;
  isReseeding = false;
  reseedMessage: string | null = null;
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
    private authService: AuthService
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
    this.trainingService.getProfile().pipe(takeUntil(this.destroy$)).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loadBadges();
        this.loadModuleProgress();
      },
      error: (err) => {
        this.error = 'Trainings-Profil konnte nicht geladen werden.';
        this.isLoading = false;
      }
    });
  }

  private loadModuleProgress(): void {
    for (const mod of this.modules) {
      this.trainingService.getExercises({ module: mod }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (result) => {
          const completed = result.exercises.filter(e => e.completed).length;
          this.moduleProgress[mod] = { completed, total: result.exercises.length };
        }
      });
    }
  }

  private loadBadges(): void {
    this.trainingService.getBadges().pipe(takeUntil(this.destroy$)).subscribe({
      next: (badges) => {
        this.badges = badges;
        this.recentBadges = badges
          .filter(b => b.earned)
          .sort((a, b) => new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime())
          .slice(0, 5);
        this.isLoading = false;
      },
      error: () => {
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

  reseedExercises(): void {
    if (this.isReseeding) return;
    this.isReseeding = true;
    this.reseedMessage = null;
    this.trainingService.reseedExercises().pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.reseedMessage = result.message;
        this.isReseeding = false;
      },
      error: () => {
        this.reseedMessage = 'Fehler beim Zurücksetzen der Übungen.';
        this.isReseeding = false;
      }
    });
  }
}
