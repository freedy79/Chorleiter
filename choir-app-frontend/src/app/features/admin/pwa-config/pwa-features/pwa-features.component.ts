import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PwaConfig } from '@core/models/pwa-config';

interface FeatureToggle {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: string;
  config?: PwaConfig;
}

@Component({
  selector: 'app-pwa-features',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './pwa-features.component.html',
  styleUrls: ['./pwa-features.component.scss']
})
export class PwaFeaturesComponent implements OnInit {
  loading = false;
  saving = false;
  features: FeatureToggle[] = [];

  constructor(
    private api: ApiService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadFeatures();
  }

  loadFeatures(): void {
    this.loading = true;
    this.api.getPwaConfigsByCategory('features').subscribe({
      next: (configs) => {
        this.features = [
          {
            key: 'push_notifications_enabled',
            label: 'Push-Benachrichtigungen',
            description: 'Aktiviert Push-Benachrichtigungen für alle Chöre',
            icon: 'notifications_active',
            enabled: false
          },
          {
            key: 'offline_mode_enabled',
            label: 'Offline-Modus',
            description: 'Aktiviert Service Worker Caching für Offline-Nutzung',
            icon: 'cloud_off',
            enabled: false
          },
          {
            key: 'install_prompt_enabled',
            label: 'Installation Prompt',
            description: 'Zeigt Benutzern die Aufforderung zur Installation der PWA an',
            icon: 'install_mobile',
            enabled: false
          },
          {
            key: 'background_sync_enabled',
            label: 'Background Sync',
            description: 'Ermöglicht Background-Synchronisation für Offline-Aktionen',
            icon: 'sync',
            enabled: false
          }
        ];

        this.features = this.features.map(feature => {
          const config = configs.find(c => c.key === feature.key);
          return {
            ...feature,
            enabled: config?.value === 'true',
            config
          };
        });

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading PWA features:', err);
        this.notification.error('Fehler beim Laden der Features');
        this.loading = false;
      }
    });
  }

  toggleFeature(feature: FeatureToggle): void {
    this.saving = true;
    const newValue = !feature.enabled;

    this.api.updatePwaConfig(feature.key, { value: String(newValue) }).subscribe({
      next: () => {
        feature.enabled = newValue;
        this.saving = false;
        this.notification.success(
          `${feature.label} ${newValue ? 'aktiviert' : 'deaktiviert'}`,
          2000
        );
      },
      error: (err) => {
        this.saving = false;
        console.error('Error toggling feature:', err);
        this.notification.error(err.error?.message || 'Fehler beim Aktualisieren des Features');
      }
    });
  }
}
