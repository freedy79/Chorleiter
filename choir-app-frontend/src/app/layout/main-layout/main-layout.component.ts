import { Component, OnInit, ViewChild, HostListener, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthService } from 'src/app/core/services/auth.service';
import { ApiService } from 'src/app/core/services/api.service';
import { MenuVisibilityService } from '@core/services/menu-visibility.service';

// Angular Material Imports
import { MaterialModule } from '@modules/material.module';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { combineLatest, map, Observable, of, filter, startWith, Subject, take, from } from 'rxjs';
import { switchMap, takeUntil, withLatestFrom, tap, shareReplay } from 'rxjs/operators';
import { Theme, ThemeService } from '@core/services/theme.service';
import { ErrorDisplayComponent } from '@shared/components/error-display/error-display.component';
import { LoadingIndicatorComponent } from '@shared/components/loading-indicator/loading-indicator.component';
import { NavItem } from '@shared/components/menu-list-item/nav-item';
import { MenuListItemComponent } from '@shared/components/menu-list-item/menu-list-item.component';
import { NavService } from '@shared/components/menu-list-item/nav-service';
import { MatDrawer } from '@angular/material/sidenav';
import { ResponsiveService } from '@shared/services/responsive.service';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { HelpWizardComponent } from '@shared/components/help-wizard/help-wizard.component';
import { HelpService } from '@core/services/help.service';
import { BuildInfoDialogComponent } from '@features/admin/build-info-dialog/build-info-dialog.component';
import { SearchBoxComponent } from '@shared/components/search-box/search-box.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { LoanCartService } from '@core/services/loan-cart.service';
import { Choir } from '@core/models/choir';

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
    ErrorDisplayComponent,
    LoadingIndicatorComponent,
    MenuListItemComponent,
    SearchBoxComponent,
    PageHeaderComponent
  ],
  providers: [NavService],
})
export class MainLayoutComponent implements OnInit, AfterViewInit, OnDestroy{
  isLoggedIn$: Observable<boolean>;
  isAdmin$: Observable<boolean>;
  isDemo$: Observable<boolean>;
  donatedRecently$: Observable<boolean>;
  userName$: Observable<string | undefined>;
  userRole$: Observable<string | undefined>;
  private readonly roleTranslations: Record<string, string> = {
    director: 'Chorleiter',
    choir_admin: 'Chor-Admin',
    admin: 'Administrator',
    demo: 'Demo',
    singer: 'Sänger',
    librarian: 'Bibliothekar',
    organist: 'Organist',
    user: 'Mitglied'
  };
  currentTheme: Theme;
  showAdminSubmenu: boolean = true;
  isExpanded = true;
  isShowing = false;
  private _appDrawer: MatDrawer | undefined;
  @ViewChild('appDrawer')
  set appDrawer(drawer: MatDrawer | undefined) {
    this._appDrawer = drawer;
    if (drawer) {
      this.navService.appDrawer = drawer as any;
      this.evaluateDrawerWidth();
    }
  }
  private isHandset: boolean = false;
  private destroy$ = new Subject<void>();

  drawerOpenByWidth = true;
  private readonly drawerWidth = 220;
  private readonly maxDrawerRatio = 0.4;

  headerHeight = 64;
  footerHeight = 56;

  public navItems: NavItem[] = [];

  isHandset$: Observable<boolean>;
  isTablet$: Observable<boolean> | undefined;
  isMedium$: Observable<boolean> | undefined;

  pageTitle$: Observable<string | null>;
  cartCount$: Observable<number>;

  availableChoirs$: Observable<Choir[]>;
  activeChoir$: Observable<Choir | null>;
  userInitials$: Observable<string>;
  isSmallScreen$: Observable<boolean>;
  dienstplanVisible$: Observable<boolean>;
  isLibrarian$: Observable<boolean>;
  hasMoreItems$: Observable<boolean>;
  bottomNavVisible = true;
  private lastScrollY = 0;


  constructor(private authService: AuthService,
    private themeService: ThemeService,
    private navService: NavService,
    private responsive: ResponsiveService,
    private dialog: MatDialog,
    private bottomSheet: MatBottomSheet,
    private help: HelpService,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private cart: LoanCartService,
    private menu: MenuVisibilityService,
    private titleService: Title
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
    this.isAdmin$ = this.authService.isAdmin$;
    this.isDemo$ = this.authService.isDemo$;
    this.userName$ = this.authService.currentUser$.pipe(map(u => u?.firstName + ' ' + u?.name));
    this.userRole$ = combineLatest([this.authService.globalRoles$, this.authService.activeChoir$]).pipe(
      map(([globalRoles, choir]) => {
        const membershipRoles = choir?.membership?.rolesInChoir ?? [];
        const relevantGlobal = globalRoles.filter(role => role !== 'user');
        const combined = [...relevantGlobal, ...membershipRoles];
        const uniqueRoles = Array.from(new Set(combined));
        if (!uniqueRoles.length) {
          return globalRoles.includes('user') ? this.roleTranslations['user'] : undefined;
        }
        return uniqueRoles.map(role => this.roleTranslations[role] ?? role).join(', ');
      })
    );
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

    this.availableChoirs$ = this.authService.availableChoirs$;
    this.activeChoir$ = this.authService.activeChoir$;
    this.userInitials$ = this.authService.currentUser$.pipe(
      map(u => (u?.firstName?.[0] || '') + (u?.name?.[0] || ''))
    );

    this.isHandset$ = this.responsive.isHandset$.pipe(
      tap(match => {
        this.isHandset = match;
        this.headerHeight = match ? 56 : 64;
        this.evaluateDrawerWidth();
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.isSmallScreen$ = this.responsive.isMobile$;

    this.dienstplanVisible$ = this.restrictForDemo(this.menu.isVisible('dienstplan'));

    this.isLibrarian$ = this.authService.globalRoles$.pipe(
      map(roles => roles.includes('librarian'))
    );

    this.hasMoreItems$ = combineLatest([
      this.dienstplanVisible$,
      this.isAdmin$,
      this.isDemo$
    ]).pipe(
      map(([dienstplan, admin, demo]) => dienstplan || (!demo && admin))
    );

    this.isLoggedIn$.pipe(
      switchMap(loggedIn => loggedIn ? this.api.getMyChoirDetails() : of(null)),
      withLatestFrom(this.authService.currentUser$),
      takeUntil(this.destroy$)
    ).subscribe(([choir, user]) => {
      if (choir) {
        this.authService.setActiveChoir(choir);
        if (user) {
          const updatedUser = { ...user, activeChoir: choir } as any;
          this.authService.setCurrentUser(updatedUser);
        }
      }
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

    // Update browser tab title when page title changes
    this.pageTitle$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(title => {
      const browserTitle = title ? `${title} - NAK Chorleiter` : 'NAK Chorleiter';
      this.titleService.setTitle(browserTitle);
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => this.closeSidenav());
  }

  ngAfterViewInit(): void {
    this.evaluateDrawerWidth();
    if (this._appDrawer) {
      this.navService.appDrawer = this._appDrawer as any;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.evaluateDrawerWidth();
  }

  private evaluateDrawerWidth() {
    const width = window.innerWidth;
    this.drawerOpenByWidth = (this.drawerWidth / width) <= this.maxDrawerRatio;

    if (this.isHandset) {
      // Do not automatically toggle the drawer on handset devices while it is open.
      if (!this._appDrawer?.opened) {
        this._appDrawer?.close();
      }
      return;
    }

    if (this.drawerOpenByWidth) {
      this._appDrawer?.open();
    } else {
      this._appDrawer?.close();
    }
  }

  toggleDrawer() {
    this._appDrawer?.toggle();
  }

  switchChoir(id: number): void {
    this.authService.switchChoir(id).pipe(takeUntil(this.destroy$)).subscribe();
  }

  private getDeepestRouteData(route: ActivatedRoute): { title: string | null; showChoirName: boolean } {
    let child = route.firstChild;
    const data = { title: child?.snapshot?.data?.['title'] ?? null, showChoirName: child?.snapshot?.data?.['showChoirName'] ?? false };
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
    this.authService.activeChoir$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.setupNavItems());
  }

  private restrictForDemo(visibility$: Observable<boolean>): Observable<boolean> {
    return combineLatest([visibility$, this.isDemo$]).pipe(
      map(([visible, isDemo]) => visible && !isDemo)
    );
  }

  private setupNavItems(): void {
    // Phase 2: Wichtigste Items nach oben sortiert
    this.navItems = [
      // Primäre Navigation (am häufigsten verwendet)
      {
        key: 'dashboard',
        displayName: 'Home',
        route: '/dashboard',
        visibleSubject: this.menu.isVisible('dashboard'),
        iconName: 'home',
      },
      {
        key: 'events',
        displayName: 'Ereignisse',
        route: '/events',
        visibleSubject: this.menu.isVisible('events'),
        iconName: 'event',
      },
      {
        key: 'dienstplan',
        displayName: 'Dienstplan',
        route: '/dienstplan',
        visibleSubject: this.restrictForDemo(this.menu.isVisible('dienstplan')),
        iconName: 'calendar_today',
      },
      {
        key: 'repertoire',
        displayName: 'Repertoire',
        route: '/repertoire',
        visibleSubject: this.menu.isVisible('repertoire'),
        iconName: 'library_music',
      },

      // Sekundäre Navigation
      {
        key: 'availability',
        displayName: 'Verfügbarkeiten',
        route: '/availability',
        visibleSubject: this.restrictForDemo(this.menu.isVisible('availability')),
        iconName: 'event_available',
      },
      {
        key: 'programs',
        displayName: 'Programme',
        route: '/programs',
        visibleSubject: this.restrictForDemo(this.menu.isVisible('programs')),
        iconName: 'queue_music',
      },
      {
        key: 'library',
        displayName: 'Bibliothek',
        route: '/library',
        visibleSubject: this.restrictForDemo(this.menu.isVisible('library')),
        iconName: 'menu_book',
      },

      // Tertiäre Navigation
      {
        key: 'collections',
        displayName: 'Sammlungen',
        route: '/collections',
        visibleSubject: this.restrictForDemo(this.menu.isVisible('collections')),
        iconName: 'folder',
      },
      {
        key: 'posts',
        displayName: 'Beiträge',
        route: '/posts',
        visibleSubject: this.menu.isVisible('posts'),
        iconName: 'article',
      },
      {
        key: 'participation',
        displayName: 'Beteiligung',
        route: '/participation',
        visibleSubject: this.restrictForDemo(this.menu.isVisible('participation')),
        iconName: 'group',
      },
      {
        key: 'stats',
        displayName: 'Statistik',
        route: '/stats',
        visibleSubject: this.menu.isVisible('stats'),
        iconName: 'bar_chart',
      },

      // Verwaltung
      {
        key: 'manageChoir',
        displayName: 'Mein Chor',
        route: '/manage-choir',
        visibleSubject: this.restrictForDemo(this.menu.isVisible('manageChoir')),
        iconName: 'settings',
      },
      {
        displayName: 'Administration',
        visibleSubject: this.isAdmin$,
        route: 'admin',
        iconName: 'admin_panel_settings',
        children: [
          { displayName: 'Dashboard', route: '/admin/dashboard', iconName: 'dashboard' },
          { displayName: '──────────', route: '', disabled: true }, // Divider
          { displayName: 'Organisationen', route: '/admin/organizations', iconName: 'account_balance' },
          { displayName: 'E-Mail Management', route: '/admin/mail-management', iconName: 'mail' },
          { displayName: 'PDF Templates', route: '/admin/pdf-templates', iconName: 'picture_as_pdf' },
          { displayName: 'Metadaten', route: '/admin/metadata', iconName: 'library_music' },
          { displayName: 'Sicherheit', route: '/admin/security', iconName: 'security' },
          { displayName: 'Systemeinstellungen', route: '/admin/system-settings', iconName: 'settings' },
          { displayName: '──────────', route: '', disabled: true }, // Divider
          { displayName: 'Allgemein', route: '/admin/general' },
          { displayName: 'Chöre', route: '/admin/choirs' },
          { displayName: 'Benutzer', route: '/admin/users' },
          { displayName: 'Bezirke', route: '/admin/districts' },
          { displayName: 'Gemeinden', route: '/admin/congregations' },
          { displayName: 'Komponisten/Autoren', route: '/admin/creators' },
          { displayName: 'Verlage', route: '/admin/publishers' },
          { displayName: 'Änderungsvorschläge', route: '/admin/piece-changes' },
          { displayName: 'Protokolle', route: '/admin/protocols' },
          { displayName: 'Spenden', route: '/admin/donations' },
          { displayName: 'Dateien', route: '/admin/files' },
          { displayName: 'Develop', route: '/admin/develop' }
        ]
      }
    ];
  }

  logout(): void {
    this.authService.logout();
  }

  setTheme(theme: Theme): void {
    console.log(`[MainLayoutComponent] Theme-Schalter betätigt: "${theme}"`);
    this.themeService.setTheme(theme);
    this.currentTheme = theme; // Aktualisieren Sie den lokalen Status für die UI
    console.log(`[MainLayoutComponent] Lokaler Theme-Status aktualisiert: "${this.currentTheme}"`);
  }

  public closeSidenav() {
    if (this.isHandset) {
      this._appDrawer?.close();
    }
  }

  openBuildInfo(): void {
    this.dialog.open(BuildInfoDialogComponent, { width: '400px' });
  }

  openHelp(): void {
    this.dialog.open(HelpWizardComponent, { width: '600px' });
  }

  openChoirSwitcher(): void {
    // Phase 10: Lazy load Bottom Sheet for better performance
    this.availableChoirs$.pipe(
      take(1),
      withLatestFrom(this.activeChoir$),
      switchMap(([choirs, activeChoir]) => {
        return from(import('../choir-switcher-sheet/choir-switcher-sheet.component')).pipe(
          switchMap(m => {
            const data = {
              choirs,
              activeChoirId: activeChoir?.id ?? null
            };

            const bottomSheetRef = this.bottomSheet.open(m.ChoirSwitcherSheetComponent, {
              data,
              panelClass: 'choir-switcher-bottom-sheet'
            });

            return bottomSheetRef.afterDismissed();
          })
        );
      })
    ).subscribe((choirId: number | undefined) => {
      if (choirId) {
        this.switchChoir(choirId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
