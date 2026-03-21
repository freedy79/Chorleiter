import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ThemeService } from '@core/services/theme.service';
import { ApiService } from '@core/services/api.service';
import { ServiceWorkerUpdateService } from '@app/services/service-worker-update.service';
import { ServiceUnavailableComponent } from '@features/service-unavailable/service-unavailable.component';
import { PwaUpdateNotificationComponent } from '@app/components/pwa-update-notification/pwa-update-notification.component';
import { OfflineIndicatorComponent } from '@app/components/offline-indicator/offline-indicator.component';
import { CommonModule } from '@angular/common';
import { PushNotificationService } from '@core/services/push-notification.service';
import { BackendStatusService } from '@core/services/backend-status.service';

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
    private swUpdateService: ServiceWorkerUpdateService,
    private pushService: PushNotificationService,
    private backendStatusService: BackendStatusService
  ) {
    this.themeService.initializeTheme();

    this.api.pingBackend().subscribe({
      next: () => {
        this.backendAvailable = true;
        this.backendStatusService.setBackendAvailable(true);
      },
      error: () => {
        this.backendAvailable = false;
        this.backendStatusService.setBackendAvailable(false);
      }
    });
  }

  ngOnInit(): void {
    if ('serviceWorker' in navigator) {
      console.log('Service Worker wird unterstützt');
    }

    this.pushService.initializeNotificationClicks();
  }
}
