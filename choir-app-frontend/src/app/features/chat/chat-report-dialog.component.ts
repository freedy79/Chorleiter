import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

export interface ChatReportDialogData {
  authorName: string;
  messageText: string | null;
  messageDate: string;
}

export interface ChatReportDialogResult {
  reason: string;
}

@Component({
  selector: 'app-chat-report-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Nachricht melden</h2>
    <mat-dialog-content>
      <div class="reported-message">
        <div class="reported-meta">
          <strong>{{ data.authorName }}</strong>
          <span>{{ data.messageDate | date:'short' }}</span>
        </div>
        <p class="reported-text">{{ data.messageText || '(Nachricht ohne Text)' }}</p>
      </div>

      <mat-form-field appearance="outline" class="reason-field">
        <mat-label>Meldegrund</mat-label>
        <textarea
          matInput
          rows="4"
          [(ngModel)]="reason"
          placeholder="Bitte beschreibe, warum du diese Nachricht meldest…"
          maxlength="2000"
          required
          aria-label="Meldegrund eingeben"
        ></textarea>
        <mat-hint align="end">{{ reason.length }} / 2000</mat-hint>
      </mat-form-field>

      <p class="info-text">
        Die Chorleitung und Admins werden per E-Mail über die Meldung informiert.
      </p>

      <p class="validation-message" *ngIf="validationMessage">{{ validationMessage }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Abbrechen</button>
      <button mat-flat-button color="warn" type="button" (click)="submit()" [disabled]="!reason.trim()">
        Melden
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .reported-message {
      border-left: 3px solid rgba(198, 40, 40, 0.5);
      padding: 8px 12px;
      margin-bottom: 16px;
      background: rgba(127, 127, 127, 0.08);
      border-radius: 0 4px 4px 0;
    }
    .reported-meta {
      display: flex;
      gap: 8px;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .reported-meta strong {
      font-size: 0.85rem;
    }
    .reported-meta span {
      color: rgba(127, 127, 127, 0.9);
      font-size: 0.75rem;
    }
    .reported-text {
      margin: 4px 0 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.9rem;
      max-height: 120px;
      overflow-y: auto;
    }
    .reason-field {
      width: 100%;
    }
    .info-text {
      color: rgba(127, 127, 127, 0.85);
      font-size: 0.8rem;
      margin-top: 4px;
    }
    .validation-message {
      color: #c62828;
      font-size: 0.85rem;
      margin-top: 4px;
    }
  `]
})
export class ChatReportDialogComponent {
  reason = '';
  validationMessage = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ChatReportDialogData,
    private dialogRef: MatDialogRef<ChatReportDialogComponent, ChatReportDialogResult>
  ) {}

  submit(): void {
    this.validationMessage = '';
    const trimmed = this.reason.trim();
    if (!trimmed) {
      this.validationMessage = 'Bitte einen Meldegrund angeben.';
      return;
    }
    this.dialogRef.close({ reason: trimmed });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
