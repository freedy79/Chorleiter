import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatCalendar } from '@angular/material/datepicker';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { RouterModule } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { Event } from '@core/models/event';
import { PlanEntry } from '@core/models/plan-entry';
import { AuthService } from '@core/services/auth.service';

interface HolidayEvent {
  type: 'HOLIDAY';
  name: string;
  date: string;
  /** Optional notes for display consistency with normal events */
  notes?: string;
}

interface PlanCalendarEntry extends PlanEntry { entryType: 'PLAN'; }

type CalendarEntry = Event | HolidayEvent | PlanCalendarEntry;

@Component({
  selector: 'app-my-calendar',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './my-calendar.component.html',
  styleUrls: ['./my-calendar.component.scss']
})
export class MyCalendarComponent implements OnInit {
  events: Event[] = [];
  eventMap: { [date: string]: Event[] } = {};
  planEntryMap: { [date: string]: PlanEntry[] } = {};
  holidayMap: { [date: string]: string } = {};
  selectedDate: Date = new Date();
  currentUserId: number | null = null;
  private loadedPlanMonths = new Set<string>();
  allPlanEntries: PlanEntry[] = [];
  isAdmin = false;

  @ViewChild('eventList') eventList?: ElementRef<HTMLElement>;
  @ViewChild(MatCalendar) calendar?: MatCalendar<Date>;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.isAdmin$.subscribe(v => (this.isAdmin = v));
    this.loadEvents();
    const year = this.selectedDate.getFullYear();
    [year - 1, year, year + 1].forEach(y => {
      Object.assign(this.holidayMap, this.calculateGermanHolidays(y));
    });
    this.auth.currentUser$.subscribe(u => {
      this.currentUserId = u?.id || null;
      if (this.currentUserId) {
        this.loadPlanEntriesForMonth(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + 1);
      }
    });
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
      this.calendar?.updateTodaysDate();
    });
  }

  private loadPlanEntriesForMonth(year: number, month: number): void {
    const key = `${year}-${month}`;
    if (this.loadedPlanMonths.has(key)) return;
    this.loadedPlanMonths.add(key);
    this.api.getMonthlyPlan(year, month).subscribe(plan => {
      if (!plan) return;
      for (const entry of plan.entries || []) {
        const dKey = new Date(entry.date).toISOString().substring(0, 10);
        if (!this.planEntryMap[dKey]) this.planEntryMap[dKey] = [];
        this.planEntryMap[dKey].push(entry);
        this.allPlanEntries.push(entry);
      }
      this.calendar?.updateTodaysDate();
    });
  }

  private calculateGermanHolidays(year: number): { [date: string]: string } {
    const toKey = (d: Date) => d.toISOString().substring(0, 10);

    // Meeus/Jones/Butcher algorithm for Easter Sunday
    const f = Math.floor;
    const G = year % 19;
    const C = f(year / 100);
    const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
    const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
    const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
    const L = I - J;
    const month = 3 + f((L + 40) / 44);
    const day = L + 28 - 31 * f(month / 4);
    const easterSunday = new Date(year, month - 1, day);

    const msDay = 24 * 60 * 60 * 1000;
    const holidays: { [date: string]: string } = {};
    holidays[toKey(new Date(year, 0, 1))] = 'Neujahr';
    holidays[toKey(new Date(easterSunday.getTime() - 2 * msDay))] = 'Karfreitag';
    holidays[toKey(new Date(easterSunday.getTime() + 1 * msDay))] = 'Ostermontag';
    holidays[toKey(new Date(year, 4, 1))] = 'Tag der Arbeit';
    holidays[toKey(new Date(easterSunday.getTime() + 39 * msDay))] = 'Christi Himmelfahrt';
    holidays[toKey(new Date(easterSunday.getTime() + 50 * msDay))] = 'Pfingstmontag';
    holidays[toKey(new Date(year, 9, 3))] = 'Tag der Deutschen Einheit';
    holidays[toKey(new Date(year, 11, 25))] = '1. Weihnachtstag';
    holidays[toKey(new Date(year, 11, 26))] = '2. Weihnachtstag';
    return holidays;
  }

  dateClass = (d: Date): string => {
    const key = d.toISOString().substring(0, 10);
    const classes: string[] = [];
    if (this.eventMap[key] || this.planEntryMap[key]) classes.push('has-event');
    if (this.holidayMap[key]) classes.push('holiday');
    if (d.getDay() === 0 || d.getDay() === 6) classes.push('weekend');
    return classes.join(' ');
  };

  onSelectedChange(date: Date | null): void {
    if (date) {
      this.selectedDate = date;
      this.loadPlanEntriesForMonth(date.getFullYear(), date.getMonth() + 1);
      setTimeout(() => {
        this.eventList?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  get eventsForSelectedDate(): CalendarEntry[] {
    const key = this.selectedDate.toISOString().substring(0, 10);
    const entries: CalendarEntry[] = [...(this.eventMap[key] || [])];
    for (const e of this.planEntryMap[key] || []) {
      entries.push({ ...e, entryType: 'PLAN' });
    }
    const holiday = this.holidayMap[key];
    if (holiday) {
      entries.push({ type: 'HOLIDAY', name: holiday, date: key });
    }
    return entries;
  }
}
