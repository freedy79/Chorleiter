import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router'; // RouterModule importieren
import { AuthService } from 'src/app/core/services/auth.service';

// Angular Material Imports
import { MaterialModule } from '@modules/material.module';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { map, Observable } from 'rxjs';
import { Theme, ThemeService } from '@core/services/theme.service';
import { ChoirSwitcherComponent } from '../choir-switcher/choir-switcher.component';

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
    ChoirSwitcherComponent
  ]
})
export class MainLayoutComponent {
  isLoggedIn$: Observable<boolean>; // Ein Observable für den Login-Status
  isAdmin$: Observable<boolean>;
  currentTheme: Theme;
  isChoirAdminOrAdmin$: Observable<boolean>;

  constructor(private authService: AuthService,
    private themeService: ThemeService
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
    this.isAdmin$ = this.authService.currentUser$.pipe(
      map(user => user?.role === 'admin')
    );
    this.currentTheme = this.themeService.getCurrentTheme();
    this.isChoirAdminOrAdmin$ = this.authService.currentUser$.pipe(
      map(user => user?.role === 'admin' || user?.activeChoir?.membership?.roleInChoir === 'choir_admin')
    );
  }

  logout(): void {
    this.authService.logout();
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
    this.currentTheme = theme; // Aktualisieren Sie den lokalen Status für die UI
  }

}
