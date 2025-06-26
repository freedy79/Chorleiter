import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    // Wir prüfen, ob der Benutzer eingeloggt ist.
    return this.authService.isLoggedIn$.pipe(
      take(1),
      map(isLoggedIn => {
        if (isLoggedIn) {
          // WENN der Benutzer bereits eingeloggt ist,
          // erlauben wir den Zugriff auf die Login-Seite NICHT.
          // Stattdessen leiten wir ihn zum Dashboard um.
          return this.router.createUrlTree(['/dashboard']);
        } else {
          // WENN der Benutzer NICHT eingeloggt ist,
          // erlauben wir den Zugriff auf die Login-Seite.
          return true;
        }
      })
    );
  }
}
