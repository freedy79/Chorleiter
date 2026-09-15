import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

import { Event } from '@core/models/event';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';

type AvailabilityStatus = 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE';

@Component({
  selector: 'app-upcoming-events-widget',
  standalone: true,
  imports: [CommonModule, MaterialModule, PureDatePipe],
  templateUrl: './upcoming-events-widget.component.html',
  styleUrls: ['./upcoming-events-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpcomingEventsWidgetComponent {
  private readonly availabilityLabels: Record<AvailabilityStatus, string> = {
    AVAILABLE: 'Zugesagt',
    MAYBE: 'Vielleicht',
    UNAVAILABLE: 'Abgesagt'
  };

  private readonly availabilityIcons: Record<AvailabilityStatus, string> = {
    AVAILABLE: 'check',
    MAYBE: 'remove',
    UNAVAILABLE: 'close'
  };

  /** Parent kann per map() sein Domain-Event in UiEvent transformieren */
  @Input({ required: true }) events: ReadonlyArray<Event> = [];
  @Input() choirColors: Record<number, string> = {};
  @Input() availabilityByDate: Record<string, AvailabilityStatus> = {};
  @Output() open = new EventEmitter<Event>();
  selectedEventForMenu: Event | null = null;
  trackById = (_: number, ev: Event) => ev?.id ?? _;
  readonly availabilityOptions: Array<{ value: AvailabilityStatus; icon: string; label: string }> = [
    { value: 'AVAILABLE', icon: 'check', label: 'Zusage' },
    { value: 'MAYBE', icon: 'remove', label: 'Vielleicht' },
    { value: 'UNAVAILABLE', icon: 'close', label: 'Absage' }
  ];
  isSavingByDate: Record<string, boolean> = {};

  private colorPalette = ['#e57373', '#64b5f6', '#81c784', '#ba68c8', '#ffb74d', '#4dd0e1', '#9575cd', '#4db6ac'];

  constructor(private api: ApiService, private notification: NotificationService) {}

  availabilityKey(ev: Event): string {
    return `${ev.choirId ?? 'default'}:${String(ev.date).slice(0, 10)}`;
  }

  availabilityStatus(ev: Event): AvailabilityStatus | null {
    return this.availabilityByDate[this.availabilityKey(ev)] ?? null;
  }

  isSaving(ev: Event): boolean {
    return this.isSavingByDate[this.availabilityKey(ev)] === true;
  }

  openAvailabilityMenu(ev: Event, mouseEvent: MouseEvent): void {
    mouseEvent.stopPropagation();
    this.selectedEventForMenu = ev;
  }

  updateAvailabilityFromMenu(status: AvailabilityStatus, mouseEvent: MouseEvent): void {
    mouseEvent.stopPropagation();
    if (!this.selectedEventForMenu) {
      return;
    }
    this.setAvailability(this.selectedEventForMenu, status, mouseEvent);
  }

  setAvailability(ev: Event, status: AvailabilityStatus, mouseEvent: MouseEvent): void {
    mouseEvent.stopPropagation();
    const key = this.availabilityKey(ev);
    if (this.isSavingByDate[key] || this.availabilityStatus(ev) === status) {
      return;
    }

    this.isSavingByDate[key] = true;
    this.api.setAvailability(String(ev.date).slice(0, 10), status, ev.choirId).subscribe({
      next: (updated) => {
        this.availabilityByDate[key] = updated.status;
        this.isSavingByDate[key] = false;
        this.notification.success(`${this.getAvailabilityLabel(updated.status)} gespeichert.`);
      },
      error: () => {
        this.isSavingByDate[key] = false;
        this.notification.error('Verfügbarkeit konnte nicht gespeichert werden.');
      }
    });
  }

  getAvailabilityLabel(status: AvailabilityStatus | null | undefined): string {
    return status ? this.availabilityLabels[status] : 'Noch keine Rückmeldung';
  }

  getAvailabilityIcon(status: AvailabilityStatus | null | undefined): string {
    return status ? this.availabilityIcons[status] : 'event_available';
  }

  getAvailabilityClass(status: AvailabilityStatus | null | undefined): string {
    if (!status) {
      return 'status-unset';
    }
    if (status === 'AVAILABLE') {
      return 'status-available';
    }
    if (status === 'UNAVAILABLE') {
      return 'status-unavailable';
    }
    return 'status-maybe';
  }
}
