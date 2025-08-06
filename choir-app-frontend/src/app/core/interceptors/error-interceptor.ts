import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorService } from '../services/error.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private errorService: ErrorService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error) => {
        if (req.url.includes('/auth/signin')) {
          return throwError(() => error);
        }
        if (error.status === 401) {
          // Unauthorized errors are handled by AuthInterceptor (logout and redirect).
          // Avoid showing them as global errors.
          return throwError(() => error);
        }
        if (error.status === 0 && (error as HttpErrorResponse).error === 'abort') {
          // The request was cancelled, e.g. due to logout. Avoid reporting an error.
          return throwError(() => error);
        }
        const message = error.name === 'TimeoutError'
          ? 'Die Anfrage hat zu lange gedauert.'
          : (error instanceof HttpErrorResponse ? (error.error?.message || error.message) : 'Unbekannter Fehler');

        this.errorService.setError({
          message,
          status: error.status,
          details: error.error?.details,
          stack: error.stack,
          url: req.url,
          file: undefined,
          line: undefined
        });
        console.error('HTTP Error:', error);

        return throwError(() => error);
      })
    );
  }
}
