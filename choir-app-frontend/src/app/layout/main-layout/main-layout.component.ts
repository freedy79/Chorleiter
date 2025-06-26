import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router'; // RouterModule importieren
import { AuthService } from 'src/app/core/services/auth.service';

// Angular Material Imports
import { MaterialModule } from '@modules/material.module';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { combineLatest, map, Observable } from 'rxjs';
import { Theme, ThemeService } from '@core/services/theme.service';
import { ChoirSwitcherComponent } from '../choir-switcher/choir-switcher.component';
import { ErrorDisplayComponent } from '@shared/components/error-display/error-display.component';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, // Für router-outlet und routerLink
    MaterialModule,
    FooterComponent,
    ChoirSwitcherComponent,
    ErrorDisplayComponent
  ]
})
export class MainLayoutComponent {
  isLoggedIn$: Observable<boolean>;
  isAdmin$: Observable<boolean>;
  currentTheme: Theme;

  constructor(private authService: AuthService,
    private themeService: ThemeService
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
    this.isAdmin$ = this.authService.isAdmin$;
    this.currentTheme = this.themeService.getCurrentTheme();
  }

  logout(): void {
    this.authService.logout();
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
    this.currentTheme = theme; // Aktualisieren Sie den lokalen Status für die UI
  }

}
