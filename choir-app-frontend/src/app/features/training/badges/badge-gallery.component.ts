import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { TrainingService } from '@core/services/training.service';
import { BadgeDefinition } from '@core/models/training';

@Component({
  selector: 'app-badge-gallery',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './badge-gallery.component.html',
  styleUrls: ['./badge-gallery.component.scss']
})
export class BadgeGalleryComponent implements OnInit, OnDestroy {
  badges: BadgeDefinition[] = [];
  isLoading = true;

  categoryLabels: Record<string, string> = {
    streak: 'Streak',
    xp: 'Erfahrung',
    module: 'Übungen',
    community: 'Gemeinschaft',
    mission: 'Missionen'
  };

  private destroy$ = new Subject<void>();

  constructor(private trainingService: TrainingService) {}

  ngOnInit(): void {
    this.trainingService.getBadges().pipe(takeUntil(this.destroy$)).subscribe({
      next: (badges) => {
        this.badges = badges;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get categories(): string[] {
    return [...new Set(this.badges.map(b => b.category))];
  }

  badgesInCategory(category: string): BadgeDefinition[] {
    return this.badges.filter(b => b.category === category);
  }

  get earnedCount(): number {
    return this.badges.filter(b => b.earned).length;
  }
}
