import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { AvailabilityTableComponent } from '../monthly-plan/availability-table/availability-table.component';
import { ActivatedRoute, Router } from '@angular/router';
import { MonthNavigationService, MonthYear } from '@shared/services/month-navigation.service';
import { ApiService } from '@core/services/api.service';
import { UserAvailability } from '@core/models/user-availability';
import { getHolidayName } from '@shared/util/holiday';
import { parseDateOnly } from '@shared/util/date';
import { Subscription, firstValueFrom } from 'rxjs';

interface AvailabilityMonthGroup {
  period: MonthYear;
  availabilities: UserAvailability[];
}

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, AvailabilityTableComponent],
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailabilityComponent implements OnInit, OnDestroy {
  selected!: MonthYear;
  viewMode: 'monthly' | 'combined' = 'monthly';
  monthlyAvailabilities: UserAvailability[] | null = null;
  combinedMonths: AvailabilityMonthGroup[] = [];
  combinedTotalEvents = 0;
  isLoading = false;
  loadError = false;
  limitedToTen = false;
  private paramSub?: Subscription;
  private loadRequestId = 0;
  private destroyed = false;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private monthNav: MonthNavigationService,
              private api: ApiService,
              private cdr: ChangeDetectorRef) {
    const now = new Date();
    this.selected = { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  ngOnInit(): void {
    this.paramSub = this.route.queryParamMap.subscribe(params => {
      const y = Number(params.get('year'));
      const m = Number(params.get('month'));
      if (!Number.isNaN(y) && !Number.isNaN(m) && y > 0 && m > 0) {
        this.selected = { year: y, month: m };
      }
      void this.loadAvailabilities();
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
    this.destroyed = true;
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

  formatMonthLabel(period: MonthYear): string {
    return new Date(period.year, period.month - 1, 1)
      .toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }

  trackByPeriod(_: number, group: AvailabilityMonthGroup): string {
    return `${group.period.year}-${group.period.month}`;
  }

  private async loadAvailabilities(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const currentLoad = ++this.loadRequestId;
    this.isLoading = true;
    this.loadError = false;
    this.viewMode = 'monthly';
    this.monthlyAvailabilities = null;
    this.combinedMonths = [];
    this.combinedTotalEvents = 0;
    this.limitedToTen = false;
    this.cdr.markForCheck();

    try {
      const start: MonthYear = { ...this.selected };
      const first = await this.fetchMonth(start);
      if (this.isStale(currentLoad)) return;

      const firstCount = first.length;

      if (firstCount > 5) {
        this.viewMode = 'monthly';
        this.monthlyAvailabilities = first;
        this.combinedTotalEvents = firstCount;
      } else {
        this.viewMode = 'combined';
        const groups: AvailabilityMonthGroup[] = [{ period: start, availabilities: first }];
        let totalEvents = firstCount;

        if (firstCount > 3) {
          let current = start;
          while (groups.length < 3) {
            current = this.monthNav.next(current);
            const data = await this.fetchMonth(current);
            if (this.isStale(currentLoad)) return;
            groups.push({ period: current, availabilities: data });
          }
          totalEvents = groups.reduce((sum, g) => sum + g.availabilities.length, 0);
        } else {
          let current = start;
          const maxMonths = 12;
          let checked = 1;
          while (checked < maxMonths && totalEvents < 10) {
            current = this.monthNav.next(current);
            const data = await this.fetchMonth(current);
            if (this.isStale(currentLoad)) return;
            checked++;

            if (data.length === 0) {
              continue;
            }

            const remainingSlots = 10 - totalEvents;
            const portion = data.length > remainingSlots ? data.slice(0, remainingSlots) : data;
            groups.push({ period: current, availabilities: portion });
            totalEvents += portion.length;
            if (portion.length < data.length || totalEvents >= 10) {
              this.limitedToTen = true;
            }

            if (portion.length < data.length) {
              break;
            }
          }
        }

        this.monthlyAvailabilities = null;
        this.combinedMonths = groups;
        this.combinedTotalEvents = totalEvents;
      }
    } catch (error) {
      if (currentLoad === this.loadRequestId) {
        this.loadError = true;
        console.error('Fehler beim Laden der Verfügbarkeiten', error);
      }
    } finally {
      if (!this.destroyed && currentLoad === this.loadRequestId) {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    }
  }

  private async fetchMonth(period: MonthYear): Promise<UserAvailability[]> {
    const data = await firstValueFrom(this.api.getAvailabilities(period.year, period.month));
    return this.decorate(data);
  }

  private decorate(data: UserAvailability[]): UserAvailability[] {
    return data.map(v => ({
      ...v,
      holidayHint: (v.holidayHint ?? getHolidayName(parseDateOnly(v.date))) || undefined
    }));
  }

  private isStale(loadId: number): boolean {
    return this.destroyed || loadId !== this.loadRequestId;
  }
}
