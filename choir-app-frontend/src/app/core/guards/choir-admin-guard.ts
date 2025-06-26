import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ChoirAdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    // Kombinieren Sie die Überprüfungen
    return this.authService.isAdmin$.pipe(
      switchMap(isAdmin => {
        // Wenn der Benutzer ein globaler Admin ist, erlauben Sie den Zugriff sofort.
        if (isAdmin) {
          return of(true);
        }
        // Wenn nicht, fragen Sie das Backend nach der Choir-Admin-Rolle.
        return this.apiService.checkChoirAdminStatus().pipe(
          map(response => {
            if (response.isChoirAdmin) {
              return true; // Zugriff erlaubt
            } else {
              // Wenn kein Admin und kein Choir-Admin, zum Dashboard umleiten.
              return this.router.createUrlTree(['/dashboard']);
            }
          }),
          catchError(() => {
            // Bei einem Fehler bei der API-Anfrage den Zugriff verweigern und umleiten.
            return of(this.router.createUrlTree(['/dashboard']));
          })
        );
      })
    );
  }
}
