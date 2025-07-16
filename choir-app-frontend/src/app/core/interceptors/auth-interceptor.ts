import { Injectable, Injector } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { environment } from '@env/environment';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private injector: Injector, private snackBar: MatSnackBar) {}

    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        // avoid injecting AuthService eagerly to prevent DI cycles
        const token = localStorage.getItem('auth-token');
        const isApiUrl = request.url.startsWith(environment.apiUrl);

        // Füge den Authorization-Header hinzu, wenn ein Token vorhanden ist.
        if (token && isApiUrl) {
            //console.log('Token found, adding to request:', token);

            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`,
                },
            });
        }

        //console.log('Request intercepted and token added if available:', request);

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    console.warn('Unauthorized error detected. Logging out user.');
                    const svc = this.injector.get(AuthService);
                    svc.logout('sessionExpired');
                } else if (error.status === 403) {
                    this.snackBar.open('Diese Funktion erfordert höhere Rechte.', 'Schließen', { duration: 5000 });
                }
                return throwError(() => error);
            })
        );
    }
}
