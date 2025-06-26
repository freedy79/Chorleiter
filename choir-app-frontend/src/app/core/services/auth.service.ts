import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { User } from '@core/models/user';
import { Choir } from '@core/models/choir';
import { SwitchChoirResponse } from '@core/models/auth';

const TOKEN_KEY = 'auth-token';
const USER_KEY = 'user';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
    isLoggedIn$ = this.loggedIn.asObservable();

    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();
    public activeChoir$ = new BehaviorSubject<Choir | null>(null);
    public availableChoirs$ = new BehaviorSubject<Choir[]>([]);

    constructor(private http: HttpClient, private router: Router) {
        const user = localStorage.getItem('user');
        if (user) {
            const parsedUser = JSON.parse(user);
            this.currentUserSubject.next(parsedUser);
            this.activeChoir$.next(parsedUser.activeChoir);
            this.availableChoirs$.next(parsedUser.availableChoirs);
        }
    }

    private hasToken(): boolean {
        return !!localStorage.getItem(TOKEN_KEY);
    }

    private getUserFromStorage(): User | null {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    login(credentials: any): Observable<User> {
        return this.http
            .post<User>(`${environment.apiUrl}/auth/signin`, credentials)
            .pipe(
                tap((user: User) => {
                    if (user.accessToken) {
                        localStorage.setItem(TOKEN_KEY, user.accessToken);
                        localStorage.setItem(USER_KEY, JSON.stringify(user));
                        this.loggedIn.next(true);
                        this.currentUserSubject.next(user);
                        this.activeChoir$.next(user.activeChoir!);
                        this.availableChoirs$.next(user.availableChoirs!);
                    }
                })
            );
    }

    logout(): void {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        this.activeChoir$.next(null);
        this.availableChoirs$.next([]);
        this.loggedIn.next(false);
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }

    isAdmin(): boolean {
        return this.currentUserSubject.value?.role === 'admin';
    }

    switchChoir(choirId: number): Observable<SwitchChoirResponse> {
        return this.http
            .post<any>(`${environment.apiUrl}/auth/switch-choir/${choirId}`, {})
            .pipe(
                tap((response: SwitchChoirResponse) => {
                    // Ersetzen Sie den alten Token und die Benutzerdaten
                    localStorage.setItem('auth-token', response.accessToken);

                    const currentUser = this.currentUserSubject.value;
                    if (currentUser) {
                        const updatedUser = {
                            ...currentUser,
                            activeChoir: response.activeChoir,
                            accessToken: response.accessToken,
                        };
                        localStorage.setItem(
                            'user',
                            JSON.stringify(updatedUser)
                        );
                        this.currentUserSubject.next(updatedUser);
                        this.activeChoir$.next(response.activeChoir);
                    }

                    // Wichtig: Neuladen der Seite, damit alle Komponenten die neuen Daten abrufen
                    window.location.reload();
                })
            );
    }
}
