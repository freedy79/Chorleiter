import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProgramGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return combineLatest([this.auth.isChoirAdmin$, this.auth.isDirector$, this.auth.activeChoir$]).pipe(
      map(([isChoirAdmin, isDirector, choir]) => {
        const allowed = isChoirAdmin || isDirector;
        const moduleEnabled = choir?.modules?.programs !== false;
        return allowed && moduleEnabled ? true : this.router.createUrlTree(['/dashboard']);
      })
    );
  }
}
