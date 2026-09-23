import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { UserPreferences } from '../models/user-preferences';
import { SKIP_GLOBAL_ERROR_REPORTING } from '../interceptors/error-interceptor';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private prefs$ = new BehaviorSubject<UserPreferences>({});
  private apiUrl = `${environment.apiUrl}/users/me/preferences`;
  private loaded = false;
  private loadRequest$: Observable<UserPreferences> | undefined;

  constructor(private http: HttpClient) {}

  load(): Observable<UserPreferences> {
    if (this.loaded) {
      return of(this.prefs$.value);
    }
    if (this.loadRequest$) {
      return this.loadRequest$;
    }

    const context = new HttpContext().set(SKIP_GLOBAL_ERROR_REPORTING, true);
    this.loadRequest$ = this.http.get<UserPreferences>(this.apiUrl, { context }).pipe(
      tap(p => {
        this.prefs$.next(p);
        this.loaded = true;
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 429) {
          // Preferences are optional. Keep the current defaults and avoid
          // repeatedly hitting the rate-limited endpoint during this session.
          this.loaded = true;
          return of(this.prefs$.value);
        }
        return throwError(() => error);
      }),
      finalize(() => this.loadRequest$ = undefined),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.loadRequest$;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getPreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] | undefined {
    return this.prefs$.value[key];
  }

  update(prefs: Partial<UserPreferences>): Observable<UserPreferences> {
    const newPrefs = { ...this.prefs$.value, ...prefs };
    return this.http.put<UserPreferences>(this.apiUrl, newPrefs).pipe(
      tap(p => this.prefs$.next(p))
    );
  }

  clear() {
    this.prefs$.next({});
    this.loaded = false;
    this.loadRequest$ = undefined;
  }
}
