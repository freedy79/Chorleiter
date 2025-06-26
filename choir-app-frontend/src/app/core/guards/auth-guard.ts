import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Diese Methode wird vom Angular Router aufgerufen, bevor eine Route aktiviert wird.
   * Sie entscheidet, ob die Navigation zur angeforderten Route erlaubt ist.
   */
  canActivate(): Observable<boolean | UrlTree> {

    // Wir verwenden das `isLoggedIn$`-Observable aus dem AuthService.
    // `isLoggedIn$` gibt `true` zurück, wenn ein gültiger Token im localStorage vorhanden ist.
    return this.authService.isLoggedIn$.pipe(
      take(1), // Wir benötigen nur den aktuellen Zustand, also nehmen wir den ersten Wert und beenden das Observable.
      map(isLoggedIn => {
        if (isLoggedIn) {
          // Wenn der Benutzer eingeloggt ist, erlauben wir die Navigation.
          return true;
        } else {
          // Wenn der Benutzer NICHT eingeloggt ist:
          // 1. Wir erstellen eine "UrlTree", die auf die '/login'-Seite verweist.
          // 2. Der Router wird diese Anweisung ausführen und den Benutzer umleiten.
          // Dies ist der empfohlene Weg, um Umleitungen in Guards durchzuführen.
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}
