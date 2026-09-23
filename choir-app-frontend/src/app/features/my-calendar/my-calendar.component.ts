import {
    Component,
    OnInit,
    ViewChild,
    ElementRef,
    Inject,
} from '@angular/core';
import { MatCalendar } from '@angular/material/datepicker';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { RouterModule } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { MonthlyPlanService } from '@core/services/monthly-plan.service';
import { Event } from '@core/models/event';
import { PlanEntry } from '@core/models/plan-entry';
import { AuthService } from '@core/services/auth.service';
import { AvailabilityControlComponent, AvailabilityStatus } from '@shared/components/availability-control/availability-control.component';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { environment } from 'src/environments/environment';

interface HolidayEvent {
    type: 'HOLIDAY';
    name: string;
    date: string;
    /** Optional notes for display consistency with normal events */
    notes?: string;
}

interface PlanCalendarEntry extends PlanEntry {
    entryType: 'PLAN';
}

type CalendarEntry = Event | HolidayEvent | PlanCalendarEntry;

@Component({
    selector: 'app-my-calendar',
    standalone: true,
    imports: [CommonModule, MaterialModule, RouterModule, AvailabilityControlComponent],
    templateUrl: './my-calendar.component.html',
    styleUrls: ['./my-calendar.component.scss'],
})
export class MyCalendarComponent implements OnInit {
    events: Event[] = [];
    eventMap: { [date: string]: Event[] } = {};
    planEntryMap: { [date: string]: PlanEntry[] } = {};
    holidayMap: { [date: string]: string } = {};
    selectedDate: Date = new Date();
    currentUserId: number | null = null;
    private loadedPlanMonths = new Set<string>();
    private loadedAvailabilityMonths = new Set<string>();
    allPlanEntries: PlanEntry[] = [];
    isAdmin = false;
    activeChoirId: number | null = null;
    availableChoirIds: number[] = [];
    availabilityByKey: Record<string, AvailabilityStatus> = {};
    choirColors: Record<number, string> = {};
    private colorPalette = ['#e57373', '#64b5f6', '#81c784', '#ba68c8', '#ffb74d', '#4dd0e1', '#9575cd', '#4db6ac'];

    @ViewChild('eventList') eventList?: ElementRef<HTMLElement>;
    @ViewChild(MatCalendar) calendar?: MatCalendar<Date>;

    constructor(
        @Inject(MAT_DATE_LOCALE) private _locale: string,
        private _adapter: DateAdapter<any>,
        private api: ApiService,
        private monthlyPlan: MonthlyPlanService,
        private auth: AuthService,
    ) {
        this._adapter.setLocale(_locale);
    }

    ngOnInit(): void {
        this.auth.isAdmin$.subscribe((v) => (this.isAdmin = v));
        this.auth.activeChoir$.subscribe((choir) => {
            this.activeChoirId = choir?.id ?? null;
        });
        this.auth.availableChoirs$.subscribe((choirs) => {
            this.availableChoirIds = choirs.map(c => c.id);
            choirs.forEach((c, idx) => {
                this.choirColors[c.id] = this.colorPalette[idx % this.colorPalette.length];
            });
            const year = this.selectedDate.getFullYear();
            const month = this.selectedDate.getMonth() + 1;
            this.loadAvailabilitiesForMonth(year, month);
        });
        this.loadEvents();
        const year = this.selectedDate.getFullYear();
        [year - 1, year, year + 1].forEach((y) => {
            Object.assign(this.holidayMap, this.calculateGermanHolidays(y));
        });
        this.auth.currentUser$.subscribe((u) => {
            this.currentUserId = u?.id || null;
            if (this.currentUserId) {
                const year = this.selectedDate.getFullYear();
                const month = this.selectedDate.getMonth() + 1;
                this.loadPlanEntriesForMonth(year, month);
                this.loadAvailabilitiesForMonth(year, month);

                const next = new Date(year, month, 1);
                this.loadPlanEntriesForMonth(
                    next.getFullYear(),
                    next.getMonth() + 1
                );
                this.loadAvailabilitiesForMonth(next.getFullYear(), next.getMonth() + 1);
            }
        });
    }

    private germanDateKey(d: string | Date): string {
        return new Date(d).toLocaleDateString('en-CA', {
            timeZone: 'Europe/Berlin',
        });
    }

    private loadEvents(): void {
        this.api.getEvents(undefined, true).subscribe((events) => {
            this.events = events;
            this.eventMap = {};
            for (const ev of events) {
                const key = this.germanDateKey(ev.date);
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
        this.monthlyPlan.getMonthlyPlan(year, month).subscribe((plan) => {
            if (!plan) return;
            for (const entry of plan.entries || []) {
                const dKey = this.germanDateKey(entry.date);
                if (!this.planEntryMap[dKey]) this.planEntryMap[dKey] = [];
                this.planEntryMap[dKey].push(entry);
                this.allPlanEntries.push(entry);
            }
            this.calendar?.updateTodaysDate();
        });
    }

    private loadAvailabilitiesForMonth(year: number, month: number): void {
        for (const choirId of this.availableChoirIds) {
            const key = `${choirId}:${year}-${month}`;
            if (this.loadedAvailabilityMonths.has(key)) continue;
            this.loadedAvailabilityMonths.add(key);
            this.api.getAvailabilities(year, month, choirId).subscribe((availabilities) => {
                for (const availability of availabilities) {
                    this.availabilityByKey[this.availabilityKey(choirId, availability.date)] = availability.status;
                }
            });
        }
    }

    private availabilityKey(choirId: number | null | undefined, date: string | Date): string {
        return `${choirId ?? 'default'}:${String(date).slice(0, 10)}`;
    }

    choirIdForEntry(entry: CalendarEntry): number | null {
        if ((entry as Event).choirId != null) {
            return (entry as Event).choirId ?? null;
        }
        return this.activeChoirId;
    }

    availabilityStatus(entry: CalendarEntry): AvailabilityStatus | null {
        if ((entry as HolidayEvent).type === 'HOLIDAY') {
            return null;
        }
        return this.availabilityByKey[this.availabilityKey(this.choirIdForEntry(entry), entry.date)] ?? null;
    }

    descriptionForEntry(entry: CalendarEntry): string {
        return (entry as Event).notes || (entry as PlanCalendarEntry).notes || '';
    }

    isSamePlanPerson(entry: PlanCalendarEntry): boolean {
        return !!entry.director && !!entry.organist && entry.director.id === entry.organist.id;
    }

    onAvailabilityChange(entry: CalendarEntry, status: AvailabilityStatus): void {
        this.availabilityByKey[this.availabilityKey(this.choirIdForEntry(entry), entry.date)] = status;
    }

    trackByCalendarEntry = (index: number, entry: CalendarEntry): string => {
        return `${(entry as Event).id ?? (entry as HolidayEvent).name ?? 'plan'}-${String(entry.date)}-${(entry as any).entryType ?? (entry as any).type ?? index}`;
    };

    private calculateGermanHolidays(year: number): { [date: string]: string } {
        const toKey = (d: Date) => this.germanDateKey(d);

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
        holidays[toKey(new Date(easterSunday.getTime() - 2 * msDay))] =
            'Karfreitag';
        holidays[toKey(new Date(easterSunday.getTime() + 1 * msDay))] =
            'Ostermontag';
        holidays[toKey(new Date(year, 4, 1))] = 'Tag der Arbeit';
        holidays[toKey(new Date(easterSunday.getTime() + 39 * msDay))] =
            'Christi Himmelfahrt';
        holidays[toKey(new Date(easterSunday.getTime() + 50 * msDay))] =
            'Pfingstmontag';
        holidays[toKey(new Date(year, 9, 3))] = 'Tag der Deutschen Einheit';
        holidays[toKey(new Date(year, 11, 25))] = '1. Weihnachtstag';
        holidays[toKey(new Date(year, 11, 26))] = '2. Weihnachtstag';
        return holidays;
    }

    dateClass = (d: Date): string => {
        const key = this.germanDateKey(d);
        const classes: string[] = [];
        if (this.eventMap[key] || this.planEntryMap[key])
            classes.push('has-event');
        if (this.holidayMap[key]) classes.push('holiday');
        if (d.getDay() === 0 || d.getDay() === 6) classes.push('weekend');
        return classes.join(' ');
    };

    onSelectedChange(date: Date | null): void {
        if (date) {
            this.selectedDate = date;
            this.loadPlanEntriesForMonth(
                date.getFullYear(),
                date.getMonth() + 1
            );
            this.loadAvailabilitiesForMonth(date.getFullYear(), date.getMonth() + 1);
            setTimeout(() => {
                this.eventList?.nativeElement.scrollIntoView({
                    behavior: 'smooth',
                });
            });
        }
    }

    get eventsForSelectedDate(): CalendarEntry[] {
        const key = this.germanDateKey(this.selectedDate);
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

    downloadIcs(): void {
        const token = this.auth.getToken();
        if (!token) return;
        const url = `${environment.apiUrl}/events/ics?token=${token}`;
        window.open(url, '_blank');
    }

    subscribeIcal(): void {
        const token = this.auth.getToken();
        if (!token) return;
        const webcalUrl = `${environment.apiUrl}/events/ics?token=${token}`.replace(/^https?:/, 'webcal:');
        window.location.href = webcalUrl;
    }

    connectGoogleCalendar(): void {
        const token = this.auth.getToken();
        if (!token) return;
        const webcalUrl = `${environment.apiUrl}/events/ics?token=${token}`.replace(/^https?:/, 'webcal:');
        window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`, '_blank');
    }
}
