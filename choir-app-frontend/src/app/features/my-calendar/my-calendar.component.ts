import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Event } from '@core/models/event';

@Component({
  selector: 'app-my-calendar',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './my-calendar.component.html',
  styleUrls: ['./my-calendar.component.scss']
})
export class MyCalendarComponent implements OnInit {
  events: Event[] = [];
  eventMap: { [date: string]: Event[] } = {};
  selectedDate: Date = new Date();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  private loadEvents(): void {
    this.api.getEvents().subscribe(events => {
      this.events = events;
      this.eventMap = {};
      for (const ev of events) {
        const key = new Date(ev.date).toISOString().substring(0, 10);
        if (!this.eventMap[key]) this.eventMap[key] = [];
        this.eventMap[key].push(ev);
      }
    });
  }

  dateClass = (d: Date): string => {
    const key = d.toISOString().substring(0, 10);
    return this.eventMap[key] ? 'has-event' : '';
  };

  onSelectedChange(date: Date): void {
    this.selectedDate = date;
  }

  get eventsForSelectedDate(): Event[] {
    const key = this.selectedDate.toISOString().substring(0, 10);
    return this.eventMap[key] || [];
  }
}
