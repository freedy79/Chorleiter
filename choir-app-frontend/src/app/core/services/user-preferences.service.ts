import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { UserPreferences } from '../models/user-preferences';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private prefs$ = new BehaviorSubject<UserPreferences>({});
  private apiUrl = `${environment.apiUrl}/users/me/preferences`;

  constructor(private http: HttpClient) {}

  load(): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(this.apiUrl).pipe(
      tap(p => this.prefs$.next(p))
    );
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
  }
}
