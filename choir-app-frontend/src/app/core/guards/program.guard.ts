import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProgramGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return combineLatest([this.auth.isAdmin$, this.auth.activeChoir$, this.auth.isDemo$]).pipe(
      map(([isAdmin, choir, isDemo]) => {
        if (isDemo) {
          return this.router.createUrlTree(['/dashboard']);
        }
        const moduleEnabled = choir?.modules?.programs !== false;
        const roles = choir?.membership?.rolesInChoir ?? [];
        const choirPrivilege = roles.some(role => ['choir_admin', 'director'].includes(role));
        const allowed = moduleEnabled && (isAdmin || choirPrivilege);
        return allowed ? true : this.router.createUrlTree(['/dashboard']);
      })
    );
  }
}
