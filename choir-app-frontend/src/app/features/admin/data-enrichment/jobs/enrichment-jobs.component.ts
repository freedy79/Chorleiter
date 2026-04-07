import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface EnrichmentJob {
  id: string;
  jobType: string;
  status: string;
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  errorMessage: string | null;
  apiCosts: number;
  llmProvider: string;
  metadata: any;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  creator: { id: number; firstName: string; name: string } | null;
}

@Component({
  selector: 'app-enrichment-jobs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, EmptyStateComponent],
  templateUrl: './enrichment-jobs.component.html',
  styleUrls: ['./enrichment-jobs.component.scss']
})
export class EnrichmentJobsComponent implements OnInit, OnDestroy, OnChanges {
  /** Index of the currently active tab in the parent tab group (Jobs = 3) */
  @Input() activeTabIndex = 0;

  private destroy$ = new Subject<void>();

  jobForm: FormGroup;

  creating = false;
  loadingJobs = true;
  loadingApiKeys = true;

  /** Whether any provider has a configured API key */
  hasApiKeys = false;

  /** All jobs from the backend */
  jobs: EnrichmentJob[] = [];
  totalJobs = 0;

  /** Job currently being cancelled or deleted (track by ID) */
  actionInProgress: Record<string, 'cancel' | 'delete'> = {};

  /** Status filter */
  statusFilter: string | null = null;

  jobError: string | null = null;

  /** Auto-refresh interval (30s) */
  private autoRefreshActive = false;

  private readonly pieceFieldOptions = [
    { value: 'opus', label: 'Opus' },
    { value: 'voicing', label: 'Besetzung' },
    { value: 'key', label: 'Tonart' },
    { value: 'durationSec', label: 'Dauer (Sek.)' },
    { value: 'subtitle', label: 'Untertitel' },
    { value: 'lyrics', label: 'Text' },
    { value: 'lyricsSource', label: 'Textquelle' }
  ];

  private readonly composerFieldOptions = [
    { value: 'name', label: 'Name' },
    { value: 'birthYear', label: 'Geburtsjahr' },
    { value: 'deathYear', label: 'Todesjahr' }
  ];

  private readonly publisherFieldOptions = [
    { value: 'name', label: 'Name' }
  ];

  fieldOptions = this.pieceFieldOptions;

  private readonly defaultFieldsByType: Record<string, string[]> = {
    piece: ['opus', 'voicing', 'key', 'durationSec'],
    composer: ['birthYear', 'deathYear'],
    publisher: ['name']
  };

  readonly statusLabels: Record<string, string> = {
    pending: 'Ausstehend',
    running: 'Läuft',
    completed: 'Abgeschlossen',
    failed: 'Fehlgeschlagen',
    cancelled: 'Abgebrochen'
  };

  readonly statusIcons: Record<string, string> = {
    pending: 'schedule',
    running: 'sync',
    completed: 'check_circle',
    failed: 'error',
    cancelled: 'cancel'
  };

  readonly jobTypeLabels: Record<string, string> = {
    piece: 'Stücke',
    composer: 'Komponisten',
    publisher: 'Verlage'
  };

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private notification: NotificationService
  ) {
    this.jobForm = this.fb.group({
      jobType: ['piece', Validators.required],
      fields: [['opus', 'voicing', 'key', 'durationSec'], Validators.required],
      limit: [10, [Validators.required, Validators.min(1), Validators.max(2000)]],
      autoApprove: [false],
      autoApproveThreshold: [0.95]
    });
  }

  ngOnInit(): void {
    this.checkApiKeyAvailability();
    this.loadJobs();
    this.startAutoRefresh();

    // Update available fields when job type changes
    this.jobForm.get('jobType')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((jobType: string) => {
        this.updateFieldOptions(jobType);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeTabIndex'] && this.activeTabIndex === 3) {
      this.checkApiKeyAvailability();
      this.loadJobs();
    }
  }

  /** Update field options and reset selection when job type changes */
  private updateFieldOptions(jobType: string): void {
    switch (jobType) {
      case 'composer':
        this.fieldOptions = this.composerFieldOptions;
        break;
      case 'publisher':
        this.fieldOptions = this.publisherFieldOptions;
        break;
      default:
        this.fieldOptions = this.pieceFieldOptions;
    }
    const defaults = this.defaultFieldsByType[jobType] ?? [];
    this.jobForm.get('fields')!.setValue(defaults);
  }

  /** Check if at least one provider has an API key configured */
  checkApiKeyAvailability(): void {
    this.loadingApiKeys = true;
    this.adminService.getEnrichmentApiKeyStatus().subscribe({
      next: (response) => {
        const apiKeys = response.apiKeys || {};
        this.hasApiKeys = Object.values(apiKeys).some((v: any) => v.configured);
        this.loadingApiKeys = false;
      },
      error: () => {
        this.hasApiKeys = false;
        this.loadingApiKeys = false;
      }
    });
  }

  /** Load all jobs from backend */
  loadJobs(): void {
    this.loadingJobs = true;
    const filters: any = { limit: 100 };
    if (this.statusFilter) filters.status = this.statusFilter;

    this.adminService.listEnrichmentJobs(filters).subscribe({
      next: (response) => {
        this.jobs = response.jobs || [];
        this.totalJobs = response.total || 0;
        this.loadingJobs = false;
      },
      error: (err) => {
        console.error('Error loading jobs:', err);
        this.loadingJobs = false;
        this.notification.error('Jobs konnten nicht geladen werden.');
      }
    });
  }

  /** Start auto-refresh for running jobs */
  private startAutoRefresh(): void {
    if (this.autoRefreshActive) return;
    this.autoRefreshActive = true;

    timer(5000, 5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.activeTabIndex === 3 && this.hasActiveJobs()) {
          this.loadJobs();
        }
      });
  }

  /** Check if there are any running or pending jobs */
  hasActiveJobs(): boolean {
    return this.jobs.some(j => j.status === 'running' || j.status === 'pending');
  }

  /** Filter by status */
  filterByStatus(status: string | null): void {
    this.statusFilter = status;
    this.loadJobs();
  }

  /** Create a new enrichment job */
  createJob(): void {
    if (this.jobForm.invalid) {
      this.jobForm.markAllAsTouched();
      return;
    }

    if (!this.hasApiKeys) {
      this.notification.error('Kein API-Key konfiguriert. Bitte zuerst einen API-Key in den Einstellungen hinterlegen.');
      return;
    }

    const values = this.jobForm.value;

    this.creating = true;
    this.jobError = null;

    this.adminService.createEnrichmentJob(values.jobType, values.fields, {
      limit: values.limit,
      autoApprove: values.autoApprove,
      autoApproveThreshold: values.autoApproveThreshold
    }).subscribe({
      next: () => {
        this.creating = false;
        this.notification.success('Enrichment-Job gestartet', 3000);
        this.loadJobs(); // Refresh the list
      },
      error: (err) => {
        console.error('Error creating job:', err);
        this.creating = false;
        this.jobError = err.error?.message || 'Job konnte nicht gestartet werden.';
        this.notification.error(this.jobError!);
      }
    });
  }

  /** Cancel a running or pending job */
  cancelJob(job: EnrichmentJob): void {
    this.actionInProgress[job.id] = 'cancel';

    this.adminService.cancelEnrichmentJob(job.id).subscribe({
      next: () => {
        delete this.actionInProgress[job.id];
        this.notification.success('Job abgebrochen', 3000);
        this.loadJobs();
      },
      error: (err) => {
        delete this.actionInProgress[job.id];
        this.notification.error(err.error?.message || 'Fehler beim Abbrechen des Jobs.');
      }
    });
  }

  /** Delete a completed/failed/cancelled job */
  deleteJob(job: EnrichmentJob): void {
    this.actionInProgress[job.id] = 'delete';

    this.adminService.deleteEnrichmentJob(job.id).subscribe({
      next: (response) => {
        delete this.actionInProgress[job.id];
        const msg = response.deletedSuggestions > 0
          ? `Job und ${response.deletedSuggestions} Vorschläge gelöscht`
          : 'Job gelöscht';
        this.notification.success(msg, 3000);
        this.loadJobs();
      },
      error: (err) => {
        delete this.actionInProgress[job.id];
        this.notification.error(err.error?.message || 'Fehler beim Löschen des Jobs.');
      }
    });
  }

  /** Get short ID for display (first 8 chars) */
  shortId(id: string): string {
    return id?.substring(0, 8) || '';
  }

  /** Get enrichment fields from metadata */
  getFields(job: EnrichmentJob): string[] {
    return job.metadata?.enrichmentFields || [];
  }

  /**
   * Returns the provider label for display.
   * During execution: reads activeProvider from metadata (set at job start).
   * After completion: uses the stored llmProvider field.
   */
  getDisplayProvider(job: EnrichmentJob): string {
    if (job.status === 'running' || job.status === 'pending') {
      return job.metadata?.activeProvider ?? job.llmProvider ?? '…';
    }
    return job.llmProvider ?? '-';
  }

  /** Map a raw field name to a human-readable German label */
  getFieldLabel(field: string): string {
    const allOptions = [
      ...this.pieceFieldOptions,
      ...this.composerFieldOptions,
      ...this.publisherFieldOptions
    ];
    return allOptions.find(o => o.value === field)?.label ?? field;
  }

  /** Check if a job can be cancelled */
  canCancel(job: EnrichmentJob): boolean {
    return ['pending', 'running'].includes(job.status);
  }

  /** Check if a job can be deleted */
  canDelete(job: EnrichmentJob): boolean {
    return ['completed', 'failed', 'cancelled'].includes(job.status);
  }

  /** Get progress percentage for a running job */
  getProgress(job: EnrichmentJob): number {
    if (job.totalItems === 0) return 0;
    return Math.round((job.processedItems / job.totalItems) * 100);
  }

  /** Track by job ID for ngFor */
  trackByJobId(_index: number, job: EnrichmentJob): string {
    return job.id;
  }
}
