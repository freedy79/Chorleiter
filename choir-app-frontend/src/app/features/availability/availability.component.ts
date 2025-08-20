import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { AvailabilityTableComponent } from '../monthly-plan/availability-table/availability-table.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, AvailabilityTableComponent],
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.scss']
})
export class AvailabilityComponent implements OnInit {
  selectedYear!: number;
  selectedMonth!: number;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const now = new Date();
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;

    this.route.queryParamMap.subscribe(params => {
      const y = Number(params.get('year'));
      const m = Number(params.get('month'));
      if (y) { this.selectedYear = y; }
      if (m) { this.selectedMonth = m; }
    });
  }

  monthChanged(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { year: this.selectedYear, month: this.selectedMonth },
      queryParamsHandling: 'merge'
    });
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

  get prevMonthLabel(): string {
    return new Date(this.selectedYear, this.selectedMonth - 2, 1)
      .toLocaleDateString('de-DE', { month: 'long' });
  }

  get nextMonthLabel(): string {
    return new Date(this.selectedYear, this.selectedMonth, 1)
      .toLocaleDateString('de-DE', { month: 'long' });
  }
}

