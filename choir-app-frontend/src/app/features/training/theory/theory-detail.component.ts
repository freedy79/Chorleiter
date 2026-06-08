import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { marked } from 'marked';
import { MaterialModule } from '@modules/material.module';
import { TrainingService } from '@core/services/training.service';
import {
  Exercise,
  TheoryTopic,
  MODULE_LABELS,
  DIFFICULTY_LABELS
} from '@core/models/training';

@Component({
  selector: 'app-theory-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  template: `
    <div class="theory-detail-container" *ngIf="!isLoading; else loading">
      <a routerLink="/training/theorie" class="back-link" mat-button>
        <mat-icon>arrow_back</mat-icon>
        Übersicht
      </a>

      <ng-container *ngIf="topic; else notFound">
        <h1>{{ topic.title }}</h1>
        <p *ngIf="topic.summary" class="summary">{{ topic.summary }}</p>

        <article class="markdown-content" [innerHTML]="renderedContent"></article>

        <section *ngIf="relatedExercises.length > 0" class="related-section">
          <h2>Passende Übungen</h2>
          <div class="related-list">
            <a *ngFor="let ex of relatedExercises"
               [routerLink]="['/training', 'exercises', ex.id]"
               class="related-card mat-elevation-z1">
              <mat-icon>fitness_center</mat-icon>
              <div class="related-text">
                <strong>{{ ex.title }}</strong>
                <span class="related-meta">
                  {{ moduleLabel(ex.module) }} · {{ difficultyLabel(ex.difficulty) }}
                </span>
              </div>
              <mat-icon class="chevron">chevron_right</mat-icon>
            </a>
          </div>
        </section>
      </ng-container>

      <ng-template #notFound>
        <p class="not-found">Theorie-Thema nicht gefunden.</p>
      </ng-template>
    </div>

    <ng-template #loading>
      <div class="loading"><mat-spinner diameter="48"></mat-spinner></div>
    </ng-template>
  `,
  styles: [`
    .theory-detail-container { max-width: 880px; margin: 0 auto; padding: 16px 16px 64px; }
    .back-link { margin-bottom: 8px; }
    h1 { margin: 8px 0 4px; }
    .summary { color: var(--training-text-muted); margin: 0 0 24px; font-style: italic; }
    .markdown-content { line-height: 1.65; }
    .markdown-content :is(h2, h3) { margin-top: 1.4em; }
    .markdown-content table { border-collapse: collapse; margin: 12px 0; width: 100%; }
    .markdown-content th, .markdown-content td { border: 1px solid var(--training-divider); padding: 6px 10px; text-align: left; }
    .markdown-content th { background: var(--training-surface-soft); }
    .markdown-content code { background: var(--training-surface-hover); padding: 2px 4px; border-radius: 3px; font-size: .92em; }
    .related-section { margin-top: 36px; }
    .related-section h2 { font-size: 1.15rem; margin-bottom: 12px; }
    .related-list { display: flex; flex-direction: column; gap: 8px; }
    .related-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 8px; text-decoration: none; color: inherit;
      background: var(--card-background, #fff);
    }
    .related-card:hover { box-shadow: 0 4px 10px rgba(0,0,0,.08); }
    .related-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .related-meta { font-size: .85rem; color: var(--training-text-muted); }
    .chevron { opacity: .5; }
    .loading { display: flex; justify-content: center; padding: 64px 0; }
    .not-found { padding: 32px 0; color: var(--training-text-muted); }
  `]
})
export class TheoryDetailComponent implements OnInit, OnDestroy {
  isLoading = true;
  topic: TheoryTopic | null = null;
  renderedContent: SafeHtml = '';
  relatedExercises: Exercise[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trainingService: TrainingService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => this.trainingService.getTheoryTopic(params.get('key')!)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (topic) => {
          this.topic = topic;
          const html = marked.parse(topic.content || '', { async: false }) as string;
          this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(html);
          this.loadRelatedExercises(topic);
          this.isLoading = false;
        },
        error: () => {
          this.topic = null;
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  moduleLabel(module: string): string {
    return MODULE_LABELS[module as keyof typeof MODULE_LABELS] ?? module;
  }

  difficultyLabel(difficulty: string): string {
    return DIFFICULTY_LABELS[difficulty as keyof typeof DIFFICULTY_LABELS] ?? difficulty;
  }

  private loadRelatedExercises(topic: TheoryTopic): void {
    if (!topic.relatedExercises || topic.relatedExercises.length === 0) {
      this.relatedExercises = [];
      return;
    }
    // Fetch exercises per (module, difficulty) pair and dedupe
    const seen = new Set<string>();
    const collected: Exercise[] = [];
    let remaining = topic.relatedExercises.length;
    topic.relatedExercises.forEach(rel => {
      this.trainingService.getExercises({ module: rel.module, difficulty: rel.difficulty, limit: 50 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            res.exercises.forEach(ex => {
              if (!seen.has(ex.id)) {
                seen.add(ex.id);
                collected.push(ex);
              }
            });
            if (--remaining === 0) {
              this.relatedExercises = collected.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
            }
          },
          error: () => {
            if (--remaining === 0) {
              this.relatedExercises = collected;
            }
          }
        });
    });
  }
}
