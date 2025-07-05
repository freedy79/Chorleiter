import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@core/services/api.service';
import { MonthlyPlan } from '@core/models/monthly-plan';
import { PlanEntry } from '@core/models/plan-entry';
import { Event } from '@core/models/event';
import { UserInChoir } from '@core/models/user';
import { AuthService } from '@core/services/auth.service';
import { Subscription } from 'rxjs';
import { EventDialogComponent } from '../events/event-dialog/event-dialog.component';
import { PlanEntryDialogComponent } from './plan-entry-dialog/plan-entry-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-monthly-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, PlanEntryDialogComponent, ConfirmDialogComponent],
  templateUrl: './monthly-plan.component.html',
  styleUrls: ['./monthly-plan.component.scss']
})
export class MonthlyPlanComponent implements OnInit, OnDestroy {
  plan: MonthlyPlan | null = null;
  entries: PlanEntry[] = [];
  displayedColumns = ['date', 'type', 'director', 'organist', 'notes'];
  isChoirAdmin = false;
  selectedYear!: number;
  selectedMonth!: number;
  members: UserInChoir[] = [];
  directors: UserInChoir[] = [];
  organists: UserInChoir[] = [];
  currentUserId: number | null = null;
  private userSub?: Subscription;

  private updateDisplayedColumns(): void {
    const base = ['date', 'type', 'director', 'organist', 'notes'];
    this.displayedColumns = (this.isChoirAdmin && !this.plan?.finalized) ? [...base, 'actions'] : base;
  }

  private sortEntries(): void {
    this.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  constructor(private api: ApiService,
              private auth: AuthService,
              private dialog: MatDialog,
              private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    const now = new Date();
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;
    this.loadPlan(this.selectedYear, this.selectedMonth);
    this.userSub = this.auth.currentUser$.subscribe(u => this.currentUserId = u?.id || null);
    this.api.checkChoirAdminStatus().subscribe(r => { this.isChoirAdmin = r.isChoirAdmin; this.updateDisplayedColumns(); });
    this.api.getChoirMembers().subscribe(m => {
      this.members = m;
      this.directors = m.filter(u => u.membership?.roleInChoir === 'director' || u.membership?.roleInChoir === 'choir_admin');
      this.organists = m.filter(u => u.membership?.isOrganist);
    });
  }

  loadPlan(year: number, month: number): void {
    this.api.getMonthlyPlan(year, month).subscribe({
      next: plan => {
        this.plan = plan;
        this.entries = plan?.entries || [];
        this.sortEntries();
        this.updateDisplayedColumns();
      },
      error: () => { this.plan = null; this.entries = []; this.updateDisplayedColumns(); }
    });
  }

  monthChanged(): void {
    this.loadPlan(this.selectedYear, this.selectedMonth);
  }

  updateDirector(ev: Event, userId: number | null): void {
    this.api.updateEvent(ev.id, { date: ev.date, type: ev.type, notes: ev.notes || '', directorId: userId ?? undefined, organistId: ev.organist?.id, finalized: ev.finalized, version: ev.version, monthlyPlanId: this.plan?.id }).subscribe(updated => {
      ev.director = updated.director;
    });
  }

  updateOrganist(ev: Event, userId: number | null): void {
    this.api.updateEvent(ev.id, { date: ev.date, type: ev.type, notes: ev.notes || '', directorId: ev.director?.id, organistId: userId ?? undefined, finalized: ev.finalized, version: ev.version, monthlyPlanId: this.plan?.id }).subscribe(updated => {
      ev.organist = updated.organist;
    });
  }

  finalizePlan(): void {
    if (this.plan) {
      this.api.finalizeMonthlyPlan(this.plan.id).subscribe(p => { this.plan = p; this.updateDisplayedColumns(); });
    }
  }



  reopenPlan(): void {
    if (this.plan) {
      this.api.reopenMonthlyPlan(this.plan.id).subscribe(p => { this.plan = p; this.updateDisplayedColumns(); });
    }
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
            this.snackBar.open('Eintrag gelöscht.', 'OK', { duration: 3000 });
          },
          error: () => this.snackBar.open('Fehler beim Löschen des Eintrags.', 'Schließen', { duration: 4000 })
        });
      }
    });
  }

  createPlan(): void {
    const now = new Date();
    this.api.createMonthlyPlan(now.getFullYear(), now.getMonth() + 1).subscribe(plan => {
      this.plan = plan;
      this.loadPlan(plan.year, plan.month);
    });
  }

  ngOnDestroy(): void {
    if (this.userSub) this.userSub.unsubscribe();
  }
}
