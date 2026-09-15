import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '@core/services/api.service';
import { UserPreferencesService } from '@core/services/user-preferences.service';

@Component({
  selector: 'app-recommend-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './recommend-dialog.component.html'
})
export class RecommendDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  error: string | null = null;
  readonly allowSingerRegistration: boolean;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private prefs: UserPreferencesService,
    private dialogRef: MatDialogRef<RecommendDialogComponent>,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) data: { allowSingerRegistration?: boolean } | null
  ) {
    this.allowSingerRegistration = !!data?.allowSingerRegistration;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      recipientName: ['', [Validators.required, Validators.minLength(2)]],
      recipientEmail: ['', [Validators.required, Validators.email]],
      invitationType: ['choir-admin', Validators.required],
      dismissPrompt: [false]
    });

    if (!this.allowSingerRegistration) {
      this.form.get('invitationType')?.setValue('choir-admin');
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const payload = {
      ...this.form.value,
      invitationType: this.allowSingerRegistration ? this.form.value.invitationType : 'choir-admin'
    };

    this.api.sendChoirRecommendation(payload).subscribe({
      next: () => {
        const dismiss = !!this.form.value.dismissPrompt;
        if (dismiss) {
          this.prefs.update({ recommendPromptDismissed: true }).subscribe({
            next: () => this.dialogRef.close(true),
            error: () => this.dialogRef.close(true)
          });
          return;
        }
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Empfehlung konnte nicht gesendet werden.';
      }
    });
  }

  cancel(): void {
    const dismiss = !!this.form?.value?.dismissPrompt;
    if (dismiss) {
      this.prefs.update({ recommendPromptDismissed: true }).subscribe({
        next: () => this.dialogRef.close(false),
        error: () => this.dialogRef.close(false)
      });
      return;
    }

    this.dialogRef.close(false);
  }

  openDonate(): void {
    this.router.navigate(['/donate']);
  }
}
