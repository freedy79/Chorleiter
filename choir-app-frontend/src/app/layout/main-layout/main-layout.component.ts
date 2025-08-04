import { Component, OnInit, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { ApiService } from 'src/app/core/services/api.service';

// Angular Material Imports
import { MaterialModule } from '@modules/material.module';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, combineLatest, map, Observable, of, filter, startWith } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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
import { BuildInfoDialogComponent } from '@features/admin/build-info-dialog/build-info-dialog.component';
import { SearchBoxComponent } from '@shared/components/search-box/search-box.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { LoanCartService } from '@core/services/loan-cart.service';

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
    MenuListItemComponent,
    SearchBoxComponent,
    PageHeaderComponent
  ],
  providers: [NavService],
})
export class MainLayoutComponent implements OnInit, AfterViewInit{
  isLoggedIn$: Observable<boolean>;
  isAdmin$: Observable<boolean>;
  donatedRecently$: Observable<boolean>;
  userName$: Observable<string | undefined>;
  currentTheme: Theme;
  showAdminSubmenu: boolean = true;
  isExpanded = true;
  isShowing = false;
  @ViewChild('appDrawer') appDrawer: MatDrawer | undefined;
   private isHandset: boolean = false;

  drawerOpenByWidth = true;
  private readonly drawerWidth = 220;
  private readonly maxDrawerRatio = 0.4;

  headerHeight = 64;
  footerHeight = 56;

  public navItems: NavItem[] = [];
  private dienstplanEnabled$ = new BehaviorSubject<boolean>(false);

  isHandset$: Observable<boolean>;
  isTablet$: Observable<boolean> | undefined;
  isMedium$: Observable<boolean> | undefined;

  pageTitle$: Observable<string | null>;
  cartCount$: Observable<number>;


  constructor(private authService: AuthService,
    private themeService: ThemeService,
    private navService: NavService,
    private breakpointObserver: BreakpointObserver,
    private dialog: MatDialog,
    private help: HelpService,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private cart: LoanCartService
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
    this.isAdmin$ = this.authService.isAdmin$;
    this.userName$ = this.authService.currentUser$.pipe(map(u => u?.name));
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
    this.cartCount$ = this.cart.items$.pipe(map(items => items.length));

    this.isHandset$ = this.breakpointObserver.observe([Breakpoints.Handset]).pipe(
      map(result => result.matches)
    );

    this.authService.activeChoir$.subscribe(c => {
      this.dienstplanEnabled$.next(!!c?.modules?.dienstplan);
    });

    this.isLoggedIn$.pipe(
      switchMap(loggedIn => loggedIn ? this.api.getMyChoirDetails() : of(null))
    ).subscribe(choir => {
      if (choir) {
        this.dienstplanEnabled$.next(!!choir.modules?.dienstplan);
      }
    });
    this.isHandset$.subscribe(match => {
      this.isHandset = match;
      this.headerHeight = match ? 56 : 64;
      this.evaluateDrawerWidth();
    });

    const routeData$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.getDeepestRouteData(this.route)),
      startWith(this.getDeepestRouteData(this.route))
    );

    this.pageTitle$ = combineLatest([routeData$, this.authService.activeChoir$]).pipe(
      map(([data, choir]) => {
        if (!data.title) {
          return null;
        }
        if (data.showChoirName && choir?.name) {
          return `${data.title} – ${choir.name}`;
        }
        return data.title;
      })
    );
  }

  ngAfterViewInit(): void {
    this.evaluateDrawerWidth();
    if (this.appDrawer) {
      this.navService.appDrawer = this.appDrawer;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.evaluateDrawerWidth();
  }

  private evaluateDrawerWidth() {
    const width = window.innerWidth;
    this.drawerOpenByWidth = (this.drawerWidth / width) <= this.maxDrawerRatio;
  }

  private getDeepestRouteData(route: ActivatedRoute): { title: string | null; showChoirName: boolean } {
    let child = route.firstChild;
    let data = { title: child?.snapshot?.data?.['title'] ?? null, showChoirName: child?.snapshot?.data?.['showChoirName'] ?? false };
    while (child?.firstChild) {
      child = child.firstChild;
      if (child.snapshot?.data) {
        if (child.snapshot.data['title']) {
          data.title = child.snapshot.data['title'];
        }
        if (child.snapshot.data['showChoirName']) {
          data.showChoirName = child.snapshot.data['showChoirName'];
        }
      }
    }
    return data;
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
              <a mat-list-item routerLink="/admin/creators" routerLinkActive="active-link">Komponisten/Autoren</a>
          </div>
        </ng-container>
      </ng-container>*/
    const dienstplanVisible$ = combineLatest([this.isLoggedIn$, this.dienstplanEnabled$]).pipe(
      map(([loggedIn, enabled]) => loggedIn && enabled)
    );

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
        displayName: 'Dienstplan',
        route: '/dienstplan',
        visibleSubject: dienstplanVisible$,
      },
      {
        displayName: 'Meine Termine',
        route: '/termine',
        visibleSubject: this.isLoggedIn$,
      },
      {
        displayName: 'Beiträge',
        route: '/posts',
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
        displayName: 'Bibliothek',
        route: '/library',
        visibleSubject: this.isLoggedIn$,
      },
      {
        displayName: 'Administration',
        //svgIconName: 's-settings',
        visibleSubject: this.isAdmin$,
        route: '',
        children: [
          {
            displayName: 'Allgemein',
            route: '/admin/general',
          },
          {
            displayName: 'Chöre',
            route: '/admin/choirs',
          },
          {
            displayName: 'Benutzer',
            route: '/admin/users',
          },
          {
            displayName: 'Komponisten/Autoren',
            route: '/admin/creators'
          },
          {
            displayName: 'Verlage',
            route: '/admin/publishers'
          },
          {
            displayName: 'Änderungsvorschläge',
            route: '/admin/piece-changes'
          },
          {
            displayName: 'Protokolle',
            route: '/admin/protocols',
          },
          {
            displayName: 'Develop',
            route: '/admin/develop',
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

  openBuildInfo(): void {
    this.dialog.open(BuildInfoDialogComponent, { width: '400px' });
  }

  openHelp(): void {
    this.dialog.open(HelpWizardComponent, { width: '600px' });
  }
}
