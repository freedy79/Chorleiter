import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PollReminderMemberStatus, PollReminderStatus } from '@core/models/poll';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { MaterialModule } from '@modules/material.module';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

export interface PollReminderDialogData {
  postId: number;
  postTitle: string;
}

@Component({
  selector: 'app-poll-reminder-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, EmptyStateComponent],
  templateUrl: './poll-reminder-dialog.component.html',
  styleUrls: ['./poll-reminder-dialog.component.scss']
})
export class PollReminderDialogComponent implements OnInit {
  loading = true;
  sending = false;
  status: PollReminderStatus | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PollReminderDialogData,
    private dialogRef: MatDialogRef<PollReminderDialogComponent>,
    private api: ApiService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  get members(): PollReminderMemberStatus[] {
    return this.status?.members || [];
  }

  get pendingMembers(): PollReminderMemberStatus[] {
    return this.members.filter(member => !member.hasVoted);
  }

  sendReminders(): void {
    if (!this.status || this.pendingMembers.length === 0) {
      return;
    }

    this.sending = true;
    this.api.sendPollReminders(this.data.postId, {}).subscribe({
      next: response => {
        this.notification.success(response.message || `${response.sentCount} Erinnerungen versendet.`);
        this.reload();
      },
      error: () => {
        this.notification.error('Erinnerungen konnten nicht versendet werden.', 4000);
        this.sending = false;
      }
    });
  }

  sendTestToSelf(): void {
    this.sending = true;
    this.api.sendPollReminders(this.data.postId, { sendTestToSelf: true }).subscribe({
      next: response => {
        this.notification.success(response.message || 'Testmail versendet.');
        this.reload();
      },
      error: () => {
        this.notification.error('Testmail konnte nicht versendet werden.', 4000);
        this.sending = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  private reload(): void {
    this.loading = true;
    this.api.getPollReminderStatus(this.data.postId).subscribe({
      next: status => {
        this.status = status;
        this.loading = false;
        this.sending = false;
      },
      error: () => {
        this.notification.error('Abstimmungsstatus konnte nicht geladen werden.', 4000);
        this.loading = false;
        this.sending = false;
      }
    });
  }
}
