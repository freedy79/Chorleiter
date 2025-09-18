import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ChoirAdminGuard implements CanActivate {
  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return combineLatest([this.auth.isAdmin$, this.auth.isChoirAdmin$, this.auth.isDemo$]).pipe(
      map(([isAdmin, isChoirAdmin, isDemo]) => {
        if (!isDemo && (isAdmin || isChoirAdmin)) {
          return true;
        }
        return this.router.createUrlTree(['/collections']);
      })
    );
  }
}
