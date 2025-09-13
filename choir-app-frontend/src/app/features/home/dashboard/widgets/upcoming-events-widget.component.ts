import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

import { Event } from '@core/models/event';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';

@Component({
  selector: 'app-upcoming-events-widget',
  standalone: true,
  imports: [CommonModule, MaterialModule, PureDatePipe],
  templateUrl: './upcoming-events-widget.component.html',
  styleUrls: ['./upcoming-events-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpcomingEventsWidgetComponent {
  /** Parent kann per map() sein Domain-Event in UiEvent transformieren */
  @Input({ required: true }) events: ReadonlyArray<Event> = [];
  @Input() choirColors: Record<number, string> = {};
  @Output() open = new EventEmitter<Event>();
  trackById = (_: number, ev: Event) => ev?.id ?? _;

  private colorPalette = ['#e57373', '#64b5f6', '#81c784', '#ba68c8', '#ffb74d', '#4dd0e1', '#9575cd', '#4db6ac'];
}
