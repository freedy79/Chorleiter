import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
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

    return this.apiService.checkChoirAdminStatus().pipe(
      switchMap(status => {
        const choirDetails$ = this.apiService.getMyChoirDetails();
        if (status.isChoirAdmin) {
          return forkJoin({
            choirDetails: choirDetails$,
            members: this.apiService.getChoirMembers(),
            isChoirAdmin: of(true)
          });
        } else {
          return forkJoin({
            choirDetails: choirDetails$,
            members: of([]),
            isChoirAdmin: of(false)
          });
        }
      }),
      catchError((error) => {
        const errorMessage = error.error?.message || 'Could not load data for choir management.';
        this.errorService.setError({ message: errorMessage, status: error.status });
        this.router.navigate(['/dashboard']);
        return of(null);
      })
    );
  }
}
