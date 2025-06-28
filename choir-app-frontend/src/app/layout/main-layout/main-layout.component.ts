import { Component, OnInit, ViewChild } from '@angular/core';
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
import { LoadingIndicatorComponent } from '@shared/components/loading-indicator/loading-indicator.component';
import { NavItem } from '@shared/components/menu-list-item/nav-item';
import { MenuListItemComponent } from '@shared/components/menu-list-item/menu-list-item.component';
import { NavService } from '@shared/components/menu-list-item/nav-service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatDrawer } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { HelpWizardComponent } from '@shared/components/help-wizard/help-wizard.component';
import { HelpService } from '@core/services/help.service';

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
    ErrorDisplayComponent,
    LoadingIndicatorComponent,
    MenuListItemComponent
  ],
  providers: [NavService],
})
export class MainLayoutComponent implements OnInit{
  isLoggedIn$: Observable<boolean>;
  isAdmin$: Observable<boolean>;
  donatedRecently$: Observable<boolean>;
  currentTheme: Theme;
  showAdminSubmenu: boolean = true;
  isExpanded = true;
  isShowing = false;
  @ViewChild('appDrawer') appDrawer: MatDrawer | undefined;
   private isHandset: boolean = false;

  headerHeight = 64;
  footerHeight = 56;

  public navItems: NavItem[] = [];

  isHandset$: Observable<boolean>;
  isTablet$: Observable<boolean> | undefined;
  isMedium$: Observable<boolean> | undefined;


  constructor(private authService: AuthService,
    private themeService: ThemeService,
    private navService: NavService,
    private breakpointObserver: BreakpointObserver,
    private dialog: MatDialog,
    private help: HelpService
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
    this.isAdmin$ = this.authService.isAdmin$;
    this.donatedRecently$ = this.authService.currentUser$.pipe(
      map(u => {
        if (!u?.lastDonation) return false;
        const last = new Date(u.lastDonation);
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return last > yearAgo;
      })
    );
    this.currentTheme = this.themeService.getCurrentTheme();

    this.isHandset$ = this.breakpointObserver.observe([Breakpoints.Handset]).pipe(
      map(result => result.matches)
    );
    this.isHandset$.subscribe(match => {
      this.isHandset = match;
      this.headerHeight = match ? 56 : 64;
    });
  }

  ngOnInit(): void {
    //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
    //Add '${implements OnChanges}' to the class.
/*
    <ng-container *ngIf="isLoggedIn$ | async">
        <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}">Dashboard</a>
        <a mat-list-item routerLink="/repertoire" routerLinkActive="active-link">Repertoire</a>
        <a mat-list-item routerLink="/collections" routerLinkActive="active-link">Sammlungen</a>
        <a mat-list-item routerLink="/manage-choir" routerLinkActive="active-link">Chorverwaltung</a>
        <ng-container *ngIf="isAdmin$ | async">
          <mat-divider></mat-divider>
          <mat-list-item (click)="showAdminSubmenu = !showAdminSubmenu" class="parent">
            <span class="full-width" *ngIf="isExpanded || isShowing">Administration</span>
            <mat-icon mat-list-icon>home</mat-icon>
            <mat-icon class="menu-button" [ngClass]="{'rotated' : showAdminSubmenu}" *ngIf="isExpanded || isShowing">expand_more</mat-icon>
          </mat-list-item>
          <div class="submenu" [ngClass]="{'expanded' : showAdminSubmenu}" *ngIf="isShowing || isExpanded">
              <a mat-list-item routerLink="/admin/composers" routerLinkActive="active-link">Komponisten</a>
              <a mat-list-item routerLink="/admin/authors" routerLinkActive="active-link">Autoren</a>
          </div>
        </ng-container>
      </ng-container>*/
    this.navItems = [
      {
        displayName: 'Home',
        //svgIconName: 's-house',
        route: '/dashboard',
        visibleSubject: this.isLoggedIn$,
      },
      {
          displayName: 'Ereignisse',
          //svgIconName: 's-messages',
          route: '/events',
          visibleSubject: this.isLoggedIn$,
      },
      {
        displayName: 'Statistik',
        route: '/stats',
        visibleSubject: this.isLoggedIn$,
      },
      {
        displayName: 'Mein Chor',
        //svgIconName: 's-lens-display',
        route: '/manage-choir',
        visibleSubject: this.isLoggedIn$,
      },
      {
        displayName: 'Repertoire',
        //svgIconName: 's-lens-display',
        route: '/repertoire',
        visibleSubject: this.isLoggedIn$,
      },
      {
        displayName: 'Sammlungen',
        //svgIconName: 's-lens-display',
        route: '/collections',
        visibleSubject: this.isLoggedIn$,
      },
      {
        displayName: 'Administration',
        //svgIconName: 's-settings',
        visibleSubject: this.isAdmin$,
        route: '',
        children: [
            {
            displayName: 'Chöre',
            route: '/admin/choirs',
          },
          {
            displayName: 'Benutzer',
            route: '/admin/users',
          },
          {
            displayName: 'Komponisten',
            route: '/admin/composers'
          },
          {
            displayName: 'Autoren',
            route: '/admin/authors',
          },
          {
            displayName: 'Backup',
            route: '/admin/backup',
          }
        ]
      }
    ];
  }

  logout(): void {
    this.authService.logout();
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
    this.currentTheme = theme; // Aktualisieren Sie den lokalen Status für die UI
  }

  public closeSidenav() {
    if (this.isHandset) {
      this.appDrawer?.close();
    }
  }

  openHelp(): void {
    this.dialog.open(HelpWizardComponent, { width: '600px' });
  }
}
