import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { UserInChoir } from '@core/models/user';
import { MemberAvailability } from '@core/models/member-availability';
import { parseDateOnly } from '@shared/util/date';
import { combineLatest } from 'rxjs';

interface EventColumn {
  key: string;
  label: string;
}

interface DateColumn extends EventColumn {
  monthKey: string;
}

interface MonthColumn extends EventColumn {
  dates: string[];
}

@Component({
  selector: 'app-participation',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './participation.component.html',
  styleUrls: ['./participation.component.scss']
})
export class ParticipationComponent implements OnInit {
  members: UserInChoir[] = [];
  sortMode: 'voice' | 'name' = 'voice';
  displayMode: 'events' | 'months' = 'events';
  eventColumns: EventColumn[] = [];
  monthColumns: MonthColumn[] = [];
  dateColumns: DateColumn[] = [];
  monthHeaderColumns: string[] = [];
  dateHeaderColumns: string[] = [];
  displayedColumns: string[] = ['name', 'voice'];
  isChoirAdmin = false;
  startDate?: Date;
  endDate?: Date;

  private availabilityMap: { [userId: number]: { [date: string]: string } } = {};

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    combineLatest([this.auth.isAdmin$, this.auth.activeChoir$]).subscribe(([isAdmin, choir]) => {
      const roles = choir?.membership?.rolesInChoir ?? [];
      const privilegedRoles = ['choir_admin', 'choirleiter', 'director'];
      this.isChoirAdmin = isAdmin || roles.some(role => privilegedRoles.includes(role));
    });
    this.loadMembers();
    this.loadEvents();
  }

  private loadMembers(): void {
    this.api.getChoirMembers().subscribe(m => {
      this.members = this.sortMembers(m);
    });
  }

  loadEvents(): void {
    this.api.getEvents(undefined, false, this.startDate, this.endDate).subscribe(events => {
      let filtered = events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (!this.startDate && !this.endDate) {
        const today = parseDateOnly(new Date());
        filtered = filtered.filter(e => parseDateOnly(e.date) >= today);
      }

      if (filtered.length <= 5) {
        this.displayMode = 'events';
        this.eventColumns = filtered.map(ev => ({
          key: this.dateKey(ev.date),
          label: parseDateOnly(ev.date).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Europe/Berlin',
          })
        }));
        this.displayedColumns = ['name', 'voice', ...this.eventColumns.map(c => c.key)];
        this.monthColumns = [];
        this.dateColumns = [];
        this.monthHeaderColumns = [];
        this.dateHeaderColumns = [];
        const months = Array.from(new Set(filtered.map(e => this.monthKey(e.date))));
        this.loadAvailabilities(months.map(m => this.parseMonthKey(m)));
      } else {
        this.displayMode = 'months';
        const monthMap = new Map<string, string[]>();
        const dateLabelMap = new Map<string, string>();
        for (const ev of filtered) {
          const mKey = this.monthKey(ev.date);
          const dKey = this.dateKey(ev.date);
          if (!monthMap.has(mKey) && monthMap.size === 5) continue; // Limit to 5 months
          if (!monthMap.has(mKey)) monthMap.set(mKey, []);
          const arr = monthMap.get(mKey)!;
          if (!arr.includes(dKey)) arr.push(dKey);
          dateLabelMap.set(dKey, this.formatDay(ev.date));
        }
        this.monthColumns = Array.from(monthMap.entries()).map(([key, dates]) => ({
          key,
          label: this.formatMonthLabel(key),
          dates
        }));
        this.dateColumns = this.monthColumns.flatMap(col =>
          col.dates.map(d => ({ key: d, label: dateLabelMap.get(d)!, monthKey: col.key }))
        );
        this.monthHeaderColumns = ['name', 'voice', ...this.monthColumns.map(c => c.key)];
        this.dateHeaderColumns = this.dateColumns.map(c => c.key);
        this.displayedColumns = ['name', 'voice', ...this.dateHeaderColumns];
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
      case 'MAYBE': return 'check';
      case 'UNAVAILABLE': return 'close';
      default: return 'help';
    }
  }

  classFor(status?: string): string {
    switch (status) {
      case 'AVAILABLE': return 'available';
      case 'MAYBE': return 'maybe';
      case 'UNAVAILABLE': return 'unavailable';
      default: return 'unknown';
    }
  }

  statusCount(dateKey: string, type: 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE' | 'UNKNOWN'): number {
    let count = 0;
    for (const m of this.members) {
      const s = this.status(m.id, dateKey);
      if ((s ?? 'UNKNOWN') === type) count++;
    }
    return count;
  }

  monthStatusCount(col: MonthColumn, type: 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE' | 'UNKNOWN'): number {
    const uniqueDates = new Set(col.dates);
    let total = 0;
    for (const dateKey of uniqueDates) {
      total += this.statusCount(dateKey, type);
    }
    return total;
  }

  formatDay(date: string | Date): string {
    return (
      parseDateOnly(date).toLocaleDateString('de-DE', {
        day: '2-digit',
        timeZone: 'Europe/Berlin',
      }) + '.'
    );
  }

  private nextStatus(current?: string): string {
    switch (current) {
      case 'UNAVAILABLE': return 'AVAILABLE';
      case 'AVAILABLE': return 'MAYBE';
      case 'MAYBE': return 'UNAVAILABLE';
      default: return 'UNAVAILABLE';
    }
  }

  changeStatus(userId: number, date: string): void {
    if (!this.isChoirAdmin) return;
    const key = this.dateKey(date);
    const next = this.nextStatus(this.status(userId, key));
    this.api.setMemberAvailability(userId, key, next).subscribe(avail => {
      if (!this.availabilityMap[userId]) this.availabilityMap[userId] = {};
      this.availabilityMap[userId][key] = avail.status!;
    });
  }

  private readonly voiceMap: Record<string, string> = {
    'SOPRAN I': 'Sopran I',
    'SOPRAN 1': 'Sopran I',
    'SOPRAN II': 'Sopran II',
    'SOPRAN 2': 'Sopran II',
    SOPRAN: 'Sopran',
    SOPRANO: 'Sopran',
    'ALT I': 'Alt I',
    'ALT 1': 'Alt I',
    'ALT II': 'Alt II',
    'ALT 2': 'Alt II',
    ALT: 'Alt',
    ALTO: 'Alt',
    'TENOR I': 'Tenor I',
    'TENOR 1': 'Tenor I',
    'TENOR II': 'Tenor II',
    'TENOR 2': 'Tenor II',
    TENOR: 'Tenor',
    'BASS I': 'Bass I',
    'BASS 1': 'Bass I',
    'BASS II': 'Bass II',
    'BASS 2': 'Bass II',
    BASS: 'Bass',
  };

  private readonly baseVoiceMap: Record<string, string> = {
    'SOPRAN I': 'SOPRAN',
    'SOPRAN 1': 'SOPRAN',
    'SOPRAN II': 'SOPRAN',
    'SOPRAN 2': 'SOPRAN',
    SOPRAN: 'SOPRAN',
    SOPRANO: 'SOPRAN',
    'ALT I': 'ALT',
    'ALT 1': 'ALT',
    'ALT II': 'ALT',
    'ALT 2': 'ALT',
    ALT: 'ALT',
    ALTO: 'ALT',
    'TENOR I': 'TENOR',
    'TENOR 1': 'TENOR',
    'TENOR II': 'TENOR',
    'TENOR 2': 'TENOR',
    TENOR: 'TENOR',
    'BASS I': 'BASS',
    'BASS 1': 'BASS',
    'BASS II': 'BASS',
    'BASS 2': 'BASS',
    BASS: 'BASS',
  };

  voiceOf(member: UserInChoir): string {
    const rawVoice = member.voice?.toUpperCase() ||
      (member.membership?.rolesInChoir || [])
        .map(r => r.toUpperCase())
        .find(r => this.voiceMap[r]);
    return rawVoice ? this.voiceMap[rawVoice] : '';
  }

  private baseVoice(voice: string): string {
    return this.baseVoiceMap[voice] || voice;
  }

  private sortMembers(members: UserInChoir[]): UserInChoir[] {
    return this.sortMode === 'name' ? this.sortByName(members) : this.sortByVoice(members);
  }

  onSortModeChange(mode: 'voice' | 'name'): void {
    this.sortMode = mode;
    this.members = this.sortMembers([...this.members]);
  }

  private sortByVoice(members: UserInChoir[]): UserInChoir[] {
    return members.sort((a, b) => {
      const va = this.voiceOrder.indexOf(this.baseVoice(this.voiceOf(a).toUpperCase()));
      const vb = this.voiceOrder.indexOf(this.baseVoice(this.voiceOf(b).toUpperCase()));
      const aName = a.name ?? '';
      const bName = b.name ?? '';
      const aFirst = a.firstName ?? '';
      const bFirst = b.firstName ?? '';
      if (va === -1 && vb === -1) {
        const ln = aName.localeCompare(bName);
        return ln !== 0 ? ln : aFirst.localeCompare(bFirst);
      }
      if (va === -1) return 1;
      if (vb === -1) return -1;
      if (va !== vb) return va - vb;
      const ln = aName.localeCompare(bName);
      return ln !== 0 ? ln : aFirst.localeCompare(bFirst);
    });
  }

  private sortByName(members: UserInChoir[]): UserInChoir[] {
    return members.sort((a, b) => {
      const ln = a.name.localeCompare(b.name);
      return ln !== 0 ? ln : (a.firstName || '').localeCompare(b.firstName || '');
    });
  }

  private readonly voiceOrder = ['SOPRAN', 'ALT', 'TENOR', 'BASS'];

  private dateKey(date: string | Date): string {
    const d = parseDateOnly(date);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private monthKey(date: string | Date): string {
    const d = parseDateOnly(date);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  private parseMonthKey(key: string): { year: number; month: number } {
    const [year, month] = key.split('-').map(Number);
    return { year, month };
  }

  private formatMonthLabel(key: string): string {
    const { year, month } = this.parseMonthKey(key);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });
  }

  downloadPdf(): void {
    this.api.downloadParticipationPdf({ startDate: this.startDate, endDate: this.endDate }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'beteiligung.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}

