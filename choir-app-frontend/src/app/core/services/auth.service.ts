import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { map, tap, catchError, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { User, GlobalRole } from '../models/user';
import { Choir, ChoirMembership, ChoirRole, normalizeChoir, normalizeChoirs } from '../models/choir';
import { SwitchChoirResponse } from '../models/auth';
import { ThemeService } from './theme.service';
import { UserPreferencesService } from './user-preferences.service';
import { DebugLogService } from './debug-log.service';

const TOKEN_KEY = 'auth-token';
const USER_KEY = 'user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.loggedIn.asObservable();

  private userReloadTriggered = false;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  public activeChoir$ = new BehaviorSubject<Choir | null>(null);
  public availableChoirs$ = new BehaviorSubject<Choir[]>([]);

  // --- Wir leiten die Berechtigungen direkt vom currentUser$ ab ---
  public globalRoles$: Observable<GlobalRole[]>;
  public choirRoles$: Observable<ChoirRole[]>;
  public isAdmin$: Observable<boolean>;
  public isLibrarian$: Observable<boolean>;
  public isDemo$: Observable<boolean>;
  public isChoirAdmin$: Observable<boolean>;
  public isDirector$: Observable<boolean>;
  public isSinger$: Observable<boolean>;
  public isSingerOnly$: Observable<boolean>;

  constructor(private http: HttpClient,
              private router: Router,
              private theme: ThemeService,
              private prefs: UserPreferencesService,
              private logger: DebugLogService) {
    this.migrateStorage();
    this.loggedIn.next(this.hasToken());

    const storedUser = this.getUserFromStorage();
    if (storedUser) {
      const normalizedUser = this.withNormalizedChoirData(storedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
      this.currentUserSubject.next(normalizedUser);
      this.setActiveChoir(normalizedUser.activeChoir || null);
      this.availableChoirs$.next(normalizedUser.availableChoirs || []);
    }

    this.globalRoles$ = this.currentUser$.pipe(
      map(user => this.extractGlobalRoles(user)),
      distinctUntilChanged((prev, curr) => this.rolesEqual(prev, curr))
    );

    this.choirRoles$ = this.activeChoir$.pipe(
      map(choir => this.extractChoirRoles(choir)),
      distinctUntilChanged((prev, curr) => this.rolesEqual(prev, curr))
    );

    this.isAdmin$ = this.globalRoles$.pipe(
      map(roles => roles.includes('admin')),
      distinctUntilChanged()
    );

    this.isLibrarian$ = this.globalRoles$.pipe(
      map(roles => roles.includes('librarian')),
      distinctUntilChanged()
    );

    this.isDemo$ = this.globalRoles$.pipe(
      map(roles => roles.includes('demo')),
      distinctUntilChanged()
    );

    this.isChoirAdmin$ = combineLatest([this.isAdmin$, this.choirRoles$]).pipe(
      map(([isAdmin, choirRoles]) => isAdmin || choirRoles.includes('choir_admin')),
      distinctUntilChanged()
    );

    this.isDirector$ = combineLatest([this.isAdmin$, this.choirRoles$]).pipe(
      map(([isAdmin, choirRoles]) => {
        if (isAdmin) {
          return true;
        }
        return choirRoles.includes('director');
      }),
      distinctUntilChanged()
    );

    this.isSinger$ = this.choirRoles$.pipe(
      map(roles => roles.includes('singer')),
      distinctUntilChanged()
    );

    this.isSingerOnly$ = combineLatest([this.globalRoles$, this.choirRoles$]).pipe(
      map(([globalRoles, choirRoles]) => this.computeIsSingerOnly(globalRoles, choirRoles)),
      distinctUntilChanged()
    );

    if (this.hasToken()) {
      const token = this.getToken();
      if (token && !this.isTokenExpired(token)) {
        this.reloadUserFromServer();
        this.prefs.load().subscribe(p => {
          if (p.theme) {
            this.theme.setTheme(p.theme);
          }
        });
      } else {
        this.logout('sessionExpired');
      }
    }
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  private getUserFromStorage(): User | null {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private reloadUserFromServer(): void {
    if (this.userReloadTriggered) {
      return;
    }
    this.userReloadTriggered = true;
    this.http.get<User>(`${environment.apiUrl}/users/me`).pipe(
      tap(freshUser => {
        const existingModules = this.activeChoir$.value?.modules;
        let activeChoir = freshUser.activeChoir || null;
        if (activeChoir) {
          activeChoir = { ...activeChoir, modules: activeChoir.modules ?? existingModules };
        }
        const normalizedUser = this.withNormalizedChoirData({
          ...freshUser,
          activeChoir: activeChoir || undefined
        } as User);
        localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
        this.currentUserSubject.next(normalizedUser);
        this.setActiveChoir(normalizedUser.activeChoir || null);
        this.availableChoirs$.next(normalizedUser.availableChoirs || []);
      }),
      catchError(() => of(null))
    ).subscribe();
  }

  private migrateStorage(): void {
    const storedUser = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.accessToken) {
          localStorage.setItem(TOKEN_KEY, parsed.accessToken);
        }
      } catch {
        // ignore malformed data
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Check if the currently stored token is still valid.
   * Returns an observable that emits true when the token
   * has not expired and false otherwise.
   */
  isTokenValid(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return of(false);
    }
    if (this.isTokenExpired(token)) {
      return of(false);
    }
    return of(true);
  }

  verifyChoirAdminStatus(): Observable<boolean> {
    return this.http.get<{ isChoirAdmin: boolean }>(`${environment.apiUrl}/auth/check-choir-admin`).pipe(
      map(response => !!response?.isChoirAdmin),
      tap(isChoirAdmin => this.applyVerifiedChoirAdminStatus(isChoirAdmin)),
      catchError(() => of(false))
    );
  }

  private applyVerifiedChoirAdminStatus(isChoirAdmin: boolean): void {
    const currentUser = this.currentUserSubject.value;
    const activeChoir = currentUser?.activeChoir;
    if (!currentUser || !activeChoir) {
      return;
    }

    const membership: ChoirMembership = activeChoir.membership ?? {
      rolesInChoir: [],
      registrationStatus: 'REGISTERED'
    };
    const roles: ChoirRole[] = membership.rolesInChoir ?? [];
    const hasRole = roles.includes('choir_admin');

    if (hasRole === isChoirAdmin) {
      return;
    }

    const updatedRoles: ChoirRole[] = isChoirAdmin
      ? [...roles, 'choir_admin']
      : roles.filter(role => role !== 'choir_admin');

    const normalizedRoles = this.normalizeRoles<ChoirRole>(updatedRoles);

    const updatedActiveChoir: Choir = {
      ...activeChoir,
      membership: {
        ...membership,
        rolesInChoir: normalizedRoles
      }
    };

    const updatedAvailableChoirs = (currentUser.availableChoirs ?? []).map(choir => {
      if (choir.id !== updatedActiveChoir.id) {
        return choir;
      }
      const choirMembership: ChoirMembership = choir.membership ?? {
        rolesInChoir: [],
        registrationStatus: membership.registrationStatus
      };
      return {
        ...choir,
        membership: {
          ...choirMembership,
          rolesInChoir: normalizedRoles
        }
      };
    });

    const updatedUser: User = {
      ...currentUser,
      activeChoir: updatedActiveChoir,
      availableChoirs: updatedAvailableChoirs
    };

    this.setCurrentUser(updatedUser);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) {
        return false;
      }
      const expiry = payload.exp * 1000;
      return Date.now() >= expiry;
    } catch {
      return true;
    }
  }

  login(credentials: any): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/auth/signin`, credentials, { withCredentials: true }).pipe(
      tap((user: User) => {
        if (user.accessToken) {
          const normalizedUser = this.withNormalizedChoirData(user);
          localStorage.setItem(TOKEN_KEY, user.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
          this.loggedIn.next(true);
          this.currentUserSubject.next(normalizedUser);
          this.setActiveChoir(normalizedUser.activeChoir || null);
          this.availableChoirs$.next(normalizedUser.availableChoirs || []);

          this.prefs.load().subscribe(p => {
            if (p.theme) {
              this.theme.setTheme(p.theme);
            }
          });
        }
      })
    );
  }

  logout(reason?: string): void {
    // Clear httpOnly cookie on the server
    this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe();

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('theme');
    this.prefs.clear();
    this.loggedIn.next(false);
    this.currentUserSubject.next(null);
    this.setActiveChoir(null);
    this.availableChoirs$.next([]);
    const queryParams = reason === 'sessionExpired' ? { sessionExpired: true } : undefined;
    this.router.navigate(['/login'], { queryParams });
  }

  switchChoir(choirId: number): Observable<SwitchChoirResponse> {
    return this.http.post<SwitchChoirResponse>(`${environment.apiUrl}/auth/switch-choir/${choirId}`, {}).pipe(
      tap((response: SwitchChoirResponse) => {
        localStorage.setItem('auth-token', response.accessToken);
        const currentUser = this.currentUserSubject.value;
        if (currentUser) {
          const updatedUserBase: User = {
            ...currentUser,
            activeChoir: response.activeChoir || undefined,
            accessToken: response.accessToken
          };
          const normalizedUser = this.withNormalizedChoirData(updatedUserBase);
          localStorage.setItem('user', JSON.stringify(normalizedUser));
          this.currentUserSubject.next(normalizedUser);
          this.setActiveChoir(normalizedUser.activeChoir || null);
          this.availableChoirs$.next(normalizedUser.availableChoirs || []);
        }
        window.location.reload();
      })
    );
  }

  setCurrentUser(user: User): void {
    const normalizedUser = this.withNormalizedChoirData(user);
    this.logger.log('AuthService.setCurrentUser called', normalizedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    this.currentUserSubject.next(normalizedUser);
    this.setActiveChoir(normalizedUser.activeChoir || null);
    const choirs = normalizedUser.availableChoirs || [];
    this.logger.log('AuthService.setCurrentUser updated choirs', {
      active: normalizedUser.activeChoir,
      available: choirs
    });
    this.availableChoirs$.next(choirs);
  }

  setActiveChoir(choir: Choir | null): void {
    const normalized = normalizeChoir(choir);
    this.activeChoir$.next(normalized);
  }

  private withNormalizedChoirData(user: User): User {
    const existingActiveChoir = this.activeChoir$.value;
    const existingAvailableChoirs = this.availableChoirs$.value ?? [];

    const normalizedAvailableChoirs = normalizeChoirs(user.availableChoirs).map(choir => {
      const existing = existingAvailableChoirs.find(c => c.id === choir.id);
      if (!existing) {
        return choir;
      }
      return {
        ...choir,
        modules: choir.modules ?? existing.modules
      };
    });

    const normalizedActiveChoir = normalizeChoir(user.activeChoir ?? null);
    const fallbackModules = normalizedActiveChoir
      ? normalizedAvailableChoirs.find(c => c.id === normalizedActiveChoir.id)?.modules
      : undefined;
    const activeChoirWithModules = normalizedActiveChoir
      ? {
          ...normalizedActiveChoir,
          modules: normalizedActiveChoir.modules
            ?? (normalizedActiveChoir.id === existingActiveChoir?.id ? existingActiveChoir.modules : undefined)
            ?? fallbackModules
        }
      : null;

    return {
      ...user,
      activeChoir: activeChoirWithModules ?? undefined,
      availableChoirs: normalizedAvailableChoirs
    };
  }

  private extractGlobalRoles(user: User | null): GlobalRole[] {
    const rawRoles = user?.roles as unknown;
    let normalized: GlobalRole[];
    if (Array.isArray(rawRoles)) {
      const rolesArray = rawRoles as GlobalRole[];
      normalized = rolesArray.length ? rolesArray : ['user'];
    } else if (typeof rawRoles === 'string' && rawRoles.length > 0) {
      normalized = [rawRoles as GlobalRole];
    } else {
      normalized = ['user'];
    }
    return this.normalizeRoles(normalized);
  }

  private extractChoirRoles(choir: Choir | null): ChoirRole[] {
    const roles = choir?.membership?.rolesInChoir ?? [];
    return this.normalizeRoles(roles);
  }

  private normalizeRoles<T extends string>(roles: T[]): T[] {
    return Array.from(new Set(roles)).sort();
  }

  private rolesEqual<T extends string>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((role, idx) => role === b[idx]);
  }

  private computeIsSingerOnly(globalRoles: GlobalRole[], choirRoles: ChoirRole[]): boolean {
    if (!choirRoles.includes('singer')) {
      return false;
    }
    const hasGlobalPrivilege = globalRoles.some(role => role === 'admin' || role === 'librarian');
    if (hasGlobalPrivilege) {
      return false;
    }
    const hasChoirPrivilege = choirRoles.some(role =>
      role === 'choir_admin' || role === 'director' || role === 'organist');
    return !hasChoirPrivilege;
  }
}
