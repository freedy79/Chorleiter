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
        const message = error.name === 'TimeoutError'
          ? 'Die Anfrage hat zu lange gedauert.'
          : (error instanceof HttpErrorResponse ? (error.error?.message || error.message) : 'Unbekannter Fehler');

        this.errorService.setError({
          message,
          status: error.status,
          details: error.error?.details
        });
        console.error('HTTP Error:', error);

        return throwError(() => error);
      })
    );
  }
}
