import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { ApiService } from 'src/app/core/services/api.service';
import { ErrorService } from 'src/app/core/services/error.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ManageChoirResolver implements Resolve<any> {
  constructor(
    private apiService: ApiService,
    private errorService: ErrorService,
    private router: Router,
    private authService: AuthService
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    // Leeren Sie alte Fehler, bevor Sie eine neue Seite laden
    this.errorService.clearError();

    return this.authService.isAdmin$.pipe(
      take(1),
      switchMap((isAdmin) => {
        const choirIdParam = route.queryParamMap.get('choirId');
        const choirId = choirIdParam ? parseInt(choirIdParam, 10) : null;

        const opts = isAdmin && choirId ? { choirId } : undefined;

        const choirDetails$ = this.apiService.getMyChoirDetails(opts);
        const collections$ = this.apiService.getChoirCollections(opts);
        const planRules$ = this.apiService.getPlanRules(opts);

        if (isAdmin) {
          const logs$ = this.apiService.getChoirLogs(opts);
          return forkJoin({
            choirDetails: choirDetails$,
            members: this.apiService.getChoirMembers(opts),
            collections: collections$,
            planRules: planRules$,
            logs: logs$,
            isChoirAdmin: of(true)
          });
        }

        return this.authService.verifyChoirAdminStatus().pipe(
          switchMap((isChoirAdmin) => {
            const logs$ = isChoirAdmin ? this.apiService.getChoirLogs() : of([]);
            const members$ = isChoirAdmin ? this.apiService.getChoirMembers() : of([]);
            return forkJoin({
              choirDetails: choirDetails$,
              members: members$,
              collections: collections$,
              planRules: planRules$,
              logs: logs$,
              isChoirAdmin: of(isChoirAdmin)
            });
          })
        );
      }),
      catchError((error) => {
        if (error.status === 0 && error.error === 'abort') {
          // Request was cancelled, e.g. due to logout. Do not report an error.
          return of(null);
        }

        const errorMessage = error.error?.message || 'Could not load data for choir management.';
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
