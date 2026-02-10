import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { NotificationService } from '../services/notification.service';
import { inject } from '@angular/core';

/**
 * RxJS operator that automatically manages a loading state BehaviorSubject.
 * Sets loading to true when the observable starts and false when it completes or errors.
 *
 * Usage:
 * ```typescript
 * this.apiService.getData().pipe(
 *   withLoadingState(this.isLoading$)
 * ).subscribe();
 * ```
 */
export function withLoadingState<T>(
  loadingIndicator: BehaviorSubject<boolean>
) {
  return (source: Observable<T>): Observable<T> => {
    loadingIndicator.next(true);
    return source.pipe(
      finalize(() => loadingIndicator.next(false))
    );
  };
}

/**
 * RxJS operator that shows notifications on success and/or error.
 * Requires NotificationService to be provided in the injection context.
 *
 * Usage:
 * ```typescript
 * this.apiService.deleteItem(id).pipe(
 *   withNotification({ success: 'Item deleted' })
 * ).subscribe();
 * ```
 */
export function withNotification<T>(options: {
  success?: string;
  error?: string;
  successDuration?: number;
  errorDuration?: number;
}) {
  return (source: Observable<T>): Observable<T> => {
    const notificationService = inject(NotificationService);

    return source.pipe(
      tap(() => {
        if (options.success) {
          notificationService.success(options.success, options.successDuration);
        }
      }),
      catchError((error) => {
        if (options.error) {
          notificationService.error(options.error, options.errorDuration);
        } else {
          notificationService.error(error, options.errorDuration);
        }
        throw error;
      })
    );
  };
}

/**
 * RxJS operator that combines loading state and notifications.
 * Requires NotificationService to be provided in the injection context.
 *
 * Usage:
 * ```typescript
 * this.apiService.updateItem(data).pipe(
 *   withApiHandling(this.isLoading$, {
 *     success: 'Item updated',
 *     error: 'Failed to update item'
 *   })
 * ).subscribe();
 * ```
 */
export function withApiHandling<T>(
  loadingIndicator: BehaviorSubject<boolean>,
  notificationOptions?: {
    success?: string;
    error?: string;
    successDuration?: number;
    errorDuration?: number;
  }
) {
  return (source: Observable<T>): Observable<T> => {
    const notificationService = inject(NotificationService);
    loadingIndicator.next(true);

    return source.pipe(
      tap(() => {
        if (notificationOptions?.success) {
          notificationService.success(
            notificationOptions.success,
            notificationOptions.successDuration
          );
        }
      }),
      catchError((error) => {
        if (notificationOptions?.error) {
          notificationService.error(
            notificationOptions.error,
            notificationOptions.errorDuration
          );
        } else {
          notificationService.error(error, notificationOptions?.errorDuration);
        }
        throw error;
      }),
      finalize(() => loadingIndicator.next(false))
    );
  };
}
