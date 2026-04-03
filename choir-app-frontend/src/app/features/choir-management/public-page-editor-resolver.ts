import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { ApiService } from 'src/app/core/services/api.service';
import { ErrorService } from 'src/app/core/services/error.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ChoirPublicPage } from '@core/models/choir-public-page';

@Injectable({
  providedIn: 'root'
})
export class PublicPageEditorResolver implements Resolve<ChoirPublicPage | null> {
  constructor(
    private apiService: ApiService,
    private errorService: ErrorService,
    private router: Router,
    private authService: AuthService
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<ChoirPublicPage | null> {
    this.errorService.clearError();

    return this.authService.isAdmin$.pipe(
      take(1),
      switchMap((isAdmin) => {
        const choirIdParam = route.queryParamMap.get('choirId');
        const choirId = choirIdParam ? parseInt(choirIdParam, 10) : null;
        const opts = isAdmin && choirId ? { choirId } : undefined;
        return this.apiService.getMyPublicPage(opts);
      }),
      catchError((error) => {
        if (error.status === 0 && error.error === 'abort') {
          return of(null);
        }
        const errorMessage = error.error?.message || 'Vorstellungsseite konnte nicht geladen werden.';
        this.errorService.setError({
          message: errorMessage,
          status: error.status,
          stack: error.stack,
          url: this.router.url
        });
        this.router.navigate(['/dashboard']);
        return of(null);
      })
    );
  }
}
