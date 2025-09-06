import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProgramGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return combineLatest([this.auth.currentUser$, this.auth.activeChoir$]).pipe(
      map(([user, choir]) => {
        const roles = Array.isArray(user?.roles) ? user!.roles : [];
        const allowedRoles = roles.some(r => ['director', 'choir_admin', 'admin'].includes(r));
        const moduleEnabled = choir?.modules?.programs !== false;
        return allowedRoles && moduleEnabled ? true : this.router.createUrlTree(['/dashboard']);
      })
    );
  }
}
