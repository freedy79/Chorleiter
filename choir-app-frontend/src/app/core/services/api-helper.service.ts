import { Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Options for configuring API call behavior.
 */
export interface ApiCallOptions {
  /**
   * Message to display on successful completion (optional).
   * If provided, a success notification will be shown.
   */
  successMessage?: string;

  /**
   * Message to display on error (optional).
   * If not provided, error will be extracted from the response automatically.
   */
  errorMessage?: string;

  /**
   * Reference to a loading state BehaviorSubject.
   * Will be set to true before the call and false after completion.
   */
  loadingIndicator?: BehaviorSubject<boolean>;

  /**
   * If true, suppresses all notifications (success and error).
   * Default: false
   */
  silent?: boolean;

  /**
   * Custom success handler. Called after the API call succeeds.
   * If provided, will be called in addition to showing the success notification.
   */
  onSuccess?: (result: any) => void;

  /**
   * Custom error handler. Called after the API call fails.
   * If provided, will be called in addition to showing the error notification.
   * Return true to suppress the default error notification.
   */
  onError?: (error: any) => boolean | void;

  /**
   * Duration for success notification in milliseconds.
   * Defaults to NotificationService defaults.
   */
  successDuration?: number;

  /**
   * Duration for error notification in milliseconds.
   * Defaults to NotificationService defaults.
   */
  errorDuration?: number;
}

/**
 * Service to simplify API call handling with automatic loading states,
 * error handling, and notifications.
 *
 * Usage example:
 * ```
 * this.apiHelper.handleApiCall(
 *   this.apiService.updateEvent(id, data),
 *   {
 *     successMessage: 'Event aktualisiert.',
 *     loadingIndicator: this.isLoading$,
 *     onSuccess: () => this.loadEvents()
 *   }
 * ).subscribe();
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ApiHelperService {
  constructor(private notificationService: NotificationService) {}

  /**
   * Wraps an Observable API call with automatic loading state management,
   * error handling, and notifications.
   *
   * @param observable$ The Observable to wrap (typically an API call)
   * @param options Configuration options for the call
   * @returns The wrapped Observable with error handling and side effects
   */
  handleApiCall<T>(
    observable$: Observable<T>,
    options: ApiCallOptions = {}
  ): Observable<T> {
    // Set loading state to true if provided
    if (options.loadingIndicator) {
      options.loadingIndicator.next(true);
    }

    return observable$.pipe(
      tap((result) => {
        // Call custom success handler if provided
        if (options.onSuccess) {
          options.onSuccess(result);
        }

        // Show success notification if message provided and not silent
        if (options.successMessage && !options.silent) {
          this.notificationService.success(
            options.successMessage,
            options.successDuration
          );
        }
      }),
      catchError((error: HttpErrorResponse | any) => {
        // Call custom error handler if provided
        let suppressNotification = false;
        if (options.onError) {
          const result = options.onError(error);
          suppressNotification = result === true;
        }

        // Show error notification if not silent and not suppressed
        if (!options.silent && !suppressNotification) {
          const errorMessage = options.errorMessage || error;
          this.notificationService.error(errorMessage, options.errorDuration);
        }

        // Re-throw the error so the caller can handle it if needed
        return throwError(() => error);
      }),
      finalize(() => {
        // Set loading state to false when complete (success or error)
        if (options.loadingIndicator) {
          options.loadingIndicator.next(false);
        }
      })
    );
  }

  /**
   * Convenience method for API calls that only need error handling.
   *
   * @param observable$ The Observable to wrap
   * @param errorMessage Optional custom error message
   * @returns The wrapped Observable with error handling
   */
  withErrorHandling<T>(
    observable$: Observable<T>,
    errorMessage?: string
  ): Observable<T> {
    return this.handleApiCall(observable$, { errorMessage });
  }

  /**
   * Convenience method for API calls with loading indicator only.
   *
   * @param observable$ The Observable to wrap
   * @param loadingIndicator BehaviorSubject to track loading state
   * @returns The wrapped Observable with loading state management
   */
  withLoading<T>(
    observable$: Observable<T>,
    loadingIndicator: BehaviorSubject<boolean>
  ): Observable<T> {
    return this.handleApiCall(observable$, { loadingIndicator, silent: true });
  }
}
