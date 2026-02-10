import { Injectable, Type } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { ApiHelperService } from './api-helper.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '@shared/components/confirm-dialog/confirm-dialog.component';

/**
 * Configuration for opening any dialog
 */
export interface DialogConfig<TData = any> extends Partial<MatDialogConfig<TData>> {
  /**
   * Dialog width. Defaults to '600px' for form dialogs, '400px' for confirmations.
   */
  width?: string;

  /**
   * Data to pass to the dialog
   */
  data?: TData;

  /**
   * Maximum width for the dialog
   */
  maxWidth?: string;

  /**
   * Disable closing by clicking outside or pressing ESC
   */
  disableClose?: boolean;
}

/**
 * Configuration for dialogs that trigger API calls
 */
export interface DialogApiConfig<TResult, TApiResponse = TResult> {
  /**
   * Message to show on successful API completion
   */
  successMessage?: string;

  /**
   * Message to show on API error
   */
  errorMessage?: string;

  /**
   * Custom success handler - called after API succeeds
   * Return value is ignored; use for side effects like state updates
   */
  onSuccess?: (response: TApiResponse) => void;

  /**
   * Callback to refresh/reload data after successful operation
   * This is called AFTER onSuccess
   */
  onRefresh?: () => void;

  /**
   * Custom error handler - called after API fails
   * Return true to suppress default error notification
   */
  onError?: (error: any) => boolean | void;

  /**
   * Loading indicator to track operation progress
   */
  loadingIndicator?: BehaviorSubject<boolean>;

  /**
   * If true, suppresses all notifications
   */
  silent?: boolean;

  /**
   * Function that transforms dialog result before passing to API
   * Useful when dialog returns different shape than API expects
   */
  transformResult?: (dialogResult: TResult) => any;

  /**
   * Predicate to determine if dialog result should trigger API call
   * Defaults to checking if result is truthy
   */
  shouldProceed?: (dialogResult: TResult | null | undefined) => boolean;

  /**
   * Duration for success notification in milliseconds
   */
  successDuration?: number;

  /**
   * Duration for error notification in milliseconds
   */
  errorDuration?: number;
}

/**
 * Options for confirmation dialogs
 */
export interface ConfirmOptions {
  /**
   * Title of the confirmation dialog
   */
  title: string;

  /**
   * Message/question to display
   */
  message: string;

  /**
   * Text for the confirm button. Defaults to 'Bestätigen'
   */
  confirmButtonText?: string;

  /**
   * Text for the cancel button. Defaults to 'Abbrechen'
   */
  cancelButtonText?: string;

  /**
   * Dialog width. Defaults to '400px' for confirmations
   */
  width?: string;
}

/**
 * Options for delete confirmations
 */
export interface DeleteConfirmOptions extends Omit<ConfirmOptions, 'title' | 'confirmButtonText' | 'message'> {
  /**
   * Name of the item being deleted (used in title and message)
   */
  itemName: string;

  /**
   * Custom title override. Defaults to '{itemName} löschen?'
   */
  title?: string;

  /**
   * Custom message override. Defaults to 'Möchten Sie {itemName} wirklich löschen?'
   */
  message?: string;

  /**
   * Confirm button text. Defaults to 'Löschen'
   */
  confirmButtonText?: string;
}

/**
 * Service to simplify dialog handling across the application.
 * Eliminates repetitive dialog code patterns and standardizes error handling,
 * notifications, and data reloading.
 *
 * @example
 * // Simple confirmation
 * this.dialogHelper.confirm({
 *   title: 'Abbrechen?',
 *   message: 'Möchten Sie wirklich abbrechen?'
 * }).subscribe(confirmed => {
 *   if (confirmed) this.router.navigate(['/home']);
 * });
 *
 * @example
 * // Delete with confirmation
 * this.dialogHelper.confirmDelete(
 *   { itemName: 'diesen Beitrag' },
 *   () => this.api.deletePost(postId),
 *   {
 *     successMessage: 'Beitrag gelöscht',
 *     onRefresh: () => this.loadPosts()
 *   }
 * ).subscribe();
 *
 * @example
 * // Create dialog with API call
 * this.dialogHelper.openCreateDialog(
 *   PieceDialogComponent,
 *   (formData) => this.api.createPiece(formData),
 *   {
 *     successMessage: 'Stück erstellt',
 *     onSuccess: (piece) => this.pieces.push(piece)
 *   }
 * ).subscribe();
 */
@Injectable({
  providedIn: 'root'
})
export class DialogHelperService {
  constructor(
    private dialog: MatDialog,
    private apiHelper: ApiHelperService
  ) {}

  /**
   * Opens a generic dialog and returns the result as an Observable.
   * Use this for simple dialogs that don't need API integration.
   *
   * @example
   * // Simple info dialog
   * this.dialogHelper.openDialog(InfoDialogComponent, { width: '400px' })
   *   .subscribe(result => console.log(result));
   *
   * @example
   * // Form dialog with manual API call
   * this.dialogHelper.openDialog(UserFormDialog, { data: { userId: 123 } })
   *   .pipe(
   *     filter(result => !!result),
   *     switchMap(result => this.api.updateUser(result))
   *   )
   *   .subscribe();
   *
   * @param component The dialog component to open
   * @param config Optional dialog configuration
   * @returns Observable that emits the dialog result when closed
   */
  openDialog<TComponent, TResult = any, TData = any>(
    component: Type<TComponent>,
    config?: DialogConfig<TData>
  ): Observable<TResult | undefined> {
    const dialogRef = this.dialog.open(component, {
      width: config?.width || '600px',
      ...config
    });

    return dialogRef.afterClosed();
  }

  /**
   * Opens a dialog and automatically handles the API call based on the result.
   * This is the most common pattern: dialog returns data → API call → refresh.
   *
   * @example
   * // Create operation: dialog returns form data, API creates item, array is updated
   * this.dialogHelper.openDialogWithApi(
   *   PieceDialogComponent,
   *   (formData) => this.api.createPiece(formData),
   *   {
   *     dialogConfig: { width: '600px' },
   *     apiConfig: {
   *       successMessage: 'Stück erstellt',
   *       onSuccess: (piece) => this.pieces.push(piece)
   *     }
   *   }
   * ).subscribe();
   *
   * @example
   * // Update operation: dialog with existing data, API updates, list reloaded
   * this.dialogHelper.openDialogWithApi(
   *   EventDialogComponent,
   *   (formData) => this.api.updateEvent(eventId, formData),
   *   {
   *     dialogConfig: {
   *       width: '600px',
   *       data: { event: existingEvent }
   *     },
   *     apiConfig: {
   *       successMessage: 'Event aktualisiert',
   *       onRefresh: () => this.loadEvents()
   *     }
   *   }
   * ).subscribe();
   *
   * @example
   * // Silent operation: no notifications, just state update
   * this.dialogHelper.openDialogWithApi(
   *   ProgramPieceDialogComponent,
   *   (result) => this.programService.addPieceItem(this.programId, result),
   *   {
   *     apiConfig: {
   *       silent: true,
   *       onSuccess: (item) => this.items = [...this.items, this.enhanceItem(item)]
   *     }
   *   }
   * ).subscribe();
   *
   * @param component The dialog component to open
   * @param apiCall Function that receives the dialog result and returns an Observable API call
   * @param options Configuration for both the dialog and the API call
   * @returns Observable that emits the API response or undefined if dialog was cancelled
   */
  openDialogWithApi<TComponent, TDialogResult, TApiResponse = TDialogResult>(
    component: Type<TComponent>,
    apiCall: (dialogResult: TDialogResult) => Observable<TApiResponse>,
    options?: {
      dialogConfig?: DialogConfig;
      apiConfig?: DialogApiConfig<TDialogResult, TApiResponse>;
    }
  ): Observable<TApiResponse | undefined> {
    const dialogRef = this.dialog.open(component, {
      width: options?.dialogConfig?.width || '600px',
      ...options?.dialogConfig
    });

    return dialogRef.afterClosed().pipe(
      switchMap((result: TDialogResult | null | undefined) => {
        // Check if we should proceed
        const shouldProceed = options?.apiConfig?.shouldProceed
          ? options.apiConfig.shouldProceed(result)
          : !!result;

        if (!shouldProceed) {
          return of(undefined);
        }

        // Transform result if transformer provided
        const transformedResult = options?.apiConfig?.transformResult
          ? options.apiConfig.transformResult(result!)
          : result!;

        // Execute API call with apiHelper
        return this.apiHelper.handleApiCall(
          apiCall(transformedResult),
          {
            successMessage: options?.apiConfig?.successMessage,
            errorMessage: options?.apiConfig?.errorMessage,
            loadingIndicator: options?.apiConfig?.loadingIndicator,
            silent: options?.apiConfig?.silent,
            successDuration: options?.apiConfig?.successDuration,
            errorDuration: options?.apiConfig?.errorDuration,
            onSuccess: (response: TApiResponse) => {
              // Call onSuccess first
              if (options?.apiConfig?.onSuccess) {
                options.apiConfig.onSuccess(response);
              }
              // Then call onRefresh (common pattern: update state, then reload)
              if (options?.apiConfig?.onRefresh) {
                options.apiConfig.onRefresh();
              }
            },
            onError: options?.apiConfig?.onError
          }
        );
      })
    );
  }

  /**
   * Opens a confirmation dialog and returns Observable<boolean>.
   * Use this when you need user confirmation but handle the logic yourself.
   *
   * @example
   * // Simple confirmation
   * this.dialogHelper.confirm({
   *   title: 'Abbrechen?',
   *   message: 'Möchten Sie wirklich abbrechen?'
   * }).subscribe(confirmed => {
   *   if (confirmed) {
   *     this.router.navigate(['/home']);
   *   }
   * });
   *
   * @param options Configuration for the confirmation dialog
   * @returns Observable<boolean> - true if confirmed, false if cancelled
   */
  confirm(options: ConfirmOptions): Observable<boolean> {
    const dialogData: ConfirmDialogData = {
      title: options.title,
      message: options.message,
      confirmButtonText: options.confirmButtonText,
      cancelButtonText: options.cancelButtonText
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: options.width || '400px',
      data: dialogData
    });

    return dialogRef.afterClosed().pipe(
      map(result => !!result)
    );
  }

  /**
   * Shows a delete confirmation dialog and executes the delete API call if confirmed.
   * This is the most streamlined method for the common delete pattern.
   *
   * @example
   * // Delete with default messages
   * this.dialogHelper.confirmDelete(
   *   { itemName: 'diesen Beitrag' },
   *   () => this.api.deletePost(postId),
   *   {
   *     successMessage: 'Beitrag gelöscht',
   *     onRefresh: () => this.loadPosts()
   *   }
   * ).subscribe();
   *
   * @example
   * // Delete with array update instead of reload
   * this.dialogHelper.confirmDelete(
   *   { itemName: 'dieses Event' },
   *   () => this.api.deleteEvent(eventId),
   *   {
   *     successMessage: 'Event gelöscht',
   *     onSuccess: () => {
   *       this.events = this.events.filter(e => e.id !== eventId);
   *     }
   *   }
   * ).subscribe();
   *
   * @example
   * // Delete with custom message
   * this.dialogHelper.confirmDelete(
   *   {
   *     itemName: 'den Eintrag',
   *     title: 'Wirklich löschen?',
   *     message: 'Diese Aktion kann nicht rückgängig gemacht werden.'
   *   },
   *   () => this.api.deletePlanEntry(entryId),
   *   {
   *     successMessage: 'Eintrag gelöscht',
   *     onRefresh: () => this.loadEntries()
   *   }
   * ).subscribe();
   *
   * @param options Delete confirmation options including item name
   * @param deleteApiCall Function that returns the delete API call Observable
   * @param apiConfig Optional API configuration (success/error handlers, messages, etc.)
   * @returns Observable that emits the API response or undefined if cancelled
   */
  confirmDelete<TResponse = void>(
    options: DeleteConfirmOptions,
    deleteApiCall: () => Observable<TResponse>,
    apiConfig?: Omit<DialogApiConfig<boolean, TResponse>, 'transformResult' | 'shouldProceed'>
  ): Observable<TResponse | undefined> {
    const confirmOptions: ConfirmOptions = {
      title: options.title || `${options.itemName} löschen?`,
      message: options.message || `Möchten Sie ${options.itemName} wirklich löschen?`,
      confirmButtonText: options.confirmButtonText || 'Löschen',
      cancelButtonText: options.cancelButtonText,
      width: options.width
    };

    return this.confirm(confirmOptions).pipe(
      switchMap(confirmed => {
        if (!confirmed) {
          return of(undefined);
        }

        return this.apiHelper.handleApiCall(
          deleteApiCall(),
          {
            successMessage: apiConfig?.successMessage,
            errorMessage: apiConfig?.errorMessage,
            loadingIndicator: apiConfig?.loadingIndicator,
            silent: apiConfig?.silent,
            successDuration: apiConfig?.successDuration,
            errorDuration: apiConfig?.errorDuration,
            onSuccess: (response: TResponse) => {
              if (apiConfig?.onSuccess) {
                apiConfig.onSuccess(response);
              }
              if (apiConfig?.onRefresh) {
                apiConfig.onRefresh();
              }
            },
            onError: apiConfig?.onError
          }
        );
      })
    );
  }

  /**
   * Convenience method for create dialogs.
   * Identical to openDialogWithApi but with semantic naming.
   *
   * @example
   * this.dialogHelper.openCreateDialog(
   *   PostDialogComponent,
   *   (formData) => this.api.createPost(formData),
   *   {
   *     successMessage: 'Beitrag erstellt',
   *     onRefresh: () => this.loadPosts()
   *   }
   * ).subscribe();
   *
   * @param component The dialog component to open
   * @param createApiCall Function that receives form data and returns the create API call
   * @param apiConfig Optional API configuration
   * @param dialogConfig Optional dialog configuration
   * @returns Observable that emits the created item or undefined if cancelled
   */
  openCreateDialog<TComponent, TFormData, TCreatedItem = TFormData>(
    component: Type<TComponent>,
    createApiCall: (formData: TFormData) => Observable<TCreatedItem>,
    apiConfig?: DialogApiConfig<TFormData, TCreatedItem>,
    dialogConfig?: DialogConfig
  ): Observable<TCreatedItem | undefined> {
    return this.openDialogWithApi(
      component,
      createApiCall,
      { dialogConfig, apiConfig }
    );
  }

  /**
   * Convenience method for edit dialogs.
   * Same as openDialogWithApi but requires dialogData for clarity.
   *
   * @example
   * this.dialogHelper.openEditDialog(
   *   EventDialogComponent,
   *   (formData) => this.api.updateEvent(eventId, formData),
   *   { event: existingEvent },
   *   {
   *     successMessage: 'Event aktualisiert',
   *     onRefresh: () => this.loadEvents()
   *   }
   * ).subscribe();
   *
   * @param component The dialog component to open
   * @param updateApiCall Function that receives form data and returns the update API call
   * @param dialogData Data to pass to the dialog (typically the item being edited)
   * @param apiConfig Optional API configuration
   * @param dialogConfigOverrides Optional additional dialog configuration
   * @returns Observable that emits the updated item or undefined if cancelled
   */
  openEditDialog<TComponent, TData, TFormData, TUpdatedItem = TFormData>(
    component: Type<TComponent>,
    updateApiCall: (formData: TFormData) => Observable<TUpdatedItem>,
    dialogData: TData,
    apiConfig?: DialogApiConfig<TFormData, TUpdatedItem>,
    dialogConfigOverrides?: Omit<DialogConfig<TData>, 'data'>
  ): Observable<TUpdatedItem | undefined> {
    return this.openDialogWithApi(
      component,
      updateApiCall,
      {
        dialogConfig: {
          ...dialogConfigOverrides,
          data: dialogData
        },
        apiConfig
      }
    );
  }
}
