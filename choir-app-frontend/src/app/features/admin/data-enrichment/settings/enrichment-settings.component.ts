import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';

interface ProviderOption {
  name: string;
  label: string;
  free?: boolean;
}

interface ApiKeyInfo {
  configured: boolean;
  maskedKey: string | null;
}

@Component({
  selector: 'app-enrichment-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './enrichment-settings.component.html',
  styleUrls: ['./enrichment-settings.component.scss']
})
export class EnrichmentSettingsComponent implements OnInit {
  loading = true;
  saving = false;
  savingApiKey = false;
  deletingApiKey: string | null = null;
  error: string | null = null;
  apiKeyTestResult: { ok: boolean; message: string } | null = null;

  providers: ProviderOption[] = [
    { name: 'gemini', label: 'Gemini' },
    { name: 'claude', label: 'Claude' },
    { name: 'openai', label: 'OpenAI' }
  ];

  /** Tracks API key status per provider */
  apiKeyStatus: Record<string, ApiKeyInfo> = {};

  settingsForm: FormGroup;
  apiKeyForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private notification: NotificationService
  ) {
    this.settingsForm = this.fb.group({
      primaryProvider: ['gemini', Validators.required],
      fallbackProvider: ['claude', Validators.required],
      routingStrategy: ['dual', Validators.required],
      monthlyBudget: [50, [Validators.required, Validators.min(1)]],
      scheduleCron: ['0 2 * * *', Validators.required],
      autoApproveEnabled: [false],
      autoApproveThreshold: [0.95, [Validators.min(0.5), Validators.max(1)]]
    });

    this.apiKeyForm = this.fb.group({
      provider: ['gemini', Validators.required],
      apiKey: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
    this.loadApiKeyStatus();
  }

  loadSettings(): void {
    this.loading = true;
    this.error = null;

    this.adminService.getEnrichmentSettings().subscribe({
      next: (response) => {
        const settings = response.settings || {};
        this.settingsForm.patchValue({
          primaryProvider: settings.llm_primary_provider?.value ?? 'gemini',
          fallbackProvider: settings.llm_fallback_provider?.value ?? 'claude',
          routingStrategy: settings.llm_routing_strategy?.value ?? 'dual',
          monthlyBudget: Number(settings.enrichment_monthly_budget?.value ?? 50),
          scheduleCron: settings.enrichment_schedule_cron?.value ?? '0 2 * * *',
          autoApproveEnabled: settings.enrichment_auto_approve_enabled?.value ?? false,
          autoApproveThreshold: Number(settings.enrichment_auto_approve_threshold?.value ?? 0.95)
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        this.error = 'Einstellungen konnten nicht geladen werden.';
        this.loading = false;
      }
    });
  }

  loadApiKeyStatus(): void {
    this.adminService.getEnrichmentApiKeyStatus().subscribe({
      next: (response) => {
        this.apiKeyStatus = response.apiKeys || {};
      },
      error: (err) => {
        console.error('Error loading API key status:', err);
      }
    });
  }

  /** Check if a provider has a configured API key */
  hasApiKey(providerName: string): boolean {
    return !!this.apiKeyStatus[providerName]?.configured;
  }

  /** Get the masked key display for a provider */
  getMaskedKey(providerName: string): string {
    return this.apiKeyStatus[providerName]?.maskedKey || '';
  }

  /** Check if any provider has an API key */
  get hasAnyApiKey(): boolean {
    return Object.values(this.apiKeyStatus).some(v => v.configured);
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;

    const values = this.settingsForm.value;
    const updates = [
      this.adminService.updateEnrichmentSetting('llm_primary_provider', values.primaryProvider, 'string'),
      this.adminService.updateEnrichmentSetting('llm_fallback_provider', values.fallbackProvider, 'string'),
      this.adminService.updateEnrichmentSetting('llm_routing_strategy', values.routingStrategy, 'string'),
      this.adminService.updateEnrichmentSetting('enrichment_monthly_budget', values.monthlyBudget, 'number'),
      this.adminService.updateEnrichmentSetting('enrichment_schedule_cron', values.scheduleCron, 'string'),
      this.adminService.updateEnrichmentSetting('enrichment_auto_approve_enabled', values.autoApproveEnabled, 'boolean'),
      this.adminService.updateEnrichmentSetting('enrichment_auto_approve_threshold', values.autoApproveThreshold, 'number')
    ];

    let savedCount = 0;
    updates.forEach(request => {
      request.subscribe({
        next: () => {
          savedCount++;
          if (savedCount === updates.length) {
            this.saving = false;
            this.notification.success('Einstellungen gespeichert', 3000);
          }
        },
        error: (err) => {
          console.error('Error saving settings:', err);
          this.saving = false;
          this.error = err.error?.message || 'Fehler beim Speichern der Einstellungen.';
          this.notification.error(this.error);
        }
      });
    });
  }

  saveApiKey(): void {
    if (this.apiKeyForm.invalid) {
      this.apiKeyForm.markAllAsTouched();
      return;
    }

    const { provider, apiKey } = this.apiKeyForm.value;

    this.savingApiKey = true;
    this.apiKeyTestResult = null;

    this.adminService.setEnrichmentApiKey(provider, apiKey).subscribe({
      next: (response) => {
        this.savingApiKey = false;
        this.apiKeyTestResult = response.connectionTest || { ok: true, message: '' };
        this.notification.success('API-Key geprüft, gespeichert und verschlüsselt', 3000);
        this.apiKeyForm.patchValue({ apiKey: '' });
        // Refresh API key status
        this.loadApiKeyStatus();
      },
      error: (err) => {
        console.error('Error saving API key:', err);
        this.savingApiKey = false;
        this.apiKeyTestResult = err.error?.connectionTest || { ok: false, message: err.error?.message || 'Unbekannter Fehler' };
        this.notification.error(this.apiKeyTestResult!.message || 'API-Key konnte nicht gespeichert werden.');
      }
    });
  }

  deleteApiKey(providerName: string): void {
    this.deletingApiKey = providerName;

    this.adminService.deleteEnrichmentApiKey(providerName).subscribe({
      next: () => {
        this.deletingApiKey = null;
        this.notification.success(`API-Key für ${this.getProviderLabel(providerName)} gelöscht`, 3000);
        this.loadApiKeyStatus();
      },
      error: (err) => {
        console.error('Error deleting API key:', err);
        this.deletingApiKey = null;
        this.notification.error('API-Key konnte nicht gelöscht werden.');
      }
    });
  }

  getProviderLabel(name: string): string {
    return this.providers.find(p => p.name === name)?.label || name;
  }
}
