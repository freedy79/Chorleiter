import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Centralized notification service for displaying snackbar messages.
 * Handles success, error, warning, and info notifications with consistent styling.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly DEFAULT_SUCCESS_DURATION = 3000;
  private readonly DEFAULT_ERROR_DURATION = 5000;
  private readonly DEFAULT_WARNING_DURATION = 4000;
  private readonly DEFAULT_INFO_DURATION = 3000;

  constructor(private snackBar: MatSnackBar) {}

  /**
   * Displays a success message.
   * @param message The message to display
   * @param duration Duration in milliseconds (default: 3000)
   */
  success(message: string, duration?: number): void {
    this.show(message, 'OK', {
      duration: duration ?? this.DEFAULT_SUCCESS_DURATION,
      panelClass: 'success-snackbar'
    });
  }

  /**
   * Displays an error message.
   * Automatically extracts error messages from HttpErrorResponse objects.
   * @param messageOrError The error message or HttpErrorResponse object
   * @param duration Duration in milliseconds (default: 5000)
   */
  error(messageOrError: string | HttpErrorResponse | any, duration?: number): void {
    const message = this.extractErrorMessage(messageOrError);
    this.show(message, 'Schließen', {
      duration: duration ?? this.DEFAULT_ERROR_DURATION,
      panelClass: 'error-snackbar'
    });
  }

  /**
   * Displays a warning message.
   * @param message The message to display
   * @param duration Duration in milliseconds (default: 4000)
   */
  warning(message: string, duration?: number): void {
    this.show(message, 'OK', {
      duration: duration ?? this.DEFAULT_WARNING_DURATION,
      panelClass: 'warning-snackbar'
    });
  }

  /**
   * Displays an info message.
   * @param message The message to display
   * @param duration Duration in milliseconds (default: 3000)
   */
  info(message: string, duration?: number): void {
    this.show(message, 'OK', {
      duration: duration ?? this.DEFAULT_INFO_DURATION,
      panelClass: 'info-snackbar'
    });
  }

  /**
   * Extracts a user-friendly error message from various error types.
   * @param error The error object (HttpErrorResponse, Error, or string)
   * @returns A user-friendly error message
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      // Try to extract message from error response body
      if (error.error?.message) {
        return error.error.message;
      }

      // Fall back to status text or generic message
      if (error.statusText && error.statusText !== 'Unknown Error') {
        return `Fehler: ${error.statusText}`;
      }

      // Provide status-specific messages
      switch (error.status) {
        case 0:
          return 'Fehler: Keine Verbindung zum Server.';
        case 400:
          return 'Fehler: Ungültige Anfrage.';
        case 401:
          return 'Fehler: Nicht autorisiert.';
        case 403:
          return 'Fehler: Zugriff verweigert.';
        case 404:
          return 'Fehler: Ressource nicht gefunden.';
        case 409:
          return 'Fehler: Konflikt bei der Verarbeitung.';
        case 500:
          return 'Fehler: Interner Serverfehler.';
        default:
          return `Fehler: Ein unerwarteter Fehler ist aufgetreten (${error.status}).`;
      }
    }

    if (error instanceof Error) {
      return error.message || 'Ein unbekannter Fehler ist aufgetreten.';
    }

    if (error?.message) {
      return error.message;
    }

    return 'Ein unbekannter Fehler ist aufgetreten.';
  }

  /**
   * Internal method to show the snackbar with custom configuration.
   */
  private show(message: string, action: string, config: MatSnackBarConfig): void {
    this.snackBar.open(message, action, {
      verticalPosition: 'top',
      ...config
    });
  }
}
