import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProgramGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.currentUser$.pipe(
      map(user => {
        const roles = Array.isArray(user?.roles) ? user!.roles : [];
        const allowed = roles.some(r => ['director', 'choir_admin', 'admin'].includes(r));
        return allowed ? true : this.router.createUrlTree(['/dashboard']);
      })
    );
  }
}
