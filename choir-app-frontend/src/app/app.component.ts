import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ThemeService } from '@core/services/theme.service';
import { ApiService } from '@core/services/api.service';
import { ServiceWorkerUpdateService } from '@app/services/service-worker-update.service';
import { ServiceUnavailableComponent } from '@features/service-unavailable/service-unavailable.component';
import { PwaUpdateNotificationComponent } from '@app/components/pwa-update-notification/pwa-update-notification.component';
import { OfflineIndicatorComponent } from '@app/components/offline-indicator/offline-indicator.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, ServiceUnavailableComponent, CommonModule, PwaUpdateNotificationComponent, OfflineIndicatorComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  backendAvailable = true;

  constructor(
    private themeService: ThemeService,
    private api: ApiService,
    private swUpdateService: ServiceWorkerUpdateService
  ) {
    // Rufen Sie die Initialisierungsmethode auf, wenn die App startet.
    this.themeService.initializeTheme();

    this.api.pingBackend().subscribe({
      next: () => {
        this.backendAvailable = true;
      },
      error: () => {
        this.backendAvailable = false;
      }
    });
  }

  ngOnInit(): void {
    // Service Worker Update Service wird initialisiert
    if ('serviceWorker' in navigator) {
      console.log('Service Worker wird unterstützt');
      // Der Service wird automatisch beim Konstruktor initialisiert
    }
  }
}
