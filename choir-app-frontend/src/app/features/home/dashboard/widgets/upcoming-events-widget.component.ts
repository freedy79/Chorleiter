import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

import { Event } from '@core/models/event';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { AvailabilityControlComponent, AvailabilityStatus } from '@shared/components/availability-control/availability-control.component';

@Component({
  selector: 'app-upcoming-events-widget',
  standalone: true,
  imports: [CommonModule, MaterialModule, PureDatePipe, AvailabilityControlComponent],
  templateUrl: './upcoming-events-widget.component.html',
  styleUrls: ['./upcoming-events-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpcomingEventsWidgetComponent {
  /** Parent kann per map() sein Domain-Event in UiEvent transformieren */
  @Input({ required: true }) events: ReadonlyArray<Event> = [];
  @Input() choirColors: Record<number, string> = {};
  @Input() availabilityByDate: Record<string, AvailabilityStatus> = {};
  @Output() open = new EventEmitter<Event>();
  selectedEventForMenu: Event | null = null;
  trackById = (_: number, ev: Event) => ev?.id ?? _;
  constructor() {}

  availabilityKey(ev: Event): string {
    return `${ev.choirId ?? 'default'}:${String(ev.date).slice(0, 10)}`;
  }

  availabilityStatus(ev: Event): AvailabilityStatus | null {
    return this.availabilityByDate[this.availabilityKey(ev)] ?? null;
  }

  onAvailabilityChange(ev: Event, status: AvailabilityStatus): void {
    this.availabilityByDate[this.availabilityKey(ev)] = status;
  }
}
