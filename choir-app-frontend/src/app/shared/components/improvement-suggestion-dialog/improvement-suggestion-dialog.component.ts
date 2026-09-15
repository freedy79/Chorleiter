import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { FeedbackService } from '@core/services/feedback.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-improvement-suggestion-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './improvement-suggestion-dialog.component.html',
  styleUrls: ['./improvement-suggestion-dialog.component.scss']
})
export class ImprovementSuggestionDialogComponent {
  readonly form;
  saving = false;
  currentUser$: Observable<any>;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ImprovementSuggestionDialogComponent>,
    private feedbackService: FeedbackService,
    private notification: NotificationService,
    private auth: AuthService
  ) {
    this.form = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]]
    });
    this.currentUser$ = this.auth.currentUser$;
  }

  close(): void {
    if (this.saving) {
      return;
    }
    this.dialogRef.close();
  }

  send(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const message = (this.form.value.message || '').trim();
    this.saving = true;

    this.feedbackService.submitImprovementSuggestion({ message }).pipe(
      finalize(() => {
        this.saving = false;
      })
    ).subscribe({
      next: (response) => {
        this.notification.success(response.message || 'Verbesserungsvorschlag gesendet.');
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error sending improvement suggestion:', err);
        this.notification.error('Der Verbesserungsvorschlag konnte nicht gesendet werden.');
      }
    });
  }
}
