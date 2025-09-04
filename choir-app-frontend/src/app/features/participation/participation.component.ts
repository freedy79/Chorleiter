import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { UserInChoir } from '@core/models/user';
import { Event } from '@core/models/event';
import { MemberAvailability } from '@core/models/member-availability';

interface EventColumn {
  key: string;
  label: string;
}

interface MonthColumn extends EventColumn {
  events: Event[];
}

@Component({
  selector: 'app-participation',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './participation.component.html',
  styleUrls: ['./participation.component.scss']
})
export class ParticipationComponent implements OnInit {
  members: UserInChoir[] = [];
  displayMode: 'events' | 'months' = 'events';
  eventColumns: EventColumn[] = [];
  monthColumns: MonthColumn[] = [];
  displayedColumns: string[] = ['name', 'voice'];

  private availabilityMap: { [userId: number]: { [date: string]: string } } = {};

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadMembers();
    this.loadEvents();
  }

  private loadMembers(): void {
    this.api.getChoirMembers().subscribe(m => {
      this.members = this.sortByVoice(m);
    });
  }

  private loadEvents(): void {
    this.api.getEvents().subscribe(events => {
      const now = new Date();
      const future = events
        .filter(e => new Date(e.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (future.length <= 5) {
        this.displayMode = 'events';
        this.eventColumns = future.map(ev => ({
          key: this.dateKey(ev.date),
          label: new Date(ev.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        }));
        this.displayedColumns = ['name', 'voice', ...this.eventColumns.map(c => c.key)];
        const months = Array.from(new Set(future.map(e => this.monthKey(e.date))));
        this.loadAvailabilities(months.map(m => this.parseMonthKey(m)));
      } else {
        this.displayMode = 'months';
        const monthMap = new Map<string, Event[]>();
        for (const ev of future) {
          const key = this.monthKey(ev.date);
          if (!monthMap.has(key)) monthMap.set(key, []);
          monthMap.get(key)!.push(ev);
          if (monthMap.size === 5) break; // Limit to 5 months
        }
        this.monthColumns = Array.from(monthMap.entries()).map(([key, evs]) => ({
          key,
          label: this.formatMonthLabel(key),
          events: evs
        }));
        this.displayedColumns = ['name', 'voice', ...this.monthColumns.map(c => c.key)];
        this.loadAvailabilities(this.monthColumns.map(c => this.parseMonthKey(c.key)));
      }
    });
  }

  private loadAvailabilities(months: { year: number; month: number }[]): void {
    this.availabilityMap = {};
    const requests = months.map(m => this.api.getMemberAvailabilities(m.year, m.month));
    if (requests.length === 0) return;
    // Combine all requests
    let pending = requests.length;
    requests.forEach(req => {
      req.subscribe((data: MemberAvailability[]) => {
        for (const a of data) {
          if (!this.availabilityMap[a.userId]) this.availabilityMap[a.userId] = {};
          this.availabilityMap[a.userId][a.date] = a.status;
        }
        pending--;
      });
    });
  }

  status(userId: number, date: string): string | undefined {
    return this.availabilityMap[userId]?.[this.dateKey(date)];
  }

  iconFor(status?: string): string {
    switch (status) {
      case 'AVAILABLE': return 'check';
      case 'UNAVAILABLE': return 'close';
      default: return '';
    }
  }

  voiceOf(member: UserInChoir): string {
    const roles = member.membership?.rolesInChoir || [];
    const voice = roles.find(r => this.voiceOrder.includes(r.toUpperCase()));
    return voice || '';
  }

  private sortByVoice(members: UserInChoir[]): UserInChoir[] {
    return members.sort((a, b) => {
      const va = this.voiceOrder.indexOf(this.voiceOf(a).toUpperCase());
      const vb = this.voiceOrder.indexOf(this.voiceOf(b).toUpperCase());
      if (va !== vb) return va - vb;
      const ln = a.name.localeCompare(b.name);
      return ln !== 0 ? ln : (a.firstName || '').localeCompare(b.firstName || '');
    });
  }

  private readonly voiceOrder = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SOPRAN', 'ALT'];

  private dateKey(date: string | Date): string {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

  private monthKey(date: string | Date): string {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  private parseMonthKey(key: string): { year: number; month: number } {
    const [year, month] = key.split('-').map(Number);
    return { year, month };
  }

  private formatMonthLabel(key: string): string {
    const { year, month } = this.parseMonthKey(key);
    return new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }
}

