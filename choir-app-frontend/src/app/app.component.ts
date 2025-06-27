import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ThemeService } from '@core/services/theme.service';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, MatSnackBarModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private themeService: ThemeService,
              private api: ApiService,
              private snackBar: MatSnackBar) {
    // Rufen Sie die Initialisierungsmethode auf, wenn die App startet.
    this.themeService.initializeTheme();

    this.api.pingBackend().subscribe({
      error: () => this.snackBar.open('Backend nicht erreichbar', 'Close', {
        duration: 5000,
        verticalPosition: 'top'
      })
    });
  }
}
