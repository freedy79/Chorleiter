import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { AvailabilityTableComponent } from '../monthly-plan/availability-table/availability-table.component';
import { ActivatedRoute, Router } from '@angular/router';
import { MonthNavigationService, MonthYear } from '@shared/services/month-navigation.service';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, AvailabilityTableComponent],
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailabilityComponent implements OnInit {
  selected!: MonthYear;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private monthNav: MonthNavigationService) {
    const now = new Date();
    this.selected = { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const y = Number(params.get('year'));
      const m = Number(params.get('month'));
      if (y && m) { this.selected = { year: y, month: m }; }
    });
  }

  monthChanged(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { year: this.selected.year, month: this.selected.month },
      queryParamsHandling: 'merge'
    });
  }

  previousMonth(): void {
    this.selected = this.monthNav.previous(this.selected);
    this.monthChanged();
  }

  nextMonth(): void {
    this.selected = this.monthNav.next(this.selected);
    this.monthChanged();
  }

  get prevMonthLabel(): string {
    return this.monthNav.prevLabel(this.selected);
  }

  get nextMonthLabel(): string {
    return this.monthNav.nextLabel(this.selected);
  }
}

