import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Clipboard } from '@angular/cdk/clipboard';

import { MaterialModule } from '@modules/material.module';
import { NotificationService } from '@core/services/notification.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import {
  ChoirApiToken,
  ChoirApiTokenScope,
  ChoirApiTokenSecret,
  ChoirApiTokenService,
} from '@core/services/choir-api-token.service';

interface ScopeOption {
  value: ChoirApiTokenScope;
  label: string;
  description: string;
  write?: boolean;
}

@Component({
  selector: 'app-api-tokens',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './api-tokens.component.html',
  styleUrls: ['./api-tokens.component.scss'],
})
export class ApiTokensComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private service = inject(ChoirApiTokenService);
  private notification = inject(NotificationService);
  private dialogHelper = inject(DialogHelperService);
  private clipboard = inject(Clipboard);

  readonly displayedColumns = ['label', 'scopes', 'expiresAt', 'lastUsedAt', 'actions'];
  readonly validDayOptions = [7, 30, 60, 90];

  readonly readScopes: ScopeOption[] = [
    { value: 'events:read', label: 'Termine', description: 'Nächste und vergangene Proben und Gottesdienste' },
    { value: 'repertoire:read', label: 'Repertoire', description: 'Stücke, Status und Sammlungen' },
    { value: 'search:read', label: 'Suche', description: 'Titel-, Text- und Personensuche' },
    { value: 'plan:read', label: 'Dienstplan', description: 'Wer hat Leitung und Orgel (ohne Verfügbarkeiten)' },
    { value: 'stats:read', label: 'Statistik', description: 'Zuletzt gesungen, Häufigkeiten, Vorschläge' },
  ];

  readonly writeScope: ScopeOption = {
    value: 'events:write',
    label: 'Liederliste ändern',
    description: 'Erlaubt das Setzen der gesungenen Stücke eines Termins – nur nach Vorschau und Bestätigung.',
    write: true,
  };

  tokens: ChoirApiToken[] = [];
  maxDays = 90;
  maxPerChoir = 5;
  writeEnabled = true;
  isLoading = false;
  hasLoadError = false;

  createForm!: FormGroup;
  isCreating = false;
  revealedSecret: string | null = null;
  revealedLabel: string | null = null;

  ngOnInit(): void {
    this.createForm = this.fb.group({
      label: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      validDays: [90, Validators.required],
      scopes: [this.readScopes.map(s => s.value), Validators.required],
      allowWrite: [false],
      writeConsent: [false],
    });
    this.load();
  }

  get activeTokenCount(): number {
    return this.tokens.filter(t => t.active).length;
  }

  get limitReached(): boolean {
    return this.activeTokenCount >= this.maxPerChoir;
  }

  get writeSelected(): boolean {
    return Boolean(this.createForm?.get('allowWrite')?.value);
  }

  get canSubmit(): boolean {
    if (this.createForm.invalid || this.isCreating || this.limitReached) return false;
    if (this.writeSelected && !this.createForm.get('writeConsent')?.value) return false;
    return true;
  }

  load(): void {
    this.isLoading = true;
    this.hasLoadError = false;
    this.service.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.tokens = result.tokens;
          this.maxDays = result.limits.maxDays;
          this.maxPerChoir = result.limits.maxPerChoir;
          this.writeEnabled = result.limits.writeEnabled;
          this.isLoading = false;
        },
        error: () => {
          this.hasLoadError = true;
          this.isLoading = false;
        },
      });
  }

  onWriteToggle(checked: boolean): void {
    const scopes: ChoirApiTokenScope[] = this.createForm.get('scopes')?.value ?? [];
    const withoutWrite = scopes.filter(s => s !== 'events:write');
    this.createForm.patchValue({
      scopes: checked ? [...withoutWrite, 'events:write'] : withoutWrite,
      writeConsent: false,
    });
  }

  create(): void {
    if (!this.canSubmit) return;
    this.isCreating = true;
    const value = this.createForm.value;
    this.service.create({
      label: value.label,
      scopes: value.scopes,
      validDays: value.validDays,
      allowWrite: value.allowWrite,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: secret => {
          this.isCreating = false;
          this.showSecret(secret);
          this.createForm.patchValue({ label: '', allowWrite: false, writeConsent: false, scopes: this.readScopes.map(s => s.value) });
          this.load();
        },
        error: err => {
          this.isCreating = false;
          this.notification.error(err?.error?.message || 'Der Token konnte nicht erstellt werden.');
        },
      });
  }

  renew(token: ChoirApiToken): void {
    this.service.renew(token.id, this.maxDays)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success(`Laufzeit von "${token.label}" um ${this.maxDays} Tage verlängert.`);
          this.load();
        },
        error: err => this.notification.error(err?.error?.message || 'Der Token konnte nicht verlängert werden.'),
      });
  }

  rotate(token: ChoirApiToken): void {
    this.dialogHelper.confirm({
      title: 'Geheimnis neu erzeugen?',
      message: `Der bisherige Token von "${token.label}" wird sofort ungültig. Du musst den verbundenen Dienst neu einrichten.`,
      confirmButtonText: 'Neu erzeugen',
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.service.rotate(token.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: secret => {
              this.showSecret(secret);
              this.load();
            },
            error: err => this.notification.error(err?.error?.message || 'Der Token konnte nicht neu erzeugt werden.'),
          });
      });
  }

  revoke(token: ChoirApiToken): void {
    this.dialogHelper.confirm({
      title: 'Token widerrufen?',
      message: `"${token.label}" verliert sofort jeden Zugriff auf die Chordaten. Das lässt sich nicht rückgängig machen.`,
      confirmButtonText: 'Widerrufen',
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.service.revoke(token.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notification.success(`"${token.label}" wurde widerrufen.`);
              this.load();
            },
            error: err => this.notification.error(err?.error?.message || 'Der Token konnte nicht widerrufen werden.'),
          });
      });
  }

  copySecret(): void {
    if (!this.revealedSecret) return;
    this.clipboard.copy(this.revealedSecret);
    this.notification.success('Token in die Zwischenablage kopiert.');
  }

  dismissSecret(): void {
    this.revealedSecret = null;
    this.revealedLabel = null;
  }

  daysUntilExpiry(token: ChoirApiToken): number {
    return Math.ceil((new Date(token.expiresAt).getTime() - Date.now()) / 86400000);
  }

  expiresSoon(token: ChoirApiToken): boolean {
    return token.active && this.daysUntilExpiry(token) <= 7;
  }

  scopeLabel(scope: ChoirApiTokenScope): string {
    return [...this.readScopes, this.writeScope].find(s => s.value === scope)?.label ?? scope;
  }

  private showSecret(secret: ChoirApiTokenSecret): void {
    this.revealedSecret = secret.token;
    this.revealedLabel = secret.label;
  }
}
