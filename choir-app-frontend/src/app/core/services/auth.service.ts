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
  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.loggedIn.asObservable();

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  public activeChoir$ = new BehaviorSubject<Choir | null>(this.getUserFromStorage()?.activeChoir || null);
  public availableChoirs$ = new BehaviorSubject<Choir[]>(this.getUserFromStorage()?.availableChoirs || []);

  // --- Wir leiten die Berechtigungen direkt vom currentUser$ ab ---
  public isAdmin$: Observable<boolean>;
  public isLibrarian$: Observable<boolean>;

  constructor(private http: HttpClient,
              private router: Router,
              private theme: ThemeService,
              private prefs: UserPreferencesService) {
    this.isAdmin$ = this.currentUser$.pipe(map(user => user?.role === 'admin'));
    this.isLibrarian$ = this.currentUser$.pipe(map(user => user?.role === 'librarian'));
    if (this.hasToken()) {
      this.prefs.load().subscribe(p => {
        if (p.theme) {
          this.theme.setTheme(p.theme);
        }
      });
    }
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Check if the currently stored token is still valid.
   * Returns an observable that emits true when the server
   * accepts the token and false otherwise.
   */
  isTokenValid(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return of(false);
    }

    return this.http.get<{ valid: boolean }>(`${environment.apiUrl}/auth/check-token`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
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

  setCurrentUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }
}
