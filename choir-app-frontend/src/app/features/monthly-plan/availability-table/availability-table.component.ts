import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { UserAvailability } from '@core/models/user-availability';
import { getHolidayName } from '@shared/util/holiday';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { parseDateOnly } from '@shared/util/date';

@Component({
  selector: 'app-availability-table',
  standalone: true,
  imports: [CommonModule, MaterialModule, PureDatePipe],
  templateUrl: './availability-table.component.html',
  styleUrls: ['./availability-table.component.scss']
})
export class AvailabilityTableComponent implements OnInit, OnChanges {
  @Input() year!: number;
  @Input() month!: number;
  @Input() availabilitiesData?: UserAvailability[] | null;
  availabilities: UserAvailability[] = [];
  displayedColumns = ['date', 'status'];
  private useExternalData = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    if (this.useExternalData) {
      this.setAvailabilities(this.availabilitiesData ?? []);
    } else {
      this.load();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    let shouldLoad = false;

    if ('availabilitiesData' in changes) {
      const value = changes['availabilitiesData'].currentValue as UserAvailability[] | null | undefined;
      this.useExternalData = Array.isArray(value);
      if (this.useExternalData) {
        this.setAvailabilities(value ?? []);
      } else {
        shouldLoad = true;
      }
    }

    if (!this.useExternalData &&
        ((changes['year'] && !changes['year'].firstChange) || (changes['month'] && !changes['month'].firstChange))) {
      shouldLoad = true;
    }

    if (shouldLoad) {
      this.load();
    }
  }

  private setAvailabilities(data: UserAvailability[]): void {
    this.availabilities = data.map(v => ({
      ...v,
      holidayHint: (v.holidayHint ?? getHolidayName(parseDateOnly(v.date))) || undefined
    }));
  }

  load(): void {
    if (!this.year || !this.month || this.useExternalData) {
      return;
    }
    this.api.getAvailabilities(this.year, this.month)
      .subscribe(a => this.setAvailabilities(a));
  }

  setStatus(date: string, status: 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE'): void {
    const i = this.availabilities.findIndex(v => v.date === date);
    if (i >= 0) this.availabilities[i].status = status;

    this.api.setAvailability(date, status).subscribe(updated => {
        if (i >= 0) this.availabilities[i] = {
          ...updated,
          holidayHint: getHolidayName(parseDateOnly(updated.date)) || undefined
        };
      });
  }

  cellClass(status?: string): string {
    switch (status) {
      case 'AVAILABLE': return 'available';
      case 'MAYBE': return 'maybe';
      case 'UNAVAILABLE': return 'unavailable';
      default: return '';
    }
  }
}
