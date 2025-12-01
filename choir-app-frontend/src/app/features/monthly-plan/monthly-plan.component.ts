import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
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
import { AuthService } from '@core/services/auth.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { PlanEntryDialogComponent } from './plan-entry-dialog/plan-entry-dialog.component';
import { SendPlanDialogComponent } from './send-plan-dialog/send-plan-dialog.component';
import { RequestAvailabilityDialogComponent } from './request-availability-dialog/request-availability-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AvailabilityTableComponent } from './availability-table/availability-table.component';
import { getHolidayName } from '@shared/util/holiday';
import { Router, ActivatedRoute } from '@angular/router';
import { MonthNavigationService } from '@shared/services/month-navigation.service';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { parseDateOnly } from '@shared/util/date';
import { MemberAvailability } from '@core/models/member-availability';
import { DebugLogService } from '@core/services/debug-log.service';

type LoadStepKey = 'planResponseAt' |
  'planProcessedAt' |
  'availabilityResponseAt' |
  'availabilityProcessedAt' |
  'membersResponseAt';

interface LoadMetrics {
  planRequestId: number;
  startedAt: number;
  planResponseAt?: number;
  planProcessedAt?: number;
  availabilityResponseAt?: number;
  availabilityProcessedAt?: number;
  membersResponseAt?: number;
  finishedAt?: number;
  error?: boolean;
}

@Component({
  selector: 'app-monthly-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, AvailabilityTableComponent, PureDatePipe],
  templateUrl: './monthly-plan.component.html',
  styleUrls: ['./monthly-plan.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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
  selectedTab = 0;
  isLoadingPlan = false;

  counterPlanDates: Date[] = [];
  counterPlanDateKeys: string[] = [];
  counterPlanRows: { user: UserInChoir; assignments: Record<string, string>; }[] = [];

  private userSub?: Subscription;
  private roleSub?: Subscription;
  private paramSub?: Subscription;
  private planSub?: Subscription;
  private availabilitySub?: Subscription;
  private skipNextParamLoad = false;
  private planRequestId = 0;
  private availabilityRequestId = 0;
  loadMetrics: LoadMetrics | null = null;
  public isDeveloper = false;

  private readonly loadStepOrder: LoadStepKey[] = [
    'planResponseAt',
    'planProcessedAt',
    'availabilityResponseAt',
    'availabilityProcessedAt',
    'membersResponseAt'
  ];

  get loadDurationSeconds(): string | null {
    if (!this.loadMetrics?.finishedAt) {
      return null;
    }
    return this.formatMilliseconds(this.loadMetrics.finishedAt - this.loadMetrics.startedAt);
  }

  get loadStepDetails(): { key: LoadStepKey; label: string; sinceStart: string; delta: string }[] {
    if (!this.loadMetrics) {
      return [];
    }
    const labels: Record<LoadStepKey, string> = {
      planResponseAt: 'Antwort vom Dienstplan-Endpunkt',
      planProcessedAt: 'Dienstplan aufbereitet',
      availabilityResponseAt: 'Verfügbarkeiten empfangen',
      availabilityProcessedAt: 'Verfügbarkeiten aufbereitet',
      membersResponseAt: 'Mitgliederliste empfangen'
    };
    const rows: { key: LoadStepKey; label: string; sinceStart: string; delta: string }[] = [];
    let previous = this.loadMetrics.startedAt;
    for (const key of this.loadStepOrder) {
      const value = this.loadMetrics[key];
      if (!value) {
        continue;
      }
      rows.push({
        key,
        label: labels[key],
        sinceStart: this.formatMilliseconds(value - this.loadMetrics.startedAt),
        delta: this.formatMilliseconds(value - previous)
      });
      previous = value;
    }
    return rows;
  }

  private now(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }

  private formatMilliseconds(value: number): string {
    return (value / 1000).toFixed(2);
  }

  private markLoadStep(step: LoadStepKey, loadRequestId: number | null): void {
    if (!this.loadMetrics || (loadRequestId !== null && this.loadMetrics.planRequestId !== loadRequestId)) {
      return;
    }
    const timestamp = this.now();
    this.loadMetrics[step] = timestamp;
    this.refreshFinishedAt(timestamp);
  }

  private markLoadError(): void {
    if (!this.loadMetrics) {
      return;
    }
    this.loadMetrics.error = true;
    const timestamp = this.now();
    this.refreshFinishedAt(timestamp);
  }

  private refreshFinishedAt(timestamp: number): void {
    if (!this.loadMetrics) {
      return;
    }
    const recorded = this.loadStepOrder
      .map(step => this.loadMetrics?.[step])
      .filter((value): value is number => typeof value === 'number');
    recorded.push(timestamp);
    this.loadMetrics.finishedAt = Math.max(...recorded, this.loadMetrics.startedAt);
  }

  timestamp(date: string | Date): string {
    return parseDateOnly(date).getTime().toString();
  }

  private updateDisplayedColumns(): void {
    const base = ['date', 'director', 'organist', 'notes'];
    this.displayedColumns = (this.isChoirAdmin && !this.plan?.finalized) ? [...base, 'actions'] : base;
  }

  private sortEntries(): void {
    this.entries.sort((a, b) => parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime());
  }


  private loadAvailabilities(year: number, month: number, loadRequestId: number | null = null): void {
    if (!this.isChoirAdmin) {
      if (this.availabilitySub) {
        this.availabilitySub.unsubscribe();
        this.availabilitySub = undefined;
      }
      this.availabilityRequestId = 0;
      this.availabilityMap = {};
      return;
    }
    if (this.availabilitySub) {
      this.availabilitySub.unsubscribe();
    }
    const requestId = ++this.availabilityRequestId;
    this.availabilityMap = {};
    this.updateCounterPlan();
    this.availabilitySub = this.api.getMemberAvailabilities(year, month).subscribe(av => {
      if (requestId !== this.availabilityRequestId) {
        return;
      }
      this.markLoadStep('availabilityResponseAt', loadRequestId);
      this.availabilityMap = {};
      for (const a of av) {
        if (!this.availabilityMap[a.userId]) this.availabilityMap[a.userId] = {};
        this.availabilityMap[a.userId][a.date] = a.status;
      }
      this.updateCounterPlan();
      this.markLoadStep('availabilityProcessedAt', loadRequestId);
      this.cdr.markForCheck();
    });
  }

  private dateKey(date: string): string {
    const d = parseDateOnly(date);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  private buildAvailabilityMap(availabilities: MemberAvailability[]): { [userId: number]: { [date: string]: string } } {
    const map: { [userId: number]: { [date: string]: string } } = {};
    for (const availability of availabilities) {
      const key = this.dateKey(availability.date);
      if (!map[availability.userId]) {
        map[availability.userId] = {};
      }
      map[availability.userId][key] = availability.status;
    }
    return map;
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

  membersByAvailability(date: string, status: string): UserInChoir[] {
    const key = this.dateKey(date);
    return this.members.filter(m => (this.availabilityMap[m.id]?.[key] || 'AVAILABLE') === status);
  }

  memberNamesByAvailability(date: string, status: string): string {
    return this.membersByAvailability(date, status).map(m => `${m.name}, ${m.firstName}`).join(', ') || '—';
  }

  private updateCounterPlan(): void {
    const dateMap = new Map<string, string>();
    for (const e of this.entries) {
      if (isNaN(parseDateOnly(e.date).getTime())) continue;
      const key = this.dateKey(e.date);
      if (!dateMap.has(key)) dateMap.set(key, e.date);
    }
    const dateKeys = Array.from(dateMap.keys()).sort();
    this.counterPlanDateKeys = dateKeys;
    this.counterPlanDates = dateKeys.map(k => parseDateOnly(dateMap.get(k)!)).filter(d => !isNaN(d.getTime()));

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
  }

  constructor(private api: ApiService,
              private monthlyPlan: MonthlyPlanService,
              private auth: AuthService,
              private dialog: MatDialog,
              private snackBar: MatSnackBar,
              private router: Router,
              private route: ActivatedRoute,
              private monthNav: MonthNavigationService,
              private cdr: ChangeDetectorRef,
            private logger: DebugLogService) {
    this.isDeveloper = this.logger.isEnabled();
  }

  ngOnInit(): void {
    const now = new Date();
    const initialParams = this.route.snapshot.queryParamMap;
    const initialYear = Number(initialParams.get('year'));
    const initialMonth = Number(initialParams.get('month'));

    this.selectedYear = !Number.isNaN(initialYear) && initialYear > 0
      ? initialYear
      : now.getFullYear();
    this.selectedMonth = !Number.isNaN(initialMonth) && initialMonth > 0
      ? initialMonth
      : now.getMonth() + 1;
    this.selectedTab = initialParams.get('tab') === 'avail' ? 1 : 0;

    this.auth.isChoirAdmin$.pipe(take(1)).subscribe(isChoirAdmin => {
      this.isChoirAdmin = isChoirAdmin;
      this.updateDisplayedColumns();
      this.loadPlan(this.selectedYear, this.selectedMonth);
    });

    this.paramSub = this.route.queryParamMap.subscribe(params => {
      const tabIndex = params.get('tab') === 'avail' ? 1 : 0;
      if (this.selectedTab !== tabIndex) {
        this.selectedTab = tabIndex;
      }

      if (this.skipNextParamLoad) {
        this.skipNextParamLoad = false;
        return;
      }

      const y = Number(params.get('year'));
      const m = Number(params.get('month'));
      let shouldReload = false;

      if (!Number.isNaN(y) && y > 0 && y !== this.selectedYear) {
        this.selectedYear = y;
        shouldReload = true;
      }

      if (!Number.isNaN(m) && m > 0 && m !== this.selectedMonth) {
        this.selectedMonth = m;
        shouldReload = true;
      }

      if (shouldReload) {
        this.loadPlan(this.selectedYear, this.selectedMonth);
      }
    });

    this.userSub = this.auth.currentUser$.subscribe(u => this.currentUserId = u?.id || null);
    this.roleSub = this.auth.isChoirAdmin$.subscribe(isChoirAdmin => {
      const wasAdmin = this.isChoirAdmin;
      this.isChoirAdmin = isChoirAdmin;
      this.updateDisplayedColumns();
      if (this.isChoirAdmin) {
        this.api.getChoirMembers().subscribe(m => {
          this.members = m;
          this.directors = m.filter(u => {
            const roles = u.membership?.rolesInChoir || [];
            return roles.includes('director') || roles.includes('choir_admin');
          });
          this.organists = m.filter(u => u.membership?.rolesInChoir?.includes('organist'));
          this.updateCounterPlan();
          this.markLoadStep('membersResponseAt', this.loadMetrics?.planRequestId ?? null);
          this.cdr.markForCheck();
        });
        this.loadAvailabilities(this.selectedYear, this.selectedMonth);
      } else {
        this.members = [];
        this.directors = [];
        this.organists = [];
        this.availabilityMap = {};
        this.updateCounterPlan();
        if (this.availabilitySub) {
          this.availabilitySub.unsubscribe();
          this.availabilitySub = undefined;
        }
        this.availabilityRequestId = 0;
      }
      if (!wasAdmin && this.isChoirAdmin) {
        this.loadPlan(this.selectedYear, this.selectedMonth);
      }
    });
  }

  loadPlan(year: number, month: number): void {
    const requestId = ++this.planRequestId;
    this.loadMetrics = {
      planRequestId: requestId,
      startedAt: this.now()
    };
    this.isLoadingPlan = true;
    // Keep the currently displayed plan data while the new plan, availabilities
    // and member list are still loading to avoid flashing empty content.
    this.cdr.markForCheck();
    /*this.plan = null;
    this.entries = [];
    this.counterPlanDates = [];
    this.counterPlanRows = [];
    this.updateDisplayedColumns();*/
    if (this.planSub) {
      this.planSub.unsubscribe();
    }
    const plan$ = this.monthlyPlan.getMonthlyPlan(year, month).pipe(
      tap(() => this.markLoadStep('planResponseAt', requestId)),
      map(plan => {
        const entries = (plan?.entries || [])
          .filter(e => !isNaN(parseDateOnly(e.date).getTime()))
          .map(e => ({
            ...e,
            holidayHint: getHolidayName(parseDateOnly(e.date)) || undefined
          }))
          .sort((a, b) => parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime());
        return { plan, entries };
      }),
      tap(() => this.markLoadStep('planProcessedAt', requestId))
    );

    const availability$ = this.isChoirAdmin
      ? this.api.getMemberAvailabilities(year, month).pipe(
          tap(() => this.markLoadStep('availabilityResponseAt', requestId)),
          map(av => this.buildAvailabilityMap(av)),
          tap(() => this.markLoadStep('availabilityProcessedAt', requestId))
        )
      : of<{ [userId: number]: { [date: string]: string } }>({});

    const members$ = this.isChoirAdmin
      ? this.api.getChoirMembers().pipe(
          tap(() => this.markLoadStep('membersResponseAt', requestId)),
          map(members => {
            const directors = members.filter(u => {
              const roles = u.membership?.rolesInChoir || [];
              return roles.includes('director') || roles.includes('choir_admin');
            });
            const organists = members.filter(u => u.membership?.rolesInChoir?.includes('organist'));
            return { members, directors, organists };
          })
        )
      : of({ members: [] as UserInChoir[], directors: [] as UserInChoir[], organists: [] as UserInChoir[] });

    this.planSub = forkJoin({
      planData: plan$,
      availabilityMap: availability$,
      memberData: members$
    }).subscribe({
      next: ({ planData, availabilityMap, memberData }) => {
        if (requestId !== this.planRequestId) {
          return;
        }
        this.plan = planData.plan;
        this.entries = planData.entries;
        this.availabilityMap = availabilityMap;
        this.members = memberData.members;
        this.directors = memberData.directors;
        this.organists = memberData.organists;
        this.updateDisplayedColumns();
        this.updateCounterPlan();
        this.isLoadingPlan = false;
        this.planSub = undefined;
        this.cdr.markForCheck();
      },
      error: () => {
        if (requestId !== this.planRequestId) {
          return;
        }
        this.isLoadingPlan = false;
        this.planSub = undefined;
        this.markLoadError();
        this.cdr.markForCheck();
      }
    });
  }

  reloadPlan(): void {
    this.monthlyPlan.clearMonthlyPlanCache(this.selectedYear, this.selectedMonth);
    this.loadPlan(this.selectedYear, this.selectedMonth);
  }

  monthChanged(): void {
    this.skipNextParamLoad = true;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        year: this.selectedYear,
        month: this.selectedMonth,
        tab: this.selectedTab === 1 ? 'avail' : null
      },
      queryParamsHandling: 'merge'
    }).finally(() => {
      this.skipNextParamLoad = false;
      this.loadPlan(this.selectedYear, this.selectedMonth);
    });
  }

  tabChanged(index: number): void {
    this.selectedTab = index;
    this.skipNextParamLoad = true;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { year: this.selectedYear, month: this.selectedMonth, tab: index === 1 ? 'avail' : null },
      queryParamsHandling: 'merge'
    }).finally(() => {
      this.skipNextParamLoad = false;
    });
  }

  get monthLabel(): string {
    return new Date(this.selectedYear, this.selectedMonth - 1, 1)
      .toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }

  get prevMonthLabel(): string {
    return this.monthNav.prevLabel({ year: this.selectedYear, month: this.selectedMonth });
  }

  get nextMonthLabel(): string {
    return this.monthNav.nextLabel({ year: this.selectedYear, month: this.selectedMonth });
  }

  previousMonth(): void {
    const prev = this.monthNav.previous({ year: this.selectedYear, month: this.selectedMonth });
    this.selectedYear = prev.year;
    this.selectedMonth = prev.month;
    this.monthChanged();
  }

  nextMonth(): void {
    const next = this.monthNav.next({ year: this.selectedYear, month: this.selectedMonth });
    this.selectedYear = next.year;
    this.selectedMonth = next.month;
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
    ref.afterClosed().subscribe((result: { ids: number[]; emails: string[] }) => {
      if (result && (result.ids.length > 0 || result.emails.length > 0)) {
        this.monthlyPlan.emailMonthlyPlan(this.plan!.id, result.ids, result.emails).subscribe({
          next: () => this.snackBar.open('E-Mail gesendet.', 'OK', { duration: 3000 }),
          error: () => this.snackBar.open('Fehler beim Versenden der E-Mail.', 'Schließen', { duration: 4000 })
        });
      }
    });
  }

  openAvailabilityDialog(): void {
    if (!this.plan) return;
    const people = this.members.filter(m =>
      m.membership?.rolesInChoir?.includes('director') ||
      m.membership?.rolesInChoir?.includes('choir_admin') ||
      m.membership?.rolesInChoir?.includes('organist'));
    const ref = this.dialog.open(RequestAvailabilityDialogComponent, { data: { members: people } });
    ref.afterClosed().subscribe((ids: number[]) => {
      if (ids && ids.length > 0) {
        this.monthlyPlan.requestAvailability(this.plan!.id, ids).subscribe({
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
            this.monthlyPlan.clearMonthlyPlanCache(this.selectedYear, this.selectedMonth);
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
    if (this.roleSub) this.roleSub.unsubscribe();
    if (this.paramSub) this.paramSub.unsubscribe();
    if (this.planSub) this.planSub.unsubscribe();
    if (this.availabilitySub) this.availabilitySub.unsubscribe();
  }
}
