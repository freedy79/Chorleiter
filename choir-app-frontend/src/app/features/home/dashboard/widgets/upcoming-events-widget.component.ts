import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

/** UI-Minimalmodell, unabhängig vom Projekt-Event-Typ */
export interface UiEvent {
  id?: string | number;
  _id?: string | number;
  date?: string | Date;
  title?: string;
  timeRange?: string;
  location?: string;
}

@Component({
  selector: 'app-upcoming-events-widget',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './upcoming-events-widget.component.html',
  styleUrls: ['./upcoming-events-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpcomingEventsWidgetComponent {
  /** Parent kann per map() sein Domain-Event in UiEvent transformieren */
  @Input({ required: true }) events: ReadonlyArray<UiEvent> = [];
  @Output() open = new EventEmitter<UiEvent>();
  trackById = (_: number, ev: UiEvent) => ev?.id ?? ev?._id ?? _;
}
