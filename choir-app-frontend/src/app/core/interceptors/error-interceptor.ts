import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private dialog: MatDialog) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error) => {
        const data: ConfirmDialogData = {
          title: 'Fehler',
          message: error.name === 'TimeoutError'
            ? 'Die Anfrage hat zu lange gedauert.'
            : (error instanceof HttpErrorResponse ? (error.error?.message || error.message) : 'Unbekannter Fehler'),
          confirmButtonText: 'Erneut versuchen',
          cancelButtonText: 'Abbrechen'
        };

        return this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().pipe(
          switchMap(retry => {
            if (retry) {
              return next.handle(req);
            }
            return throwError(() => error);
          })
        );
      })
    );
  }
}
