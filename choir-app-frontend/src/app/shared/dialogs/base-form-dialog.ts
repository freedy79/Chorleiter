import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

export abstract class BaseFormDialog<T = any, D = any> {
  form: FormGroup;

  protected constructor(
    protected fb: FormBuilder,
    public dialogRef: MatDialogRef<any>,
    public data?: D
  ) {
    this.form = this.buildForm();
  }

  protected abstract buildForm(): FormGroup;

  protected getResult(): T {
    return this.form.value as T;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.getResult());
    }
  }
}

