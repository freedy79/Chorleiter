import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  // Diese Komponente hat kein eigenes Template, da sie nur weiterleitet.
  template: '',
})
export class HomeComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Wir prüfen den Login-Status und leiten entsprechend weiter.
    this.authService.isLoggedIn$.pipe(
      take(1) // Wir brauchen nur den ersten/aktuellen Wert.
    ).subscribe(isLoggedIn => {
      if (isLoggedIn) {
        // Wenn eingeloggt, zum Dashboard.
        this.router.navigate(['/dashboard']);
      } else {
        // Wenn nicht eingeloggt, zum Login.
        this.router.navigate(['/login']);
      }
    });
  }
}
