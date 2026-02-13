import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';

interface EnrichmentSuggestion {
  id: string;
  fieldName: string;
  originalValue: string | null;
  suggestedValue: string;
  confidence: number;
  source: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
}

@Component({
  selector: 'app-enrichment-suggestions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './enrichment-suggestions.component.html',
  styleUrls: ['./enrichment-suggestions.component.scss']
})
export class EnrichmentSuggestionsComponent {
  loading = false;
  error: string | null = null;
  suggestions: EnrichmentSuggestion[] = [];

  filtersForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private notification: NotificationService
  ) {
    this.filtersForm = this.fb.group({
      jobId: ['', Validators.required],
      status: ['pending'],
      minConfidence: [0.6]
    });
  }

  loadSuggestions(): void {
    if (this.filtersForm.invalid) {
      this.filtersForm.markAllAsTouched();
      return;
    }

    const { jobId, status, minConfidence } = this.filtersForm.value;

    this.loading = true;
    this.error = null;

    this.adminService.getEnrichmentSuggestions(jobId, {
      status,
      minConfidence
    }).subscribe({
      next: (response) => {
        this.suggestions = response.suggestions || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading suggestions:', err);
        this.error = 'Vorschläge konnten nicht geladen werden.';
        this.loading = false;
      }
    });
  }

  approveSuggestion(suggestion: EnrichmentSuggestion): void {
    this.reviewSuggestion(suggestion, 'approved');
  }

  rejectSuggestion(suggestion: EnrichmentSuggestion): void {
    this.reviewSuggestion(suggestion, 'rejected');
  }

  reviewSuggestion(suggestion: EnrichmentSuggestion, status: 'approved' | 'rejected'): void {
    this.adminService.reviewEnrichmentSuggestion(suggestion.id, status).subscribe({
      next: () => {
        suggestion.status = status;
        this.notification.success(`Vorschlag ${status === 'approved' ? 'genehmigt' : 'abgelehnt'}`, 2500);
      },
      error: (err) => {
        console.error('Error reviewing suggestion:', err);
        this.notification.error('Vorschlag konnte nicht aktualisiert werden.');
      }
    });
  }

  applySuggestion(suggestion: EnrichmentSuggestion): void {
    this.adminService.applyEnrichmentSuggestion(suggestion.id).subscribe({
      next: () => {
        suggestion.status = 'applied';
        this.notification.success('Vorschlag angewendet', 2500);
      },
      error: (err) => {
        console.error('Error applying suggestion:', err);
        this.notification.error('Vorschlag konnte nicht angewendet werden.');
      }
    });
  }

  formatConfidence(value: number): string {
    return `${Math.round(value * 100)}%`;
  }
}
