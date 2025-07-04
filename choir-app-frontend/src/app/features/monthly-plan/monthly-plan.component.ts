import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@core/services/api.service';
import { MonthlyPlan } from '@core/models/monthly-plan';
import { Event } from '@core/models/event';
import { UserInChoir } from '@core/models/user';
import { AuthService } from '@core/services/auth.service';
import { Subscription } from 'rxjs';
import { EventDialogComponent } from '../events/event-dialog/event-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-monthly-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, EventDialogComponent, ConfirmDialogComponent],
  templateUrl: './monthly-plan.component.html',
  styleUrls: ['./monthly-plan.component.scss']
})
export class MonthlyPlanComponent implements OnInit, OnDestroy {
  plan: MonthlyPlan | null = null;
  events: Event[] = [];
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
      next: plan => { this.plan = plan; this.events = plan?.events || []; this.updateDisplayedColumns(); },
      error: () => { this.plan = null; this.events = []; this.updateDisplayedColumns(); }
    });
  }

  monthChanged(): void {
    this.loadPlan(this.selectedYear, this.selectedMonth);
  }

  updateDirector(ev: Event, userId: number): void {
    this.api.updateEvent(ev.id, { date: ev.date, type: ev.type, notes: ev.notes || '', directorId: userId, organistId: ev.organist?.id || undefined, finalized: ev.finalized, version: ev.version, monthlyPlanId: this.plan?.id }).subscribe(updated => {
      ev.director = updated.director;
    });
  }

  updateOrganist(ev: Event, userId: number | null): void {
    this.api.updateEvent(ev.id, { date: ev.date, type: ev.type, notes: ev.notes || '', directorId: ev.director?.id, organistId: userId || undefined, finalized: ev.finalized, version: ev.version, monthlyPlanId: this.plan?.id }).subscribe(updated => {
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

  openAddEventDialog(): void {
    const dialogRef = this.dialog.open(EventDialogComponent, { width: '600px', disableClose: true });
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.plan) {
        this.api.createEvent({ ...result, monthlyPlanId: this.plan.id }).subscribe({
          next: resp => { this.events.push(resp.event); this.snackBar.open('Event angelegt.', 'OK', { duration: 3000 }); },
          error: () => this.snackBar.open('Fehler beim Anlegen des Events.', 'Schließen', { duration: 4000 })
        });
      }
    });
  }

  deleteEvent(ev: Event): void {
    const data: ConfirmDialogData = { title: 'Event löschen?', message: 'Möchten Sie dieses Event wirklich löschen?' };
    const ref = this.dialog.open(ConfirmDialogComponent, { data });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.api.deleteEvent(ev.id).subscribe({
          next: () => { this.events = this.events.filter(e => e.id !== ev.id); this.snackBar.open('Event gelöscht.', 'OK', { duration: 3000 }); },
          error: () => this.snackBar.open('Fehler beim Löschen des Events.', 'Schließen', { duration: 4000 })
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
