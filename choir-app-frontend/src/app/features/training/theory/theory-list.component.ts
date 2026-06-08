import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { TrainingService } from '@core/services/training.service';
import {
  TheoryTopicSummary,
  TheoryCategory,
  THEORY_CATEGORY_LABELS,
  THEORY_CATEGORY_ORDER
} from '@core/models/training';

interface CategoryGroup {
  category: TheoryCategory;
  label: string;
  topics: TheoryTopicSummary[];
}

@Component({
  selector: 'app-theory-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  template: `
    <div class="theory-list-container">
      <header class="theory-header">
        <h1>Musiktheorie</h1>
        <p class="subtitle">
          Theoretische Grundlagen verbunden mit konkreten Hör- und Notenübungen.
        </p>
      </header>

      <div *ngIf="isLoading" class="loading">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <div *ngIf="!isLoading" class="categories">
        <section *ngFor="let group of groups" class="category-section">
          <h2 class="category-title">{{ group.label }}</h2>
          <div class="topic-grid">
            <a *ngFor="let topic of group.topics"
               [routerLink]="['/training', 'theorie', topic.key]"
               class="topic-card mat-elevation-z1">
              <mat-icon class="topic-icon">menu_book</mat-icon>
              <div class="topic-text">
                <strong>{{ topic.title }}</strong>
                <span *ngIf="topic.summary" class="topic-summary">{{ topic.summary }}</span>
              </div>
              <mat-icon class="chevron">chevron_right</mat-icon>
            </a>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .theory-list-container { max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; }
    .theory-header h1 { margin: 0 0 4px; font-size: 1.75rem; }
    .subtitle { margin: 0 0 24px; color: var(--training-text-muted); }
    .loading { display: flex; justify-content: center; padding: 48px 0; }
    .categories { display: flex; flex-direction: column; gap: 32px; }
    .category-title { font-size: 1.15rem; margin: 0 0 12px; }
    .topic-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .topic-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; border-radius: 8px; text-decoration: none;
      background: var(--card-background, #fff); color: inherit;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .topic-card:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,.08); }
    .topic-icon { color: var(--training-accent); flex: 0 0 auto; }
    .topic-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .topic-summary { font-size: .85rem; color: var(--training-text-muted); }
    .chevron { opacity: .5; }
  `]
})
export class TheoryListComponent implements OnInit, OnDestroy {
  isLoading = true;
  groups: CategoryGroup[] = [];

  private destroy$ = new Subject<void>();

  constructor(private trainingService: TrainingService) {}

  ngOnInit(): void {
    this.trainingService.getTheoryTopics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (topics) => {
          this.groups = THEORY_CATEGORY_ORDER
            .map(cat => ({
              category: cat,
              label: THEORY_CATEGORY_LABELS[cat],
              topics: topics.filter(t => t.category === cat)
            }))
            .filter(g => g.topics.length > 0);
          this.isLoading = false;
        },
        error: () => this.isLoading = false
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
