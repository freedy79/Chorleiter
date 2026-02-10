import { Directive, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

/**
 * Abstract base class for form-based dialog components.
 *
 * Eliminates boilerplate code by providing:
 * - Form initialization and lifecycle management
 * - Standard dialog actions (onCancel, onSave)
 * - Edit mode detection
 * - Form validation handling
 * - Customizable hooks for specialized behavior
 *
 * @template T - Type of the result returned when the dialog is saved
 * @template D - Type of the data passed to the dialog
 *
 * @example
 * ```typescript
 * export class MyDialogComponent extends BaseFormDialog<MyModel, { id?: number }> {
 *   constructor(fb: FormBuilder, dialogRef: MatDialogRef<MyDialogComponent>, @Inject(MAT_DIALOG_DATA) data: { id?: number }) {
 *     super(fb, dialogRef, data);
 *   }
 *
 *   protected buildForm(): FormGroup {
 *     return this.fb.group({
 *       name: [this.data?.name || '', Validators.required]
 *     });
 *   }
 * }
 * ```
 */
@Directive()
export abstract class BaseFormDialog<T = any, D = any> implements OnInit {
  /**
   * The reactive form instance for this dialog.
   * Built by the abstract buildForm() method.
   */
  form!: FormGroup;

  /**
   * @param fb - Angular FormBuilder for creating reactive forms
   * @param dialogRef - Reference to the MatDialog instance
   * @param data - Optional data passed to the dialog (typically for edit mode)
   */
  protected constructor(
    protected fb: FormBuilder,
    public dialogRef: MatDialogRef<any>,
    public data?: D
  ) {}

  /**
   * Angular lifecycle hook.
   * Initialize the form and call optional hooks.
   */
  ngOnInit(): void {
    this.form = this.buildForm();
    this.onFormBuilt();
  }

  /**
   * Abstract method to build the reactive form.
   * Must be implemented by derived classes.
   *
   * @returns FormGroup instance with all form controls
   *
   * @example
   * ```typescript
   * protected buildForm(): FormGroup {
   *   return this.fb.group({
   *     name: [this.data?.name || '', Validators.required],
   *     email: [this.data?.email || '', [Validators.required, Validators.email]]
   *   });
   * }
   * ```
   */
  protected abstract buildForm(): FormGroup;

  /**
   * Determines if the dialog is in edit mode.
   * Override this method if your edit mode detection logic differs.
   *
   * @returns true if editing an existing record, false if creating new
   */
  protected isEditMode(): boolean {
    return !!(this.data && typeof this.data === 'object' && 'id' in this.data && (this.data as any).id);
  }

  /**
   * Helper method to get a context-aware dialog title.
   *
   * @param createTitle - Title to display when creating a new record
   * @param editTitle - Title to display when editing an existing record
   * @returns The appropriate title based on edit mode
   *
   * @example
   * ```typescript
   * title = this.getDialogTitle('Neuen Benutzer erstellen', 'Benutzer bearbeiten');
   * ```
   */
  protected getDialogTitle(createTitle: string, editTitle: string): string {
    return this.isEditMode() ? editTitle : createTitle;
  }

  /**
   * Transforms form value into the result to be returned.
   * Override this to customize the result (e.g., add ID, transform data).
   *
   * @returns The result to be passed to dialog close
   *
   * @example
   * ```typescript
   * protected getResult(): MyModel {
   *   const formValue = this.form.value;
   *   return {
   *     ...formValue,
   *     id: this.data?.id
   *   };
   * }
   * ```
   */
  protected getResult(): T {
    return this.form.value as T;
  }

  /**
   * Optional hook called after the form is built.
   * Use this for additional initialization like subscriptions or data loading.
   *
   * @example
   * ```typescript
   * protected onFormBuilt(): void {
   *   this.form.get('country')?.valueChanges.subscribe(country => {
   *     this.loadCitiesForCountry(country);
   *   });
   * }
   * ```
   */
  protected onFormBuilt(): void {
    // Optional override point
  }

  /**
   * Optional hook called before form submission.
   * Return false to prevent submission.
   *
   * @returns true to proceed with save, false to cancel
   *
   * @example
   * ```typescript
   * protected beforeSubmit(): boolean {
   *   if (this.form.get('email')?.value.includes('test')) {
   *     alert('Test emails not allowed');
   *     return false;
   *   }
   *   return true;
   * }
   * ```
   */
  protected beforeSubmit(): boolean {
    return true;
  }

  /**
   * Closes the dialog without saving.
   * This will return undefined to the parent component.
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Validates and saves the form.
   * - Calls beforeSubmit() hook
   * - Validates form
   * - Marks all fields as touched if invalid
   * - Closes dialog with result if valid
   */
  onSave(): void {
    if (!this.beforeSubmit()) {
      return;
    }

    if (this.form.valid) {
      this.dialogRef.close(this.getResult());
    } else {
      this.form.markAllAsTouched();
    }
  }
}
