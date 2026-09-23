import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';

export type AvailabilityStatus = 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE';

@Component({
  selector: 'app-availability-control',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './availability-control.component.html',
  styleUrls: ['./availability-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailabilityControlComponent {
  private readonly labels: Record<AvailabilityStatus, string> = {
    AVAILABLE: 'Zugesagt',
    MAYBE: 'Vielleicht',
    UNAVAILABLE: 'Abgesagt'
  };

  private readonly icons: Record<AvailabilityStatus, string> = {
    AVAILABLE: 'check_circle',
    MAYBE: 'help',
    UNAVAILABLE: 'cancel'
  };

  currentStatus: AvailabilityStatus | null = null;

  @Input({ required: true }) date: string | Date = '';
  @Input() choirId: number | null | undefined;
  @Input() targetUserId: number | null | undefined;
  @Input() labelTarget = 'Termin';
  @Input() showSummary = false;
  @Input() disabled = false;
  @Input()
  set status(value: AvailabilityStatus | null | undefined) {
    this.currentStatus = value ?? null;
  }
  @Output() statusChange = new EventEmitter<AvailabilityStatus>();

  isSaving = false;
  readonly options: Array<{ value: AvailabilityStatus; icon: string; label: string }> = [
    { value: 'AVAILABLE', icon: 'check_circle', label: 'Zusage' },
    { value: 'MAYBE', icon: 'help', label: 'Vielleicht' },
    { value: 'UNAVAILABLE', icon: 'cancel', label: 'Absage' }
  ];

  constructor(
    private readonly api: ApiService,
    private readonly notification: NotificationService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  get label(): string {
    return this.currentStatus ? this.labels[this.currentStatus] : 'Noch keine Rückmeldung';
  }

  get icon(): string {
    return this.currentStatus ? this.icons[this.currentStatus] : 'event_available';
  }

  get statusClass(): string {
    return this.currentStatus ? `status-${this.currentStatus.toLowerCase()}` : 'status-unset';
  }

  get ariaLabel(): string {
    return `Status ändern für diesen ${this.labelTarget}: ${this.label}`;
  }

  select(status: AvailabilityStatus, event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled || this.isSaving || this.currentStatus === status || !this.date) {
      return;
    }

    this.isSaving = true;
    const date = String(this.date).slice(0, 10);
    const request = this.targetUserId != null
      ? this.api.setMemberAvailability(this.targetUserId, date, status, this.choirId ?? undefined)
      : this.api.setAvailability(date, status, this.choirId ?? undefined);

    request.subscribe({
      next: (updated) => {
        this.currentStatus = updated.status;
        this.isSaving = false;
        this.statusChange.emit(updated.status);
        this.notification.success(`${this.label} gespeichert.`);
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.isSaving = false;
        this.notification.error('Verfügbarkeit konnte nicht gespeichert werden.');
        this.changeDetector.markForCheck();
      }
    });
  }
}
