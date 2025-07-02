import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MonthlyPlan } from '@core/models/monthly-plan';
import { Event } from '@core/models/event';
import { UserInChoir } from '@core/models/user';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-monthly-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './monthly-plan.component.html',
  styleUrls: ['./monthly-plan.component.scss']
})
export class MonthlyPlanComponent implements OnInit {
  plan: MonthlyPlan | null = null;
  events: Event[] = [];
  displayedColumns = ['date', 'type', 'director', 'organist', 'notes'];
  isChoirAdmin = false;
  selectedYear!: number;
  selectedMonth!: number;
  members: UserInChoir[] = [];
  directors: UserInChoir[] = [];
  organists: UserInChoir[] = [];

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    const now = new Date();
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;
    this.loadPlan(this.selectedYear, this.selectedMonth);
    this.api.checkChoirAdminStatus().subscribe(r => this.isChoirAdmin = r.isChoirAdmin);
    this.api.getChoirMembers().subscribe(m => {
      this.members = m;
      this.directors = m.filter(u => u.membership?.roleInChoir === 'director' || u.membership?.roleInChoir === 'choir_admin');
      this.organists = m.filter(u => u.membership?.isOrganist);
    });
  }

  loadPlan(year: number, month: number): void {
    this.api.getMonthlyPlan(year, month).subscribe({
      next: plan => { this.plan = plan; this.events = plan?.events || []; },
      error: () => { this.plan = null; this.events = []; }
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
      this.api.finalizeMonthlyPlan(this.plan.id).subscribe(p => this.plan = p);
    }
  }

  createPlan(): void {
    const now = new Date();
    this.api.createMonthlyPlan(now.getFullYear(), now.getMonth() + 1).subscribe(plan => {
      this.plan = plan;
      this.loadPlan(plan.year, plan.month);
    });
  }
}
