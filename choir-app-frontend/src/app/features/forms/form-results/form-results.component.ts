import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { BaseComponent } from '@shared/components/base.component';
import { FormService } from '@core/services/form.service';
import { NotificationService } from '@core/services/notification.service';
import { Form, FormSubmission, FormField, FormFieldStatistic } from '@core/models/form';
import { takeUntil } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-form-results',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, PureDatePipe, DatePipe, EmptyStateComponent],
  templateUrl: './form-results.component.html',
  styleUrls: ['./form-results.component.scss'],
})
export class FormResultsComponent extends BaseComponent implements OnInit {
  formId!: number;
  form: Form | null = null;
  submissions: FormSubmission[] = [];
  loading = true;
  selectedSubmission: FormSubmission | null = null;
  viewMode: 'table' | 'detail' = 'table';
  displayedColumns: string[] = [];

  // Statistics
  activeTab: 'submissions' | 'statistics' = 'submissions';
  statistics: FormFieldStatistic[] = [];
  statsLoading = false;
  statsSubmissionCount = 0;

  constructor(
    private route: ActivatedRoute,
    private formService: FormService,
    private notify: NotificationService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.formId = parseInt(this.route.snapshot.paramMap.get('id')!, 10);
    this.loadData();
  }

  private loadData(): void {
    this.formService.getFormById(this.formId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: form => {
          this.form = form;
          this.updateDisplayedColumns();
          this.loadSubmissions();
        },
        error: () => {
          this.notify.error('Formular nicht gefunden');
          this.loading = false;
        },
      });
  }

  private loadSubmissions(): void {
    this.formService.getSubmissions(this.formId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: submissions => {
          this.submissions = submissions;
          this.loading = false;
        },
        error: () => {
          this.notify.error('Ergebnisse konnten nicht geladen werden');
          this.loading = false;
        },
      });
  }

  switchTab(tab: 'submissions' | 'statistics'): void {
    this.activeTab = tab;
    if (tab === 'statistics' && this.statistics.length === 0) {
      this.loadStatistics();
    }
  }

  private loadStatistics(): void {
    this.statsLoading = true;
    this.formService.getStatistics(this.formId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.statistics = data.fields;
          this.statsSubmissionCount = data.submissionCount;
          this.statsLoading = false;
        },
        error: () => {
          this.notify.error('Statistik konnte nicht geladen werden');
          this.statsLoading = false;
        },
      });
  }

  // ── Statistics helpers ────────────────────────────────────

  getStatEntries(stat: FormFieldStatistic): { label: string; count: number; percentage: number }[] {
    if (!stat.values || stat.total === 0) return [];
    return Object.entries(stat.values)
      .map(([label, count]) => ({
        label,
        count,
        percentage: Math.round((count / stat.total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  isChartableField(stat: FormFieldStatistic): boolean {
    return ['select', 'radio', 'multi_checkbox', 'checkbox', 'rating'].includes(stat.type);
  }

  get fields(): FormField[] {
    return this.form?.fields || [];
  }

  getAnswerValue(submission: FormSubmission, fieldId: number): string {
    const answer = submission.answers?.find(a => a.fieldId === fieldId);
    return answer?.value || '—';
  }

  getSubmitterName(sub: FormSubmission): string {
    if (sub.submitter) {
      return `${sub.submitter.firstName || ''} ${sub.submitter.lastName || ''}`.trim();
    }
    return sub.submitterName || 'Anonym';
  }

  selectSubmission(sub: FormSubmission): void {
    this.selectedSubmission = sub;
    this.viewMode = 'detail';
  }

  backToTable(): void {
    this.selectedSubmission = null;
    this.viewMode = 'table';
  }

  deleteSubmission(sub: FormSubmission, event: Event): void {
    event.stopPropagation();
    if (!confirm('Diese Abgabe wirklich löschen?')) return;

    this.formService.deleteSubmission(this.formId, sub.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submissions = this.submissions.filter(s => s.id !== sub.id);
          if (this.selectedSubmission?.id === sub.id) {
            this.backToTable();
          }
          this.notify.success('Abgabe gelöscht');
        },
        error: () => this.notify.error('Fehler beim Löschen'),
      });
  }

  exportCsv(): void {
    this.formService.exportSubmissions(this.formId);
  }

  // ── Simple stats for fields ───────────────────────────────

  getInteractiveFields(): FormField[] {
    return this.fields.filter(f => f.type !== 'heading' && f.type !== 'separator');
  }

  private updateDisplayedColumns(): void {
    const fieldCols = this.getInteractiveFields().map(f => 'field_' + f.id);
    this.displayedColumns = ['submitter', 'date', ...fieldCols, 'actions'];
  }
}
