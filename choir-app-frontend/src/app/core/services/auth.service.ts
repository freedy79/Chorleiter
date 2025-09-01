import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { User } from '../models/user';
import { Choir } from '../models/choir';
import { SwitchChoirResponse } from '../models/auth';
import { ThemeService } from './theme.service';
import { UserPreferencesService } from './user-preferences.service';

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
  public isAdmin$: Observable<boolean>;
  public isLibrarian$: Observable<boolean>;

  constructor(private http: HttpClient,
              private router: Router,
              private theme: ThemeService,
              private prefs: UserPreferencesService) {
    this.migrateStorage();
    this.loggedIn.next(this.hasToken());

    const storedUser = this.getUserFromStorage();
    if (storedUser) {
      this.currentUserSubject.next(storedUser);
      this.activeChoir$.next(storedUser.activeChoir || null);
      this.availableChoirs$.next(storedUser.availableChoirs || []);
    }

    this.isAdmin$ = this.currentUser$.pipe(
      map(user => {
        const roles = Array.isArray(user?.roles)
          ? user.roles
          : user?.roles ? [user.roles] : [];
        return roles.includes('admin');
      })
    );
    this.isLibrarian$ = this.currentUser$.pipe(
      map(user => {
        const roles = Array.isArray(user?.roles)
          ? user.roles
          : user?.roles ? [user.roles] : [];
        return roles.includes('librarian');
      })
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
        const updatedUser = { ...freshUser, activeChoir } as User;
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        this.currentUserSubject.next(updatedUser);
        this.activeChoir$.next(activeChoir);
        this.availableChoirs$.next(updatedUser.availableChoirs || []);
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
    return this.http.post<User>(`${environment.apiUrl}/auth/signin`, credentials).pipe(
      tap((user: User) => {
        if (user.accessToken) {
          localStorage.setItem(TOKEN_KEY, user.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          this.loggedIn.next(true);
          this.currentUserSubject.next(user);
          this.activeChoir$.next(user.activeChoir || null);
          this.availableChoirs$.next(user.availableChoirs || []);

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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('theme');
    this.prefs.clear();
    this.loggedIn.next(false);
    this.currentUserSubject.next(null);
    this.activeChoir$.next(null);
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
          const updatedUser: User = { ...currentUser, activeChoir: response.activeChoir, accessToken: response.accessToken };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
          this.activeChoir$.next(response.activeChoir);
        }
        window.location.reload();
      })
    );
  }

  setCurrentUser(user: User): void {
    console.debug('AuthService.setCurrentUser called', user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.activeChoir$.next(user.activeChoir || null);
    const choirs = user.availableChoirs || [];
    console.debug('AuthService.setCurrentUser updated choirs', {
      active: user.activeChoir,
      available: choirs
    });
    this.availableChoirs$.next(choirs);
  }
}
