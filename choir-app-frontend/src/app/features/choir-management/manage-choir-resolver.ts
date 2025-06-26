import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from 'src/app/core/services/api.service';
import { ErrorService } from 'src/app/core/services/error.service';

@Injectable({
  providedIn: 'root'
})
export class ManageChoirResolver implements Resolve<any> {
  constructor(
    private apiService: ApiService,
    private errorService: ErrorService,
    private router: Router
  ) {}

  resolve(): Observable<any> {
    // Leeren Sie alte Fehler, bevor Sie eine neue Seite laden
    this.errorService.clearError();

    // Führen Sie alle notwendigen API-Aufrufe für diese Seite parallel aus
    return forkJoin({
      choirDetails: this.apiService.getMyChoirDetails(),
      members: this.apiService.getChoirMembers()
    }).pipe(
      catchError((error) => {
        // --- FEHLERFALL ---
        const errorMessage = error.error?.message || 'Could not load data for choir management.';
        // Setzen Sie den globalen Fehler
        this.errorService.setError({ message: errorMessage, status: error.status });
        // Brechen Sie die Navigation ab, indem Sie zu einer sicheren Seite umleiten (oder null zurückgeben)
        this.router.navigate(['/dashboard']);
        // Geben Sie ein leeres Observable zurück, um den Resolver-Stream zu beenden
        return of(null);
      })
    );
  }
}
