import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MonthlyPlan } from '@core/models/monthly-plan';
import { Event } from '@core/models/event';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-monthly-plan',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './monthly-plan.component.html',
  styleUrls: ['./monthly-plan.component.scss']
})
export class MonthlyPlanComponent implements OnInit {
  plan: MonthlyPlan | null = null;
  events: Event[] = [];
  displayedColumns = ['date', 'type', 'director', 'organist', 'notes'];
  isChoirAdmin = false;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    this.loadPlan(year, month);
    this.api.checkChoirAdminStatus().subscribe(r => this.isChoirAdmin = r.isChoirAdmin);
  }

  loadPlan(year: number, month: number): void {
    this.api.getMonthlyPlan(year, month).subscribe({
      next: plan => { this.plan = plan; this.events = plan?.events || []; },
      error: () => { this.plan = null; this.events = []; }
    });
  }

  createPlan(): void {
    const now = new Date();
    this.api.createMonthlyPlan(now.getFullYear(), now.getMonth() + 1).subscribe(plan => {
      this.plan = plan;
      this.loadPlan(plan.year, plan.month);
    });
  }
}
