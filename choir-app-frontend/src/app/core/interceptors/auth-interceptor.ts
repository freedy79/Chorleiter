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
import { NotificationService } from '../services/notification.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private injector: Injector, private notification: NotificationService) {}

    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        // avoid injecting AuthService eagerly to prevent DI cycles
        const token = localStorage.getItem('auth-token');
        const isApiUrl = request.url.startsWith(environment.apiUrl);

        if (isApiUrl) {
            // Send httpOnly cookie with every API request
            request = request.clone({ withCredentials: true });

            // Fallback: also send Authorization header if token exists in localStorage
            // (migration period until all tokens are cookie-based)
            if (token) {
                request = request.clone({
                    setHeaders: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }
        }

        //console.log('Request intercepted and token added if available:', request);

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    const svc = this.injector.get(AuthService);
                    svc.logout('sessionExpired');
                } else if (error.status === 403) {
                    this.notification.error('Diese Funktion erfordert höhere Rechte.');
                }
                return throwError(() => error);
            })
        );
    }
}
