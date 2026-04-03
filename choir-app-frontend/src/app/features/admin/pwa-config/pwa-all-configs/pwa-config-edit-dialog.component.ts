import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PwaConfig } from '@core/models/pwa-config';

@Component({
  selector: 'app-pwa-config-edit-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
  templateUrl: './pwa-config-edit-dialog.component.html',
  styleUrls: ['./pwa-config-edit-dialog.component.scss']
})
export class PwaConfigEditDialogComponent {
  form: FormGroup;
  saving = false;
  showValue = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private notification: NotificationService,
    private dialogRef: MatDialogRef<PwaConfigEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PwaConfig
  ) {
    this.form = this.fb.group({
      key: [{ value: data.key, disabled: true }],
      value: [data.value === '***HIDDEN***' ? '' : data.value],
      type: [data.type, Validators.required],
      category: [data.category, Validators.required],
      description: [data.description]
    });
  }

  save(): void {
    if (this.form.invalid) return;

    this.saving = true;
    const updates = this.form.value;

    // Don't send empty value for secret fields
    if (this.data.isSecret && !updates.value) {
      delete updates.value;
    }

    this.api.updatePwaConfig(this.data.key, updates).subscribe({
      next: () => {
        this.saving = false;
        this.notification.success('Konfiguration aktualisiert');
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.saving = false;
        console.error('Error updating config:', err);
        this.notification.error(err.error?.message || 'Fehler beim Aktualisieren');
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
