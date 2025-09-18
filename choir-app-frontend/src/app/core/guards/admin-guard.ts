import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return combineLatest([this.authService.isAdmin$, this.authService.isDemo$]).pipe(
      map(([isAdmin, isDemo]) => {
        if (isAdmin && !isDemo) {
          return true;
        }
        return this.router.createUrlTree(['/dashboard']);
      })
    );
  }
}
