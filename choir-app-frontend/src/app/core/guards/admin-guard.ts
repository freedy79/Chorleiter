import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isAdmin$) {
      return true; // Zugriff erlaubt
    }
    // Wenn kein Admin, zum Dashboard umleiten
    this.router.navigate(['/dashboard']);
    return false;
  }
}
