import { Injectable } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, Resolve, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
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
      switchMap(isAdmin => {
        const choirIdParam = route.queryParamMap.get('choirId');
        const choirId = choirIdParam ? parseInt(choirIdParam, 10) : null;
        console.log('ManageChoirResolver: Resolving data for choirId:', choirId);

        const opts = isAdmin && choirId ? { choirId } : undefined;

        const choirDetails$ = this.apiService.getMyChoirDetails(opts);
        const collections$ = this.apiService.getChoirCollections(opts);
        const planRules$ = this.apiService.getPlanRules(opts);
        if (isAdmin) {
          return forkJoin({
            choirDetails: choirDetails$,
            members: this.apiService.getChoirMembers(opts),
            collections: collections$,
            planRules: planRules$,
            isChoirAdmin: of(true)
          });
        }
        return this.apiService.checkChoirAdminStatus().pipe(
          switchMap(status => {
            if (status.isChoirAdmin) {
              return forkJoin({
                choirDetails: choirDetails$,
                members: this.apiService.getChoirMembers(),
                collections: collections$,
                planRules: planRules$,
                isChoirAdmin: of(true)
              });
            } else {
              return forkJoin({
                choirDetails: choirDetails$,
                members: of([]),
                collections: collections$,
                planRules: planRules$,
                isChoirAdmin: of(false)
              });
            }
          })
        );
      }),
      catchError((error) => {
        if (error.status === 0 && error.error === 'abort') {
          // Request was cancelled, e.g. due to logout. Do not report an error.
          return of(null);
        }

        const errorMessage = error.error?.message || 'Could not load data for choir management.';
        console.error('ManageChoirResolver error', error);
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
