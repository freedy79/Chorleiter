import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PwaVapidKeysComponent } from './pwa-vapid-keys/pwa-vapid-keys.component';
import { PwaFeaturesComponent } from './pwa-features/pwa-features.component';
import { PwaServiceWorkerComponent } from './pwa-service-worker/pwa-service-worker.component';
import { PwaCacheComponent } from './pwa-cache/pwa-cache.component';
import { PwaAllConfigsComponent } from './pwa-all-configs/pwa-all-configs.component';

@Component({
  selector: 'app-pwa-config',
  templateUrl: './pwa-config.component.html',
  styleUrls: ['./pwa-config.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    AdminPageHeaderComponent,
    PwaVapidKeysComponent,
    PwaFeaturesComponent,
    PwaServiceWorkerComponent,
    PwaCacheComponent,
    PwaAllConfigsComponent
  ]
})
export class PwaConfigComponent {
  selectedTabIndex = 0;
  isMobile$: Observable<boolean>;
  initializing = false;

  constructor(
    private responsive: ResponsiveService,
    private api: ApiService,
    private notification: NotificationService
  ) {
    this.isMobile$ = responsive.isHandset$;
  }

  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }

  initializeDefaults(): void {
    if (!confirm('Möchten Sie die Standard-PWA-Konfigurationen initialisieren? Bestehende Einstellungen werden nicht überschrieben.')) {
      return;
    }

    this.initializing = true;
    this.api.initializePwaConfigDefaults().subscribe({
      next: (result) => {
        this.initializing = false;
        this.notification.success(
          `${result.created} Konfigurationen erstellt, ${result.skipped} übersprungen`,
          3000
        );
        window.location.reload();
      },
      error: (err) => {
        this.initializing = false;
        console.error('Error initializing PWA config defaults:', err);
        this.notification.error(err.error?.message || 'Fehler beim Initialisieren der Standardkonfigurationen');
      }
    });
  }
}
