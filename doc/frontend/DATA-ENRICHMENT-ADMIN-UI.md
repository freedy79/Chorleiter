# Data Enrichment Agent - Admin UI Spezifikation

**Frontend-Implementierung für Admin-Bereich**  
**Erstellt**: 13. Februar 2026  
**Status**: Spezifikation  

---

## 📐 Übersicht

Die Data-Enrichment-Funktionalität wird als **eigenständige Sektion im Admin-Bereich** integriert, ähnlich wie "System-Settings" oder "Mail Management". Alle Konfigurationen (inkl. API-Keys) erfolgen über die Web-UI.

---

## 🗺️ Navigation & Routing

### Admin-Route hinzufügen

```typescript
// choir-app-frontend/src/app/features/admin/admin.routes.ts

export const adminRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // ... existing routes ...
      
      // 🆕 Data Enrichment
      {
        path: 'data-enrichment',
        loadComponent: () => import('./data-enrichment/data-enrichment.component').then(m => m.DataEnrichmentComponent),
        data: { title: 'Admin – Data Enrichment' }
      },
    ],
  },
];
```

### Admin-Dashboard Integration

```typescript
// choir-app-frontend/src/app/features/admin/admin-dashboard/admin-dashboard.component.ts

adminSections: AdminSection[] = [
  // ... existing sections ...
  
  {
    id: 'data-enrichment',
    label: 'Data Enrichment',
    icon: 'auto_fix_high',  // oder 'intelligence', 'psychology'
    route: '/admin/data-enrichment',
    description: 'KI-gestützte Metadaten-Anreicherung',
    category: 'content',  // oder 'system'
    badge: 0  // Anzahl offener Suggestions (wird dynamisch geladen)
  },
];
```

---

## 🎨 Component-Struktur

### Haupt-Component (Tabs)

```typescript
// choir-app-frontend/src/app/features/admin/data-enrichment/data-enrichment.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { ResponsiveService } from '@shared/services/responsive.service';
import { DataEnrichmentService } from '@core/services/data-enrichment.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { EnrichmentDashboardComponent } from './dashboard/enrichment-dashboard.component';
import { EnrichmentSettingsComponent } from './settings/enrichment-settings.component';
import { SuggestionListComponent } from './suggestions/suggestion-list.component';
import { JobListComponent } from './jobs/job-list.component';

@Component({
  selector: 'app-data-enrichment',
  templateUrl: './data-enrichment.component.html',
  styleUrls: ['./data-enrichment.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatBadgeModule,
    EnrichmentDashboardComponent,
    EnrichmentSettingsComponent,
    SuggestionListComponent,
    JobListComponent
  ]
})
export class DataEnrichmentComponent implements OnInit, OnDestroy {
  selectedTabIndex = 0;
  isMobile$: Observable<boolean>;
  
  pendingSuggestionsCount = 0;
  runningJobsCount = 0;
  
  private destroy$ = new Subject<void>();

  constructor(
    private responsive: ResponsiveService,
    private enrichmentService: DataEnrichmentService
  ) {
    this.isMobile$ = responsive.isHandset$;
  }

  ngOnInit(): void {
    this.loadBadgeCounts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBadgeCounts(): void {
    // Lade Anzahl offener Suggestions
    this.enrichmentService.getPendingSuggestionsCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.pendingSuggestionsCount = count;
      });
    
    // Lade Anzahl laufender Jobs
    this.enrichmentService.getRunningJobsCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.runningJobsCount = count;
      });
  }

  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }
}
```

### Template

```html
<!-- choir-app-frontend/src/app/features/admin/data-enrichment/data-enrichment.component.html -->

<div class="data-enrichment-container">
  <div class="header">
    <h1>
      <mat-icon>auto_fix_high</mat-icon>
      Data Enrichment Agent
    </h1>
    <p class="subtitle">
      KI-gestützte Metadaten-Anreicherung für Stücke, Komponisten und Verlage
    </p>
  </div>

  <mat-tab-group 
    [(selectedIndex)]="selectedTabIndex"
    (selectedIndexChange)="onTabChange($event)"
    [class.mobile]="isMobile$ | async"
    animationDuration="300ms">
    
    <!-- Dashboard Tab -->
    <mat-tab>
      <ng-template mat-tab-label>
        <mat-icon>dashboard</mat-icon>
        <span class="tab-label">Dashboard</span>
      </ng-template>
      <app-enrichment-dashboard></app-enrichment-dashboard>
    </mat-tab>

    <!-- Suggestions Tab -->
    <mat-tab>
      <ng-template mat-tab-label>
        <mat-icon [matBadge]="pendingSuggestionsCount" 
                  [matBadgeHidden]="pendingSuggestionsCount === 0"
                  matBadgeColor="accent">
          fact_check
        </mat-icon>
        <span class="tab-label">Vorschläge</span>
      </ng-template>
      <app-suggestion-list></app-suggestion-list>
    </mat-tab>

    <!-- Jobs Tab -->
    <mat-tab>
      <ng-template mat-tab-label>
        <mat-icon [matBadge]="runningJobsCount" 
                  [matBadgeHidden]="runningJobsCount === 0"
                  matBadgeColor="warn">
          work_history
        </mat-icon>
        <span class="tab-label">Jobs</span>
      </ng-template>
      <app-job-list></app-job-list>
    </mat-tab>

    <!-- Settings Tab -->
    <mat-tab>
      <ng-template mat-tab-label>
        <mat-icon>settings</mat-icon>
        <span class="tab-label">Einstellungen</span>
      </ng-template>
      <app-enrichment-settings></app-enrichment-settings>
    </mat-tab>

  </mat-tab-group>
</div>
```

---

## ⚙️ Settings Component (Provider & API-Keys)

### TypeScript

```typescript
// choir-app-frontend/src/app/features/admin/data-enrichment/settings/enrichment-settings.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { DataEnrichmentService } from '@core/services/data-enrichment.service';
import { SnackbarService } from '@core/services/snackbar.service';
import { ProviderIconComponent } from '../shared/provider-icon.component';

interface ProviderConfig {
  name: string;
  enabled: boolean;
  apiKey: string;
  model: string;
  priority: number;
  maxRequestsPerDay: number;
}

interface EnrichmentSettings {
  strategy: 'dual' | 'cascading' | 'budget-optimizer';
  monthlyBudget: number;
  schedule: {
    enabled: boolean;
    cron: string;
    maxItemsPerRun: number;
  };
  providers: ProviderConfig[];
  autoApprove: {
    enabled: boolean;
    minConfidence: number;
  };
}

@Component({
  selector: 'app-enrichment-settings',
  templateUrl: './enrichment-settings.component.html',
  styleUrls: ['./enrichment-settings.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatExpansionModule,
    MatChipsModule,
    ProviderIconComponent
  ]
})
export class EnrichmentSettingsComponent implements OnInit {
  settingsForm!: FormGroup;
  loading = false;
  saving = false;
  testingConnection = false;

  strategyOptions = [
    { value: 'dual', label: 'Dual-Provider (Günstig + Fallback)', description: 'Empfohlen für beste Qualität bei minimalen Kosten' },
    { value: 'cascading', label: 'Cascading Fallback', description: 'Automatischer Fallback bei Fehlern' },
    { value: 'budget-optimizer', label: 'Budget-Optimizer', description: 'Dynamische Provider-Auswahl basierend auf Budget' }
  ];

  providerTemplates = [
    {
      name: 'gemini',
      displayName: 'Google Gemini',
      defaultModel: 'gemini-1.5-flash',
      models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
      costPerPiece: 0.000035,
      keyPlaceholder: 'AIza...',
      setupUrl: 'https://makersuite.google.com/app/apikey'
    },
    {
      name: 'claude',
      displayName: 'Anthropic Claude',
      defaultModel: 'claude-3-5-sonnet-20241022',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
      costPerPiece: 0.001667,
      keyPlaceholder: 'sk-ant-...',
      setupUrl: 'https://console.anthropic.com/'
    },
    {
      name: 'openai',
      displayName: 'OpenAI',
      defaultModel: 'gpt-4o-mini',
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
      costPerPiece: 0.000071,
      keyPlaceholder: 'sk-proj-...',
      setupUrl: 'https://platform.openai.com/api-keys'
    },
    {
      name: 'deepseek',
      displayName: 'DeepSeek',
      defaultModel: 'deepseek-chat',
      models: ['deepseek-chat'],
      costPerPiece: 0.000044,
      keyPlaceholder: 'sk-...',
      setupUrl: 'https://platform.deepseek.com/'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private enrichmentService: DataEnrichmentService,
    private snackbar: SnackbarService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadSettings();
  }

  initForm(): void {
    this.settingsForm = this.fb.group({
      strategy: ['dual', Validators.required],
      monthlyBudget: [25, [Validators.required, Validators.min(1)]],
      schedule: this.fb.group({
        enabled: [true],
        cron: ['0 2 * * *', Validators.required],
        maxItemsPerRun: [200, [Validators.required, Validators.min(1)]]
      }),
      providers: this.fb.array([]),
      autoApprove: this.fb.group({
        enabled: [false],
        minConfidence: [0.95, [Validators.required, Validators.min(0), Validators.max(1)]]
      })
    });
  }

  get providersArray(): FormArray {
    return this.settingsForm.get('providers') as FormArray;
  }

  loadSettings(): void {
    this.loading = true;
    this.enrichmentService.getSettings().subscribe({
      next: (settings: EnrichmentSettings) => {
        this.settingsForm.patchValue({
          strategy: settings.strategy,
          monthlyBudget: settings.monthlyBudget,
          schedule: settings.schedule,
          autoApprove: settings.autoApprove
        });

        // Clear existing providers
        while (this.providersArray.length) {
          this.providersArray.removeAt(0);
        }

        // Add provider configs
        settings.providers.forEach(provider => {
          this.providersArray.push(this.createProviderFormGroup(provider));
        });

        this.loading = false;
      },
      error: (error) => {
        this.snackbar.error('Fehler beim Laden der Einstellungen');
        this.loading = false;
      }
    });
  }

  createProviderFormGroup(provider?: ProviderConfig): FormGroup {
    return this.fb.group({
      name: [provider?.name || '', Validators.required],
      enabled: [provider?.enabled ?? false],
      apiKey: [provider?.apiKey || '', Validators.required],
      model: [provider?.model || '', Validators.required],
      priority: [provider?.priority || 1, [Validators.required, Validators.min(1)]],
      maxRequestsPerDay: [provider?.maxRequestsPerDay || 1000, [Validators.required, Validators.min(1)]]
    });
  }

  addProvider(providerName: string): void {
    const template = this.providerTemplates.find(p => p.name === providerName);
    if (!template) return;

    const newProvider = this.createProviderFormGroup({
      name: providerName,
      enabled: true,
      apiKey: '',
      model: template.defaultModel,
      priority: this.providersArray.length + 1,
      maxRequestsPerDay: 1000
    });

    this.providersArray.push(newProvider);
  }

  removeProvider(index: number): void {
    this.providersArray.removeAt(index);
  }

  getProviderTemplate(name: string) {
    return this.providerTemplates.find(p => p.name === name);
  }

  testConnection(index: number): void {
    const provider = this.providersArray.at(index).value;
    
    if (!provider.apiKey) {
      this.snackbar.error('Bitte API-Key eingeben');
      return;
    }

    this.testingConnection = true;
    this.enrichmentService.testProviderConnection(provider).subscribe({
      next: (result) => {
        if (result.success) {
          this.snackbar.success(`✓ Verbindung zu ${provider.name} erfolgreich`);
        } else {
          this.snackbar.error(`✗ Verbindung fehlgeschlagen: ${result.error}`);
        }
        this.testingConnection = false;
      },
      error: (error) => {
        this.snackbar.error('Verbindungstest fehlgeschlagen');
        this.testingConnection = false;
      }
    });
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.snackbar.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    this.saving = true;
    const settings: EnrichmentSettings = this.settingsForm.value;

    this.enrichmentService.saveSettings(settings).subscribe({
      next: () => {
        this.snackbar.success('Einstellungen gespeichert');
        this.saving = false;
      },
      error: (error) => {
        this.snackbar.error('Fehler beim Speichern');
        this.saving = false;
      }
    });
  }

  estimateMonthlyCosts(): number {
    // Berechne geschätzte monatliche Kosten basierend auf Konfiguration
    const primaryProvider = this.providersArray.controls
      .find(p => p.value.enabled && p.value.priority === 1)?.value;
    
    if (!primaryProvider) return 0;

    const template = this.getProviderTemplate(primaryProvider.name);
    if (!template) return 0;

    // Annahme: 100 neue Stücke pro Monat
    const piecesPerMonth = 100;
    return piecesPerMonth * template.costPerPiece;
  }
}
```

### Template (Settings)

```html
<!-- enrichment-settings.component.html -->

<div class="settings-container" *ngIf="!loading">
  <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()">

    <!-- General Settings Card -->
    <mat-card>
      <mat-card-header>
        <mat-card-title>
          <mat-icon>tune</mat-icon>
          Allgemeine Einstellungen
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        
        <!-- Strategy -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Provider-Strategie</mat-label>
          <mat-select formControlName="strategy">
            <mat-option *ngFor="let option of strategyOptions" [value]="option.value">
              <div class="strategy-option">
                <strong>{{ option.label }}</strong>
                <small>{{ option.description }}</small>
              </div>
            </mat-option>
          </mat-select>
          <mat-hint>Wie sollen mehrere Provider genutzt werden?</mat-hint>
        </mat-form-field>

        <!-- Monthly Budget -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Monatliches Budget (USD)</mat-label>
          <input matInput type="number" formControlName="monthlyBudget" min="1" step="5">
          <span matPrefix>$&nbsp;</span>
          <mat-hint>
            Geschätzte Kosten: ${{ estimateMonthlyCosts() | number:'1.2-2' }}/Monat
            <span class="cost-hint" *ngIf="estimateMonthlyCosts() < settingsForm.value.monthlyBudget">
              ({{ (estimateMonthlyCosts() / settingsForm.value.monthlyBudget * 100) | number:'1.0-0' }}% des Budgets)
            </span>
          </mat-hint>
        </mat-form-field>

        <!-- Schedule -->
        <div formGroupName="schedule" class="schedule-group">
          <h3>Zeitplan</h3>
          
          <mat-slide-toggle formControlName="enabled" color="primary">
            Automatische Jobs aktiviert
          </mat-slide-toggle>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cron-Ausdruck</mat-label>
            <input matInput formControlName="cron" placeholder="0 2 * * *">
            <mat-hint>Format: Minute Stunde Tag Monat Wochentag (aktuell: täglich 02:00)</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Max. Items pro Durchlauf</mat-label>
            <input matInput type="number" formControlName="maxItemsPerRun" min="1">
            <mat-hint>Begrenzt die Anzahl verarbeiteter Stücke pro Job</mat-hint>
          </mat-form-field>
        </div>

        <!-- Auto-Approve -->
        <div formGroupName="autoApprove" class="auto-approve-group">
          <h3>Automatische Übernahme</h3>
          
          <mat-slide-toggle formControlName="enabled" color="primary">
            Auto-Approve aktiviert
          </mat-slide-toggle>

          <mat-form-field appearance="outline" class="full-width" *ngIf="settingsForm.value.autoApprove.enabled">
            <mat-label>Minimale Confidence (0.0 - 1.0)</mat-label>
            <input matInput type="number" formControlName="minConfidence" min="0" max="1" step="0.05">
            <mat-hint>Vorschläge mit höherem Confidence-Score werden automatisch übernommen</mat-hint>
          </mat-form-field>

          <mat-hint class="warning-hint" *ngIf="settingsForm.value.autoApprove.enabled">
            ⚠️ Vorsicht: Änderungen werden ohne Review übernommen!
          </mat-hint>
        </div>

      </mat-card-content>
    </mat-card>

    <!-- Providers Card -->
    <mat-card>
      <mat-card-header>
        <mat-card-title>
          <mat-icon>cloud</mat-icon>
          LLM Provider
        </mat-card-title>
        <mat-card-subtitle>
          Konfiguriere API-Zugriff für KI-Modelle (API-Keys werden verschlüsselt gespeichert)
        </mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>

        <!-- Existing Providers -->
        <mat-accordion formArrayName="providers">
          <mat-expansion-panel *ngFor="let provider of providersArray.controls; let i = index" [formGroupName]="i">
            
            <mat-expansion-panel-header>
              <mat-panel-title>
                <app-provider-icon [provider]="provider.value.name"></app-provider-icon>
                <span class="provider-name">{{ getProviderTemplate(provider.value.name)?.displayName }}</span>
                <mat-chip [class.enabled]="provider.value.enabled" [class.disabled]="!provider.value.enabled">
                  {{ provider.value.enabled ? 'Aktiv' : 'Inaktiv' }}
                </mat-chip>
              </mat-panel-title>
              <mat-panel-description>
                Priorität {{ provider.value.priority }} • 
                Kosten: ${{ getProviderTemplate(provider.value.name)?.costPerPiece | number:'1.6-6' }}/Stück
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="provider-config">
              
              <!-- Enabled Toggle -->
              <mat-slide-toggle formControlName="enabled" color="primary">
                Provider aktiviert
              </mat-slide-toggle>

              <!-- API Key -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>API-Key</mat-label>
                <input matInput type="password" formControlName="apiKey" 
                       [placeholder]="getProviderTemplate(provider.value.name)?.keyPlaceholder || ''">
                <button mat-icon-button matSuffix type="button"
                        [matTooltip]="'API-Key besorgen'"
                        (click)="window.open(getProviderTemplate(provider.value.name)?.setupUrl, '_blank')">
                  <mat-icon>open_in_new</mat-icon>
                </button>
                <mat-hint>Wird verschlüsselt gespeichert</mat-hint>
              </mat-form-field>

              <!-- Model Selection -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Modell</mat-label>
                <mat-select formControlName="model">
                  <mat-option *ngFor="let model of getProviderTemplate(provider.value.name)?.models" [value]="model">
                    {{ model }}
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Priority -->
              <mat-form-field appearance="outline">
                <mat-label>Priorität</mat-label>
                <input matInput type="number" formControlName="priority" min="1">
                <mat-hint>Niedrigere Zahl = höhere Priorität</mat-hint>
              </mat-form-field>

              <!-- Rate Limit -->
              <mat-form-field appearance="outline">
                <mat-label>Max. Requests/Tag</mat-label>
                <input matInput type="number" formControlName="maxRequestsPerDay" min="1">
              </mat-form-field>

              <!-- Actions -->
              <div class="provider-actions">
                <button mat-raised-button type="button" color="accent"
                        (click)="testConnection(i)"
                        [disabled]="!provider.value.apiKey || testingConnection">
                  <mat-icon>wifi_tethering</mat-icon>
                  Verbindung testen
                </button>
                <button mat-button type="button" color="warn"
                        (click)="removeProvider(i)">
                  <mat-icon>delete</mat-icon>
                  Entfernen
                </button>
              </div>

            </div>

          </mat-expansion-panel>
        </mat-accordion>

        <!-- Add Provider -->
        <div class="add-provider-section">
          <h3>Provider hinzufügen</h3>
          <div class="provider-templates">
            <button mat-raised-button type="button" 
                    *ngFor="let template of providerTemplates"
                    [disabled]="providersArray.controls.some(p => p.value.name === template.name)"
                    (click)="addProvider(template.name)">
              <app-provider-icon [provider]="template.name"></app-provider-icon>
              {{ template.displayName }}
            </button>
          </div>
        </div>

      </mat-card-content>
    </mat-card>

    <!-- Save Button -->
    <div class="actions">
      <button mat-raised-button color="primary" type="submit" [disabled]="saving || settingsForm.invalid">
        <mat-icon>save</mat-icon>
        Einstellungen speichern
      </button>
    </div>

  </form>
</div>

<div class="loading-container" *ngIf="loading">
  <mat-spinner></mat-spinner>
  <p>Lade Einstellungen...</p>
</div>
```

---

## 📊 Dashboard Component (Statistiken)

### TypeScript

```typescript
// enrichment-dashboard.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { DataEnrichmentService } from '@core/services/data-enrichment.service';
import { interval, Subject } from 'rxjs';
import { takeUntil, startWith, switchMap } from 'rxjs/operators';
import { StatsCardComponent } from './stats-card.component';

interface DashboardStats {
  currentMonth: {
    apiCosts: number;
    budgetLimit: number;
    itemsProcessed: number;
    successRate: number;
    avgConfidence: number;
  };
  suggestions: {
    pending: number;
    approved: number;
    rejected: number;
    autoApplied: number;
  };
  jobs: {
    lastRun: Date | null;
    nextRun: Date | null;
    running: number;
    failed: number;
  };
  byProvider: Array<{
    name: string;
    requests: number;
    cost: number;
    successRate: number;
  }>;
}

@Component({
  selector: 'app-enrichment-dashboard',
  templateUrl: './enrichment-dashboard.component.html',
  styleUrls: ['./enrichment-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    StatsCardComponent
  ]
})
export class EnrichmentDashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  loading = true;
  
  private destroy$ = new Subject<void>();

  constructor(private enrichmentService: DataEnrichmentService) {}

  ngOnInit(): void {
    // Lade Stats initial und dann alle 30 Sekunden
    interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.enrichmentService.getDashboardStats()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (stats) => {
          this.stats = stats;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard stats:', error);
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get budgetPercentage(): number {
    if (!this.stats) return 0;
    return (this.stats.currentMonth.apiCosts / this.stats.currentMonth.budgetLimit) * 100;
  }

  get budgetStatus(): 'normal' | 'warning' | 'critical' {
    const pct = this.budgetPercentage;
    if (pct >= 90) return 'critical';
    if (pct >= 75) return 'warning';
    return 'normal';
  }

  runManualJob(): void {
    // TODO: Implementierung
  }
}
```

### Template (Dashboard)

```html
<!-- enrichment-dashboard.component.html -->

<div class="dashboard-container" *ngIf="!loading && stats">
  
  <!-- Top Stats Row -->
  <div class="stats-grid">
    
    <!-- Budget Card -->
    <app-stats-card 
      icon="account_balance_wallet" 
      [iconColor]="budgetStatus === 'critical' ? 'warn' : (budgetStatus === 'warning' ? 'accent' : 'primary')"
      title="API-Kosten (Monat)"
      [value]="stats.currentMonth.apiCosts | currency:'USD':'symbol':'1.2-2'"
      [subtitle]="'von ' + (stats.currentMonth.budgetLimit | currency:'USD':'symbol':'1.2-2')">
      <div card-content>
        <mat-progress-bar 
          mode="determinate" 
          [value]="budgetPercentage"
          [color]="budgetStatus === 'critical' ? 'warn' : (budgetStatus === 'warning' ? 'accent' : 'primary')">
        </mat-progress-bar>
        <p class="progress-label">{{ budgetPercentage | number:'1.1-1' }}% verbraucht</p>
      </div>
    </app-stats-card>

    <!-- Items Processed Card -->
    <app-stats-card 
      icon="auto_fix_high" 
      iconColor="primary"
      title="Verarbeitete Items"
      [value]="stats.currentMonth.itemsProcessed"
      subtitle="Diesen Monat">
      <div card-content>
        <p class="stat-detail">
          <mat-icon>check_circle</mat-icon>
          {{ stats.currentMonth.successRate | percent:'1.0-0' }} Erfolgsrate
        </p>
        <p class="stat-detail">
          <mat-icon>psychology</mat-icon>
          ⌀ {{ stats.currentMonth.avgConfidence | number:'1.2-2' }} Confidence
        </p>
      </div>
    </app-stats-card>

    <!-- Pending Suggestions Card -->
    <app-stats-card 
      icon="fact_check" 
      [iconColor]="stats.suggestions.pending > 0 ? 'accent' : 'primary'"
      title="Offene Vorschläge"
      [value]="stats.suggestions.pending"
      subtitle="Warten auf Review">
      <div card-content>
        <div class="suggestion-breakdown">
          <span class="approved">✓ {{ stats.suggestions.approved }} angenommen</span>
          <span class="rejected">✗ {{ stats.suggestions.rejected }} abgelehnt</span>
          <span class="auto" *ngIf="stats.suggestions.autoApplied > 0">
            ⚡ {{ stats.suggestions.autoApplied }} auto
          </span>
        </div>
      </div>
    </app-stats-card>

    <!-- Jobs Status Card -->
    <app-stats-card 
      icon="work_history" 
      [iconColor]="stats.jobs.running > 0 ? 'accent' : 'primary'"
      title="Jobs"
      [value]="stats.jobs.running > 0 ? 'Läuft gerade' : 'Idle'"
      [subtitle]="stats.jobs.nextRun ? ('Nächster Lauf: ' + (stats.jobs.nextRun | date:'short')) : ''">
      <div card-content>
        <p class="stat-detail" *ngIf="stats.jobs.lastRun">
          <mat-icon>schedule</mat-icon>
          Letzter Lauf: {{ stats.jobs.lastRun | date:'short' }}
        </p>
        <p class="stat-detail error" *ngIf="stats.jobs.failed > 0">
          <mat-icon>error</mat-icon>
          {{ stats.jobs.failed }} fehlgeschlagen
        </p>
      </div>
    </app-stats-card>

  </div>

  <!-- Provider Stats -->
  <mat-card class="provider-stats-card">
    <mat-card-header>
      <mat-card-title>
        <mat-icon>cloud</mat-icon>
        Provider-Statistiken
      </mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <div class="provider-stats-grid">
        <div class="provider-stat" *ngFor="let provider of stats.byProvider">
          <div class="provider-header">
            <app-provider-icon [provider]="provider.name"></app-provider-icon>
            <h3>{{ provider.name }}</h3>
          </div>
          <div class="provider-metrics">
            <div class="metric">
              <span class="label">Requests:</span>
              <span class="value">{{ provider.requests }}</span>
            </div>
            <div class="metric">
              <span class="label">Kosten:</span>
              <span class="value">{{ provider.cost | currency:'USD':'symbol':'1.4-4' }}</span>
            </div>
            <div class="metric">
              <span class="label">Erfolgsrate:</span>
              <span class="value">{{ provider.successRate | percent:'1.0-0' }}</span>
            </div>
          </div>
        </div>
      </div>
    </mat-card-content>
  </mat-card>

  <!-- Quick Actions -->
  <mat-card class="quick-actions-card">
    <mat-card-header>
      <mat-card-title>
        <mat-icon>flash_on</mat-icon>
        Schnellzugriff
      </mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <div class="quick-actions">
        <button mat-raised-button color="primary" (click)="runManualJob()">
          <mat-icon>play_arrow</mat-icon>
          Manuellen Job starten
        </button>
        <button mat-raised-button [routerLink]="['..', 1]">
          <mat-icon>fact_check</mat-icon>
          Vorschläge reviewen ({{ stats.suggestions.pending }})
        </button>
        <button mat-raised-button [routerLink]="['..', 2]">
          <mat-icon>history</mat-icon>
          Job-Historie ansehen
        </button>
      </div>
    </mat-card-content>
  </mat-card>

</div>

<div class="loading-container" *ngIf="loading">
  <mat-spinner></mat-spinner>
  <p>Lade Dashboard...</p>
</div>
```

---

## 🔌 Backend-Endpoints

### Settings Endpoints

```javascript
// choir-app-backend/src/routes/admin.routes.js

router.get('/enrichment/settings', 
    verifyToken, 
    requireAdmin, 
    asyncHandler(enrichmentController.getSettings)
);

router.put('/enrichment/settings', 
    verifyToken, 
    requireAdmin, 
    asyncHandler(enrichmentController.saveSettings)
);

router.post('/enrichment/settings/test-provider', 
    verifyToken, 
    requireAdmin, 
    asyncHandler(enrichmentController.testProviderConnection)
);
```

### Controller Implementation

```javascript
// choir-app-backend/src/controllers/admin/data-enrichment.controller.js

const { encryptApiKey, decryptApiKey } = require('../../config/encryption');
const db = require('../../models');
const llmRouter = require('../../services/enrichment/llm/llm-router.service');

exports.getSettings = async (req, res) => {
    const settings = await db.data_enrichment_setting.findOne({
        where: { settingKey: 'llm_config' }
    });

    if (!settings) {
        return res.json({
            strategy: 'dual',
            monthlyBudget: 25.00,
            schedule: {
                enabled: true,
                cron: '0 2 * * *',
                maxItemsPerRun: 200
            },
            providers: [],
            autoApprove: {
                enabled: false,
                minConfidence: 0.95
            }
        });
    }

    const config = settings.settingValue;

    // Decrypt API-Keys für Anzeige (nur erste/letzte 4 Zeichen)
    config.providers = config.providers.map(p => ({
        ...p,
        apiKey: p.apiKey ? maskApiKey(decryptApiKey(p.apiKey)) : ''
    }));

    res.json(config);
};

exports.saveSettings = async (req, res) => {
    const config = req.body;

    // Encrypt API-Keys vor Speicherung
    config.providers = config.providers.map(p => ({
        ...p,
        apiKey: p.apiKey ? encryptApiKey(p.apiKey) : ''
    }));

    await db.data_enrichment_setting.upsert({
        settingKey: 'llm_config',
        settingValue: config
    });

    // Reinitialize LLM Router mit neuer Config
    await llmRouter.initialize();

    res.json({ success: true });
};

exports.testProviderConnection = async (req, res) => {
    const { name, apiKey, model } = req.body;

    try {
        // Temporärer Provider-Test ohne DB-Speicherung
        const Provider = require(`../../services/enrichment/llm/providers/${name}-provider.service`);
        const provider = new Provider({ apiKey, model });
        
        const connected = await provider.testConnection();

        res.json({ 
            success: connected,
            error: connected ? null : 'Connection failed'
        });
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
};

function maskApiKey(key) {
    if (!key || key.length < 8) return '****';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}
```

---

## 🔐 Sicherheit

### Master Encryption Key

```powershell
# Backend .env
# Generiere 32-byte Key (256-bit)
MASTER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Generator (einmalig ausführen):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Encryption Service

```javascript
// choir-app-backend/src/config/encryption.js

const crypto = require('crypto');

if (!process.env.MASTER_ENCRYPTION_KEY) {
    throw new Error('MASTER_ENCRYPTION_KEY not set in environment');
}

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.MASTER_ENCRYPTION_KEY, 'hex');

if (KEY.length !== 32) {
    throw new Error('MASTER_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
}

function encryptApiKey(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptApiKey(encryptedString) {
    const [ivHex, authTagHex, encrypted] = encryptedString.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

module.exports = { encryptApiKey, decryptApiKey };
```

---

## 📱 Responsive Design

### SCSS (Mobile-First)

```scss
// data-enrichment.component.scss

.data-enrichment-container {
  padding: 24px;

  .header {
    margin-bottom: 32px;

    h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 2rem;
      font-weight: 500;
      
      mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
      }
    }

    .subtitle {
      color: var(--text-secondary);
      margin-top: 8px;
    }
  }

  mat-tab-group {
    &.mobile {
      ::ng-deep .mat-mdc-tab-labels {
        justify-content: space-around;

        .mat-mdc-tab-label {
          min-width: 0;
          padding: 0 12px;

          .tab-label {
            display: none;
          }
        }
      }
    }
  }
}

// Settings
.settings-container {
  padding: 16px;

  mat-card {
    margin-bottom: 24px;
  }

  .provider-config {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
    padding: 16px 0;

    .provider-actions {
      grid-column: 1 / -1;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
  }
}

// Dashboard
.dashboard-container {
  padding: 16px;

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .provider-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .quick-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

// Mobile Anpassungen
@media (max-width: 600px) {
  .data-enrichment-container {
    padding: 12px;
  }

  .stats-grid {
    grid-template-columns: 1fr !important;
  }

  .provider-config {
    grid-template-columns: 1fr !important;
  }

  .quick-actions {
    flex-direction: column;

    button {
      width: 100%;
    }
  }
}
```

---

## ✅ Zusammenfassung

### Was wurde spezifiziert

1. ✅ **Vollständige Admin-UI** mit Tabs (Dashboard, Vorschläge, Jobs, Settings)
2. ✅ **Settings-Component** mit Provider-Konfiguration & verschlüsselter API-Key-Speicherung
3. ✅ **Dashboard-Component** mit Live-Statistiken (Kosten, Erfolgsrate, etc.)
4. ✅ **Backend-Endpoints** für Settings-Verwaltung
5. ✅ **Sicherheit**: AES-256-GCM Verschlüsselung für API-Keys
6. ✅ **Responsive Design**: Mobile-First SCSS
7. ✅ **Integration** in bestehende Admin-Struktur

### Nächste Schritte

1. **Service erstellen**: `DataEnrichmentService` im Frontend
2. **Komponenten implementieren**: Settings → Dashboard → Suggestions → Jobs
3. **Backend**: Encryption-Service & Controller implementieren
4. **Testing**: API-Key-Speicherung & Provider-Verbindung testen

---

**Erstellt**: 13. Februar 2026  
**Letzte Aktualisierung**: 13. Februar 2026  
**Status**: Bereit zur Implementierung
