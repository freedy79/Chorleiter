import { Injectable } from '@angular/core';
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

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private authService: AuthService) {}

    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        const token = this.authService.getToken();
        const isApiUrl = request.url.startsWith(environment.apiUrl);

        // Füge den Authorization-Header hinzu, wenn ein Token vorhanden ist.
        if (token && isApiUrl) {
            console.log('Token found, adding to request:', token);

            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`,
                },
            });
        }

        console.log(
            'Request intercepted and token added if available:',
            request
        );

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                // --- DAS IST DIE WICHTIGE LOGIK ---
                // Wenn der API-Server mit 401 (Unauthorized) oder 403 (Forbidden) antwortet,
                // bedeutet das, unser Token ist schlecht.
                if (error.status === 401 || error.status === 403) {
                    // Loggen Sie den Benutzer aus. Dies löscht den ungültigen Token
                    // und leitet den Benutzer zur Login-Seite um.
                    console.warn(
                        'Unauthorized or Forbidden error detected. Logging out user.'
                    );
                    this.authService.logout();
                }
                // Leiten Sie den Fehler an den aufrufenden Service weiter, damit er auch behandelt werden kann.
                return throwError(() => error);
            })
        );
    }
}
