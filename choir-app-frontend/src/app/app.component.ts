import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private themeService: ThemeService) {
    // Rufen Sie die Initialisierungsmethode auf, wenn die App startet.
    this.themeService.initializeTheme();
  }
}
