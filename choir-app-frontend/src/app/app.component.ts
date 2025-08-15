import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ThemeService } from '@core/services/theme.service';
import { ApiService } from '@core/services/api.service';
import { ServiceUnavailableComponent } from '@features/service-unavailable/service-unavailable.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, ServiceUnavailableComponent, CommonModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  backendAvailable = true;

  constructor(private themeService: ThemeService,
              private api: ApiService) {
    // Rufen Sie die Initialisierungsmethode auf, wenn die App startet.
    this.themeService.initializeTheme();

    this.api.pingBackend().subscribe({
      next: () => {
        this.backendAvailable = true;
        console.log("Successfully connected.");
      },
      error: () => {
        this.backendAvailable = false;
        console.error("Could not connect to the backend.");
      }
    });
  }
}
