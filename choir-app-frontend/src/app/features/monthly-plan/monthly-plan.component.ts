import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@core/services/api.service';
import { MonthlyPlanService } from '@core/services/monthly-plan.service';
import { MonthlyPlan } from '@core/models/monthly-plan';
import { PlanEntry } from '@core/models/plan-entry';
import { UserInChoir } from '@core/models/user';
import { MemberAvailability } from '@core/models/member-availability';
import { AuthService } from '@core/services/auth.service';
import { Subscription } from 'rxjs';
import { PlanEntryDialogComponent } from './plan-entry-dialog/plan-entry-dialog.component';
import { SendPlanDialogComponent } from './send-plan-dialog/send-plan-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AvailabilityTableComponent } from './availability-table/availability-table.component';
import { getHolidayName } from '@shared/util/holiday';

@Component({
  selector: 'app-monthly-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, AvailabilityTableComponent],
  templateUrl: './monthly-plan.component.html',
  styleUrls: ['./monthly-plan.component.scss']
})
export class MonthlyPlanComponent implements OnInit, OnDestroy {
  plan: MonthlyPlan | null = null;
  entries: PlanEntry[] = [];
  displayedColumns = ['date', 'director', 'organist', 'notes'];
  isChoirAdmin = false;
  selectedYear!: number;
  selectedMonth!: number;
  members: UserInChoir[] = [];
  directors: UserInChoir[] = [];
  organists: UserInChoir[] = [];
  currentUserId: number | null = null;
  availabilityMap: { [userId: number]: { [date: string]: string } } = {};

  counterPlanDates: Date[] = [];
  counterPlanDateKeys: string[] = [];
  counterPlanRows: { user: UserInChoir; assignments: Record<string, string>; }[] = [];

  private userSub?: Subscription;

  timestamp(date: string | Date): string {
    return new Date(date).getTime().toString();
  }

  private updateDisplayedColumns(): void {
    const base = ['date', 'director', 'organist', 'notes'];
    this.displayedColumns = (this.isChoirAdmin && !this.plan?.finalized) ? [...base, 'actions'] : base;
  }

  private sortEntries(): void {
    this.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }


  private loadAvailabilities(year: number, month: number): void {
    if (!this.isChoirAdmin) {
      this.availabilityMap = {};
      return;
    }
    this.api.getMemberAvailabilities(year, month).subscribe(av => {
      this.availabilityMap = {};
      for (const a of av) {
        if (!this.availabilityMap[a.userId]) this.availabilityMap[a.userId] = {};
        this.availabilityMap[a.userId][a.date] = a.status;
      }
      this.updateCounterPlan();
    });
  }

  private dateKey(date: string): string {
    return date.split('T')[0];
  }

  isAvailable(userId: number, date: string): boolean {
    const key = this.dateKey(date);
    const status = this.availabilityMap[userId]?.[key];
    return !status || status === 'AVAILABLE' || status === 'MAYBE';
  }

  isMaybe(userId: number | null | undefined, date: string): boolean {
    if (!userId) return false;
    const key = this.dateKey(date);
    return this.availabilityMap[userId]?.[key] === 'MAYBE';
  }

  availableForDate(list: UserInChoir[], date: string): UserInChoir[] {
    return list.filter(u => this.isAvailable(u.id, date));
  }

  private updateCounterPlan(): void {
    const dateKeys = Array.from(new Set(this.entries.map(e => this.dateKey(e.date)))).sort();
    this.counterPlanDateKeys = dateKeys;
    this.counterPlanDates = dateKeys.map(d => new Date(d));

    const persons: UserInChoir[] = [];
    [...this.directors, ...this.organists].forEach(u => {
      if (!persons.find(p => p.id === u.id)) persons.push(u);
    });

    this.counterPlanRows = persons.map(u => ({ user: u, assignments: {} }));
    for (const row of this.counterPlanRows) {
      for (const d of dateKeys) {
        const status = this.availabilityMap[row.user.id]?.[d];
        row.assignments[d] = status === 'UNAVAILABLE' ? '---' : '';
      }
    }

    for (const entry of this.entries) {
      const key = this.dateKey(entry.date);
      if (entry.director) {
        const row = this.counterPlanRows.find(r => r.user.id === entry.director!.id);
        if (row) {
          const base = row.assignments[key] === '---' ? '' : row.assignments[key];
          row.assignments[key] = base ? base + ', Chorleitung' : 'Chorleitung';
        }
      }
      if (entry.organist) {
        const row = this.counterPlanRows.find(r => r.user.id === entry.organist!.id);
        if (row) {
          const base = row.assignments[key] === '---' ? '' : row.assignments[key];
          row.assignments[key] = base ? base + ', Orgel' : 'Orgel';
        }
      }
    }
    if (this.isChoirAdmin) {
      console.log('CounterPlan timestamps:',
        this.counterPlanDateKeys.map(d => ({ date: d, ts: this.timestamp(d) })));
    }
  }

  constructor(private api: ApiService,
              private monthlyPlan: MonthlyPlanService,
              private auth: AuthService,
              private dialog: MatDialog,
              private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    const now = new Date();
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;
    this.loadPlan(this.selectedYear, this.selectedMonth);
    this.userSub = this.auth.currentUser$.subscribe(u => this.currentUserId = u?.id || null);
    this.api.checkChoirAdminStatus().subscribe(r => {
      this.isChoirAdmin = r.isChoirAdmin;
      this.updateDisplayedColumns();
      this.loadAvailabilities(this.selectedYear, this.selectedMonth);
      if (this.isChoirAdmin) {
        this.api.getChoirMembers().subscribe(m => {
          this.members = m;
          this.directors = m.filter(u => u.membership?.rolesInChoir?.includes('director') || u.membership?.rolesInChoir?.includes('choir_admin'));
          this.organists = m.filter(u => u.membership?.rolesInChoir?.includes('organist'));
          this.updateCounterPlan();
        });
      }
    });
  }

  loadPlan(year: number, month: number): void {
    this.monthlyPlan.getMonthlyPlan(year, month).subscribe({
      next: plan => {
        this.plan = plan;
        this.entries = (plan?.entries || []).map(e => ({
          ...e,
          holidayHint: getHolidayName(new Date(e.date)) || undefined
        }));
        this.sortEntries();
        this.updateDisplayedColumns();
        this.updateCounterPlan();
        if (this.isChoirAdmin) {
          console.log('Plan timestamps:',
            this.entries.map(e => ({ id: e.id, date: e.date, ts: this.timestamp(e.date) })));
        }
      },
      error: () => {
        this.plan = null;
        this.entries = [];
        this.updateDisplayedColumns();
        this.counterPlanDates = [];
        this.counterPlanRows = [];
      }
    });
    this.loadAvailabilities(year, month);
  }

  monthChanged(): void {
    this.loadPlan(this.selectedYear, this.selectedMonth);
    this.loadAvailabilities(this.selectedYear, this.selectedMonth);
  }

  get monthLabel(): string {
    return new Date(this.selectedYear, this.selectedMonth - 1, 1)
      .toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }

  get prevMonthLabel(): string {
    return new Date(this.selectedYear, this.selectedMonth - 2, 1)
      .toLocaleDateString('de-DE', { month: 'long' });
  }

  get nextMonthLabel(): string {
    return new Date(this.selectedYear, this.selectedMonth, 1)
      .toLocaleDateString('de-DE', { month: 'long' });
  }

  previousMonth(): void {
    if (this.selectedMonth === 1) {
      this.selectedMonth = 12;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
    this.monthChanged();
  }

  nextMonth(): void {
    if (this.selectedMonth === 12) {
      this.selectedMonth = 1;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
    this.monthChanged();
  }

  updateDirector(ev: PlanEntry, userId: number | null): void {
    this.api.updatePlanEntry(ev.id, {
      date: ev.date,
      notes: ev.notes || '',
      directorId: userId,
      organistId: ev.organist?.id ?? undefined
    }).subscribe(updated => {
      ev.director = updated.director;
      this.updateCounterPlan();
    });
  }

  updateOrganist(ev: PlanEntry, userId: number | null): void {
    this.api.updatePlanEntry(ev.id, {
      date: ev.date,
      notes: ev.notes || '',
      directorId: ev.director?.id ?? undefined,
      organistId: userId
    }).subscribe(updated => {
      ev.organist = updated.organist;
      this.updateCounterPlan();
    });
  }

  updateNotes(ev: PlanEntry, notes: string): void {
    this.api.updatePlanEntry(ev.id, {
      date: ev.date,
      notes,
      directorId: ev.director?.id ?? undefined,
      organistId: ev.organist?.id ?? undefined
    }).subscribe(updated => {
      ev.notes = updated.notes;
    });
  }

  finalizePlan(): void {
    if (this.plan) {
      this.monthlyPlan.finalizeMonthlyPlan(this.plan.id).subscribe(p => { this.plan = p; this.updateDisplayedColumns(); });
    }
  }



  reopenPlan(): void {
    if (this.plan) {
      this.monthlyPlan.reopenMonthlyPlan(this.plan.id).subscribe(p => { this.plan = p; this.updateDisplayedColumns(); });
    }
  }

  downloadPdf(): void {
    if (!this.plan) return;
    this.monthlyPlan.downloadMonthlyPlanPdf(this.plan.id).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dienstplan-${this.plan!.year}-${this.plan!.month}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  openEmailDialog(): void {
    if (!this.plan) return;
    const ref = this.dialog.open(SendPlanDialogComponent, { data: { members: this.members } });
    ref.afterClosed().subscribe((ids: number[]) => {
      if (ids && ids.length > 0) {
        this.monthlyPlan.emailMonthlyPlan(this.plan!.id, ids).subscribe({
          next: () => this.snackBar.open('E-Mail gesendet.', 'OK', { duration: 3000 }),
          error: () => this.snackBar.open('Fehler beim Versenden der E-Mail.', 'Schließen', { duration: 4000 })
        });
      }
    });
  }

  openAddEntryDialog(): void {
    const dialogRef = this.dialog.open(PlanEntryDialogComponent, { width: '600px', disableClose: true });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.plan) {
        this.api.createPlanEntry({ ...result, monthlyPlanId: this.plan.id }).subscribe({
          next: () => {
            this.snackBar.open('Eintrag angelegt.', 'OK', { duration: 3000 });
            this.loadPlan(this.selectedYear, this.selectedMonth);
          },
          error: () => this.snackBar.open('Fehler beim Anlegen des Eintrags.', 'Schließen', { duration: 4000 })
        });
      }
    });
  }

  deleteEntry(ev: PlanEntry): void {
    const data: ConfirmDialogData = { title: 'Event löschen?', message: 'Möchten Sie dieses Event wirklich löschen?' };
    const ref = this.dialog.open(ConfirmDialogComponent, { data });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.api.deletePlanEntry(ev.id).subscribe({
          next: () => {
            this.entries = this.entries.filter(e => e.id !== ev.id);
            this.sortEntries();
            this.updateCounterPlan();
            this.snackBar.open('Eintrag gelöscht.', 'OK', { duration: 3000 });
          },
          error: () => this.snackBar.open('Fehler beim Löschen des Eintrags.', 'Schließen', { duration: 4000 })
        });
      }
    });
  }

  createPlan(): void {
    this.monthlyPlan.createMonthlyPlan(this.selectedYear, this.selectedMonth).subscribe(plan => {
      this.plan = plan;
      this.loadPlan(plan.year, plan.month);
    });
  }

  ngOnDestroy(): void {
    if (this.userSub) this.userSub.unsubscribe();
  }
}
