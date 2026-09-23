import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MaterialModule } from '@modules/material.module';
import { OAuthConsentInfo, OAuthConsentService } from '@core/services/oauth-consent.service';

const SCOPE_LABELS: Record<string, string> = {
  'events:read': 'Termine lesen (Proben und Gottesdienste, inklusive Stücklisten)',
  'repertoire:read': 'Repertoire lesen (Stücke, Status, Sammlungen)',
  'search:read': 'Suchen (Titel, Liedtext, Komponist, Textdichter)',
  'plan:read': 'Dienstplan lesen (wer hat Leitung und Orgel)',
  'stats:read': 'Statistik lesen (zuletzt gesungen, Häufigkeiten)',
  'events:write': 'Liederliste von Terminen ändern',
};

@Component({
  selector: 'app-oauth-consent',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './oauth-consent.component.html',
  styleUrls: ['./oauth-consent.component.scss'],
})
export class OAuthConsentComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private service = inject(OAuthConsentService);

  private params: Record<string, string> = {};

  info: OAuthConsentInfo | null = null;
  selectedChoirId: number | null = null;
  isLoading = true;
  isSubmitting = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.params = { ...this.route.snapshot.queryParams } as Record<string, string>;
    this.service.getConsentInfo(this.params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: info => {
          this.info = info;
          this.selectedChoirId = info.choirs[0]?.id ?? null;
          this.isLoading = false;
        },
        error: err => {
          this.errorMessage = err?.error?.error_description
            || 'Die Zugriffsanfrage ist ungültig oder abgelaufen. Starte die Verbindung im Client neu.';
          this.isLoading = false;
        },
      });
  }

  scopeLabel(scope: string): string {
    return SCOPE_LABELS[scope] ?? scope;
  }

  get canApprove(): boolean {
    return !this.isSubmitting && Boolean(this.selectedChoirId) && (this.info?.choirs.length ?? 0) > 0;
  }

  decide(approved: boolean): void {
    if (approved && !this.canApprove) return;
    this.isSubmitting = true;
    this.service.decide({ ...this.params, approved, choirId: approved ? this.selectedChoirId : null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          // Hand control back to the client that started the flow.
          window.location.href = result.redirectTo;
        },
        error: err => {
          this.isSubmitting = false;
          this.errorMessage = err?.error?.error_description || 'Die Entscheidung konnte nicht übermittelt werden.';
        },
      });
  }
}
