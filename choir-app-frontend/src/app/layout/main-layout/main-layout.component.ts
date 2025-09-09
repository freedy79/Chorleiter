import { Component, OnInit, ViewChild, HostListener, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { ApiService } from 'src/app/core/services/api.service';

// Angular Material Imports
import { MaterialModule } from '@modules/material.module';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { combineLatest, map, Observable, of, filter, startWith, Subject } from 'rxjs';
import { switchMap, takeUntil, withLatestFrom, tap, shareReplay } from 'rxjs/operators';
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
  donatedRecently$: Observable<boolean>;
  userName$: Observable<string | undefined>;
  currentTheme: Theme;
  showAdminSubmenu: boolean = true;
  isExpanded = true;
  isShowing = false;
  private _appDrawer: MatDrawer | undefined;
  @ViewChild('appDrawer')
  set appDrawer(drawer: MatDrawer | undefined) {
    this._appDrawer = drawer;
    if (drawer) {
      this.navService.appDrawer = drawer;
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
  dienstplanEnabled$: Observable<boolean>;
  programsEnabled$: Observable<boolean>;

  isHandset$: Observable<boolean>;
  isTablet$: Observable<boolean> | undefined;
  isMedium$: Observable<boolean> | undefined;

    pageTitle$: Observable<string | null>;
    cartCount$: Observable<number>;
    canCreateProgram$: Observable<boolean>;

    availableChoirs$: Observable<Choir[]>;
    activeChoir$: Observable<Choir | null>;
    userInitials$: Observable<string>;
    isSmallScreen$: Observable<boolean>;
    searchOpen = false;


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
    this.userName$ = this.authService.currentUser$.pipe(map(u => u?.firstName + ' ' + u?.name));
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
    this.canCreateProgram$ = this.authService.currentUser$.pipe(
      map(user => {
        const roles = Array.isArray(user?.roles) ? user!.roles : [];
        return roles.some(r => ['director', 'choir_admin', 'admin'].includes(r));
      })
    );

    this.availableChoirs$ = this.authService.availableChoirs$;
    this.activeChoir$ = this.authService.activeChoir$;
    this.userInitials$ = this.authService.currentUser$.pipe(
      map(u => (u?.firstName?.[0] || '') + (u?.name?.[0] || ''))
    );

    this.isHandset$ = this.breakpointObserver.observe([Breakpoints.Handset]).pipe(
      map(result => result.matches),
      tap(match => {
        this.isHandset = match;
        this.headerHeight = match ? 56 : 64;
        this.evaluateDrawerWidth();
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.isSmallScreen$ = this.breakpointObserver.observe('(max-width: 600px)').pipe(
      map(result => result.matches)
    );

    this.dienstplanEnabled$ = this.authService.activeChoir$.pipe(
      map(c => c?.modules?.dienstplan !== false)
    );

    this.programsEnabled$ = this.authService.activeChoir$.pipe(
      map(c => c?.modules?.programs !== false)
    );

    this.isLoggedIn$.pipe(
      switchMap(loggedIn => loggedIn ? this.api.getMyChoirDetails() : of(null)),
      withLatestFrom(this.authService.currentUser$),
      takeUntil(this.destroy$)
    ).subscribe(([choir, user]) => {
      if (choir) {
        this.authService.activeChoir$.next(choir);
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

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => this.closeSidenav());
  }

  ngAfterViewInit(): void {
    this.evaluateDrawerWidth();
    if (this._appDrawer) {
      this.navService.appDrawer = this._appDrawer;
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
    this.authService.switchChoir(id).subscribe();
  }

  private singerMenuVisible(key: string): Observable<boolean> {
    return combineLatest([this.authService.currentUser$, this.authService.activeChoir$]).pipe(
      map(([user, choir]) => {
        const roles = Array.isArray(user?.roles) ? user!.roles : [];
        const isSingerOnly = roles.includes('singer') &&
          !roles.some(r => ['choir_admin', 'director', 'admin', 'librarian', 'organist'].includes(r));
        if (!isSingerOnly) {
          return true;
        }
        const menu = choir?.modules?.singerMenu || {};
        return menu[key] !== false;
      })
    );
  }

  private visibleFor(key: string, base$: Observable<boolean>): Observable<boolean> {
    return combineLatest([base$, this.singerMenuVisible(key)]).pipe(
      map(([base, allowed]) => base && allowed)
    );
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
    this.authService.activeChoir$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.setupNavItems());
  }

  private setupNavItems(): void {
    const dienstplanVisible$ = combineLatest([this.isLoggedIn$, this.dienstplanEnabled$]).pipe(
      map(([loggedIn, enabled]) => loggedIn && enabled)
    );
    const programsVisible$ = combineLatest([this.canCreateProgram$, this.programsEnabled$]).pipe(
      map(([canCreate, enabled]) => canCreate && enabled)
    );

    this.navItems = [
      {
        key: 'dashboard',
        displayName: 'Home',
        route: '/dashboard',
        visibleSubject: this.isLoggedIn$,
        iconName: 'home',
      },
      {
        key: 'events',
        displayName: 'Ereignisse',
        route: '/events',
        visibleSubject: this.visibleFor('events', this.isLoggedIn$),
        iconName: 'event',
      },
      {
        key: 'dienstplan',
        displayName: 'Dienstplan',
        route: '/dienstplan',
        visibleSubject: this.visibleFor('dienstplan', dienstplanVisible$),
        iconName: 'calendar_today',
      },
      {
        key: 'availability',
        displayName: 'Verfügbarkeiten',
        route: '/availability',
        visibleSubject: this.visibleFor('availability', this.isLoggedIn$),
        iconName: 'event_available',
      },
      {
        key: 'participation',
        displayName: 'Beteiligung',
        route: '/participation',
        visibleSubject: this.visibleFor('participation', this.isLoggedIn$),
        iconName: 'group',
      },
      {
        key: 'posts',
        displayName: 'Beiträge',
        route: '/posts',
        visibleSubject: this.visibleFor('posts', this.isLoggedIn$),
        iconName: 'article',
      },
      {
        key: 'programs',
        displayName: 'Programme',
        route: '/programs',
        visibleSubject: this.visibleFor('programs', programsVisible$),
        iconName: 'queue_music',
      },
      {
        key: 'stats',
        displayName: 'Statistik',
        route: '/stats',
        visibleSubject: this.visibleFor('stats', this.isLoggedIn$),
        iconName: 'bar_chart',
      },
      {
        key: 'manageChoir',
        displayName: 'Mein Chor',
        route: '/manage-choir',
        visibleSubject: this.visibleFor('manageChoir', this.isLoggedIn$),
        iconName: 'settings',
      },
      {
        key: 'repertoire',
        displayName: 'Repertoire',
        route: '/repertoire',
        visibleSubject: this.visibleFor('repertoire', this.isLoggedIn$),
        iconName: 'library_music',
      },
      {
        key: 'collections',
        displayName: 'Sammlungen',
        route: '/collections',
        visibleSubject: this.visibleFor('collections', this.isLoggedIn$),
        iconName: 'folder',
      },
      {
        key: 'library',
        displayName: 'Bibliothek',
        route: '/library',
        visibleSubject: this.visibleFor('library', this.isLoggedIn$),
        iconName: 'menu_book',
      },
      {
        displayName: 'Administration',
        visibleSubject: this.isAdmin$,
        route: 'admin',
        iconName: 'admin_panel_settings',
        children: [
          { displayName: 'Allgemein', route: '/admin/general' },
          { displayName: 'Chöre', route: '/admin/choirs' },
          { displayName: 'Benutzer', route: '/admin/users' },
          { displayName: 'Komponisten/Autoren', route: '/admin/creators' },
          { displayName: 'Verlage', route: '/admin/publishers' },
          { displayName: 'Änderungsvorschläge', route: '/admin/piece-changes' },
          { displayName: 'Protokolle', route: '/admin/protocols' },
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
    this.themeService.setTheme(theme);
    this.currentTheme = theme; // Aktualisieren Sie den lokalen Status für die UI
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
