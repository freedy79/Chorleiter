import { Component, OnInit, ViewChild, HostListener, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { AuthService } from 'src/app/core/services/auth.service';
import { ApiService } from 'src/app/core/services/api.service';
import { MenuVisibilityService } from '@core/services/menu-visibility.service';

// Angular Material Imports
import { MaterialModule } from '@modules/material.module';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, combineLatest, map, Observable, of, filter, startWith, Subject, take, from, interval } from 'rxjs';
import { switchMap, takeUntil, withLatestFrom, tap, shareReplay, catchError } from 'rxjs/operators';
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
import { NotificationService } from '@core/services/notification.service';
import { Choir } from '@core/models/choir';
import { ChatGlobalUnreadOverview } from '@core/models/chat-room';
import { ChatService } from '@core/services/chat.service';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

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
    notenwart: 'Notenwart',
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

  /** Whether the fullscreen mobile menu overlay is open */
  mobileMenuOpen = false;

  headerHeight = 64;
  footerHeight = 56;

  public navItems: NavItem[] = [];

  isHandset$: Observable<boolean>;
  isTablet$: Observable<boolean> | undefined;
  isMedium$: Observable<boolean> | undefined;

  pageTitle$: Observable<string | null>;
  pageDescription$: Observable<string | null>;
  isFramelessRoute$: Observable<boolean>;
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
  chatUnreadCount$ = new BehaviorSubject<number>(0);
  private latestChatOverview: ChatGlobalUnreadOverview | null = null;
  private latestNotifiedMessageId: number | null = null;
  private pendingNotificationPermissionRequest = false;
  private deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  private installNotificationShown = false;
  private readonly installPromptCooldownKey = 'pwa-install-prompt-dismissed-at';
  private readonly installPromptCooldownMs = 7 * 24 * 60 * 60 * 1000;


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
    private titleService: Title,
    private metaService: Meta,
    private chatService: ChatService,
    private notification: NotificationService
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

    // Ensure isHandset is always tracked even if not used in template
    this.isHandset$.pipe(takeUntil(this.destroy$)).subscribe();

    this.isSmallScreen$ = this.responsive.isMobile$;

    this.dienstplanVisible$ = this.restrictForDemo(this.menu.isVisible('dienstplan'));

    this.isLibrarian$ = this.authService.globalRoles$.pipe(
      map(roles => roles.includes('librarian'))
    );

    // Always true: More menu contains Profile, Chat, Beiträge for all users
    this.hasMoreItems$ = of(true);

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

    this.pageDescription$ = routeData$.pipe(
      map(data => data.description ?? null)
    );

    this.isFramelessRoute$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.isFramelessRoute(this.router.url)),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Update browser tab title when page title changes
    this.pageTitle$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(title => {
      const browserTitle = title ? `${title} - NAK Chorleiter` : 'NAK Chorleiter';
      this.titleService.setTitle(browserTitle);

      this.metaService.updateTag({ property: 'og:title', content: browserTitle });
      this.metaService.updateTag({ name: 'twitter:title', content: browserTitle });
    });

    this.pageDescription$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(description => {
      const fallback = 'NAK Chorleiter - die Verwaltungsanwendung für Chöre mit Repertoire, Verfügbarkeiten, Kommunikation und Einsatzplanung.';
      const finalDescription = description || fallback;

      this.metaService.updateTag({ name: 'description', content: finalDescription });
      this.metaService.updateTag({ property: 'og:description', content: finalDescription });
      this.metaService.updateTag({ name: 'twitter:description', content: finalDescription });
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.closeSidenav();
      this.closeFullscreenMenu();
    });

    this.isLoggedIn$.pipe(
      switchMap(loggedIn => {
        if (!loggedIn) {
          this.chatUnreadCount$.next(0);
          this.latestChatOverview = null;
          this.latestNotifiedMessageId = null;
          return of(null);
        }

        return interval(15000).pipe(
          startWith(0),
          switchMap(() => this.chatService.getGlobalUnreadOverview().pipe(catchError(() => of(null))))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(overview => {
      if (!overview) {
        return;
      }

      this.latestChatOverview = overview;
      this.chatUnreadCount$.next(overview.totalUnread || 0);
      this.maybeNotifyAboutNewestUnread(overview);
    });
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

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event): void {
    const installEvent = event as BeforeInstallPromptEvent;
    installEvent.preventDefault();
    this.deferredInstallPrompt = installEvent;
    this.tryShowInstallNotification();
  }

  @HostListener('window:appinstalled')
  onAppInstalled(): void {
    this.deferredInstallPrompt = null;
    this.installNotificationShown = true;
    localStorage.removeItem(this.installPromptCooldownKey);
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
    if (this.isHandset) {
      this.mobileMenuOpen = !this.mobileMenuOpen;
    } else {
      this._appDrawer?.toggle();
    }
  }

  /** Close the fullscreen mobile menu overlay */
  closeFullscreenMenu() {
    this.mobileMenuOpen = false;
  }

  switchChoir(id: number): void {
    this.authService.switchChoir(id).pipe(takeUntil(this.destroy$)).subscribe();
  }

  private getDeepestRouteData(route: ActivatedRoute): { title: string | null; showChoirName: boolean; description: string | null } {
    let child = route.firstChild;
    const data = {
      title: child?.snapshot?.data?.['title'] ?? null,
      showChoirName: child?.snapshot?.data?.['showChoirName'] ?? false,
      description: child?.snapshot?.data?.['description'] ?? null
    };
    while (child?.firstChild) {
      child = child.firstChild;
      if (child.snapshot?.data) {
        if (child.snapshot.data['title']) {
          data.title = child.snapshot.data['title'];
        }
        if (child.snapshot.data['showChoirName']) {
          data.showChoirName = child.snapshot.data['showChoirName'];
        }
        if (child.snapshot.data['description']) {
          data.description = child.snapshot.data['description'];
        }
      }
    }
    return data;
  }


  ngOnInit(): void {
    this.consumePendingPostSwitchRedirect();

    this.authService.activeChoir$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.setupNavItems());

    this.isSmallScreen$.pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(() => this.tryShowInstallNotification());
  }

  openChatFromHeader(): void {
    const currentOverview = this.latestChatOverview;
    if (!currentOverview?.oldestUnread) {
      this.router.navigate(['/chat']);
      return;
    }

    this.navigateToChatTarget(currentOverview.oldestUnread);
  }

  private restrictForDemo(visibility$: Observable<boolean>): Observable<boolean> {
    return combineLatest([visibility$, this.isDemo$]).pipe(
      map(([visible, isDemo]) => visible && !isDemo)
    );
  }

  private anyItemVisible(items: NavItem[]): Observable<boolean> {
    const visibilityStreams = items.map(item => item.visibleSubject ?? of(item.visible !== false));
    return combineLatest(visibilityStreams).pipe(
      map(values => values.some(Boolean))
    );
  }

  private createSectionHeader(displayName: string, items: NavItem[]): NavItem {
    return {
      displayName,
      disabled: true,
      isSectionHeader: true,
      visibleSubject: this.anyItemVisible(items)
    };
  }

  private setupNavItems(): void {
    const dashboard: NavItem = {
      key: 'dashboard',
      displayName: 'Home',
      route: '/dashboard',
      visibleSubject: this.menu.isVisible('dashboard'),
      iconName: 'home',
    };
    const events: NavItem = {
      key: 'events',
      displayName: 'Ereignisse',
      route: '/events',
      visibleSubject: this.menu.isVisible('events'),
      iconName: 'event',
    };
    const dienstplan: NavItem = {
      key: 'dienstplan',
      displayName: 'Dienstplan',
      route: '/dienstplan',
      visibleSubject: this.restrictForDemo(this.menu.isVisible('dienstplan')),
      iconName: 'calendar_today',
    };
    const availability: NavItem = {
      key: 'availability',
      displayName: 'Verfügbarkeiten',
      route: '/availability',
      visibleSubject: this.restrictForDemo(this.menu.isVisible('availability')),
      iconName: 'event_available',
    };
    const chat: NavItem = {
      key: 'chat',
      displayName: 'Chat',
      route: '/chat',
      visibleSubject: this.menu.isVisible('chat'),
      iconName: 'forum',
    };
    const posts: NavItem = {
      key: 'posts',
      displayName: 'Beiträge',
      route: '/posts',
      visibleSubject: this.menu.isVisible('posts'),
      iconName: 'article',
    };

    const repertoire: NavItem = {
      key: 'repertoire',
      displayName: 'Repertoire',
      route: '/repertoire',
      visibleSubject: this.menu.isVisible('repertoire'),
      iconName: 'library_music',
    };
    const practiceLists: NavItem = {
      key: 'practiceLists',
      displayName: 'Übungslisten',
      route: '/practice-lists',
      visibleSubject: this.menu.isVisible('repertoire'),
      iconName: 'playlist_play',
    };
    const programs: NavItem = {
      key: 'programs',
      displayName: 'Programme',
      route: '/programs',
      visibleSubject: this.restrictForDemo(this.menu.isVisible('programs')),
      iconName: 'queue_music',
    };
    const library: NavItem = {
      key: 'library',
      displayName: 'Bibliothek',
      route: '/library',
      visibleSubject: this.restrictForDemo(this.menu.isVisible('library')),
      iconName: 'menu_book',
    };
    const collections: NavItem = {
      key: 'collections',
      displayName: 'Sammlungen',
      route: '/collections',
      visibleSubject: this.restrictForDemo(this.menu.isVisible('collections')),
      iconName: 'folder',
    };

    const participation: NavItem = {
      key: 'participation',
      displayName: 'Beteiligung',
      route: '/participation',
      visibleSubject: this.restrictForDemo(this.menu.isVisible('participation')),
      iconName: 'group',
    };
    const stats: NavItem = {
      key: 'stats',
      displayName: 'Statistik',
      route: '/stats',
      visibleSubject: this.menu.isVisible('stats'),
      iconName: 'bar_chart',
    };
    const manageChoir: NavItem = {
      key: 'manageChoir',
      displayName: 'Mein Chor',
      route: '/manage-choir',
      visibleSubject: this.restrictForDemo(this.menu.isVisible('manageChoir')),
      iconName: 'settings',
    };

    const administration: NavItem = {
      displayName: 'Administration',
      visibleSubject: this.isAdmin$,
      route: 'admin',
      iconName: 'admin_panel_settings',
      children: [
        { displayName: 'Dashboard', route: '/admin/dashboard', iconName: 'dashboard' },
        { displayName: '──────────', route: '', disabled: true },
        { displayName: 'Organisationen', route: '/admin/organizations', iconName: 'account_balance' },
        { displayName: 'E-Mail Management', route: '/admin/mail-management', iconName: 'mail' },
        { displayName: 'PDF Templates', route: '/admin/pdf-templates', iconName: 'picture_as_pdf' },
        { displayName: 'Metadaten', route: '/admin/metadata', iconName: 'library_music' },
        { displayName: 'Datenanreicherung', route: '/admin/data-enrichment', iconName: 'auto_fix_high' },
        { displayName: 'Sicherheit', route: '/admin/security', iconName: 'security' },
        { displayName: 'Systemeinstellungen', route: '/admin/system-settings', iconName: 'settings' },
        { displayName: 'PWA Konfiguration', route: '/admin/pwa-config', iconName: 'install_mobile' },
        { displayName: '──────────', route: '', disabled: true },
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
    };

    const todayAndCommunication = [dashboard, events, dienstplan, availability, chat, posts];
    const musicAndRepertoire = [repertoire, practiceLists, programs, library, collections];
    const analyticsAndOrganisation = [participation, stats, manageChoir];
    const system = [administration];

    this.navItems = [
      this.createSectionHeader('Heute & Kommunikation', todayAndCommunication),
      ...todayAndCommunication,

      this.createSectionHeader('Musik & Repertoire', musicAndRepertoire),
      ...musicAndRepertoire,

      this.createSectionHeader('Auswertung & Organisation', analyticsAndOrganisation),
      ...analyticsAndOrganisation,

      this.createSectionHeader('System', system),
      ...system,
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
    if (this._appDrawer?.mode === 'over') {
      this._appDrawer.close();
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
    this.chatUnreadCount$.complete();
  }

  private navigateToChatTarget(target: {
    choirId: number;
    chatRoomId: number;
    messageId: number;
  }): void {
    this.activeChoir$.pipe(take(1), withLatestFrom(this.availableChoirs$)).subscribe(([activeChoir, choirs]) => {
      const targetUrl = `/chat?room=${target.chatRoomId}&message=${target.messageId}`;
      const hasMultipleChoirs = (choirs?.length || 0) > 1;
      const mustSwitchChoir = !!activeChoir && activeChoir.id !== target.choirId;

      if (hasMultipleChoirs && mustSwitchChoir) {
        sessionStorage.setItem('postSwitchRedirect', targetUrl);
        this.authService.switchChoir(target.choirId).pipe(take(1)).subscribe();
        return;
      }

      this.router.navigate(['/chat'], { queryParams: { room: target.chatRoomId, message: target.messageId } });
    });
  }

  private consumePendingPostSwitchRedirect(): void {
    const pending = sessionStorage.getItem('postSwitchRedirect');
    if (!pending) {
      return;
    }

    sessionStorage.removeItem('postSwitchRedirect');
    this.router.navigateByUrl(pending).catch(() => {
      // no-op
    });
  }

  private isFramelessRoute(url: string): boolean {
    const cleanUrl = (url || '').split('?')[0].split('#')[0];
    return cleanUrl.startsWith('/c/') || cleanUrl.startsWith('/shared-piece/');
  }

  private maybeNotifyAboutNewestUnread(overview: ChatGlobalUnreadOverview): void {
    const newest = overview.newestUnread;
    if (!newest?.messageId) {
      return;
    }

    if (this.latestNotifiedMessageId === null) {
      this.latestNotifiedMessageId = newest.messageId;
      return;
    }

    if (newest.messageId <= this.latestNotifiedMessageId) {
      return;
    }

    this.latestNotifiedMessageId = newest.messageId;
    this.showBrowserNotification(newest);
  }

  private async showBrowserNotification(newest: NonNullable<ChatGlobalUnreadOverview['newestUnread']>): Promise<void> {
    if (typeof Notification === 'undefined') {
      return;
    }

    let permission = Notification.permission;
    if (permission === 'default' && !this.pendingNotificationPermissionRequest) {
      try {
        this.pendingNotificationPermissionRequest = true;
        permission = await Notification.requestPermission();
      } finally {
        this.pendingNotificationPermissionRequest = false;
      }
    }

    if (permission !== 'granted') {
      return;
    }

    const bodyPrefix = newest.authorName ? `${newest.authorName}: ` : '';
    const notification = new Notification(`Neue Nachricht • ${newest.choirName || 'Chor'}`, {
      body: `${bodyPrefix}${newest.preview}`,
      icon: '/assets/icons/icon-192x192.png',
      tag: `chat-${newest.messageId}`
    });

    notification.onclick = () => {
      window.focus();
      this.navigateToChatTarget({
        choirId: newest.choirId,
        chatRoomId: newest.chatRoomId,
        messageId: newest.messageId
      });
      notification.close();
    };
  }

  private tryShowInstallNotification(): void {
    if (this.installNotificationShown || !this.deferredInstallPrompt) {
      return;
    }

    if (this.isAppInstalled() || !this.responsive.checkMobile() || this.isInstallPromptInCooldown()) {
      return;
    }

    this.installNotificationShown = true;

    const snackBarRef = this.notification.infoWithAction(
      'Diese App kann auf deinem Gerät installiert werden.',
      'Installieren',
      12000
    );

    snackBarRef.onAction().pipe(take(1)).subscribe(() => {
      void this.promptInstall();
    });

    snackBarRef.afterDismissed().pipe(take(1)).subscribe(result => {
      if (!result.dismissedByAction) {
        this.markInstallPromptDismissed();
      }
    });
  }

  private async promptInstall(): Promise<void> {
    if (!this.deferredInstallPrompt) {
      return;
    }

    const installPrompt = this.deferredInstallPrompt;
    this.deferredInstallPrompt = null;

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      if (choiceResult.outcome !== 'accepted') {
        this.markInstallPromptDismissed();
      } else {
        localStorage.removeItem(this.installPromptCooldownKey);
      }
    } catch {
      this.markInstallPromptDismissed();
    }
  }

  private isAppInstalled(): boolean {
    const standaloneNavigator = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    return window.matchMedia('(display-mode: standalone)').matches || !!standaloneNavigator;
  }

  private isInstallPromptInCooldown(): boolean {
    const rawTimestamp = localStorage.getItem(this.installPromptCooldownKey);
    if (!rawTimestamp) {
      return false;
    }

    const timestamp = Number(rawTimestamp);
    if (Number.isNaN(timestamp)) {
      return false;
    }

    return Date.now() - timestamp < this.installPromptCooldownMs;
  }

  private markInstallPromptDismissed(): void {
    localStorage.setItem(this.installPromptCooldownKey, Date.now().toString());
  }
}
