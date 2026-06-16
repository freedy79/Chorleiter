import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { UserAvailability } from '@core/models/user-availability';
import { getHolidayName } from '@shared/util/holiday';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { parseDateOnly } from '@shared/util/date';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

type AvailabilityStatus = NonNullable<UserAvailability['status']>;

const STATUS_OPTIONS: Array<{ value: AvailabilityStatus; label: string; className: string }> = [
  { value: 'AVAILABLE', label: 'Verfügbar', className: 'available' },
  { value: 'MAYBE', label: 'Vorbehalt', className: 'maybe' },
  { value: 'UNAVAILABLE', label: 'Nicht verfügbar', className: 'unavailable' }
];

@Component({
  selector: 'app-availability-table',
  standalone: true,
  imports: [CommonModule, MaterialModule, PureDatePipe, EmptyStateComponent],
  templateUrl: './availability-table.component.html',
  styleUrls: ['./availability-table.component.scss']
})
export class AvailabilityTableComponent implements OnInit, OnChanges, OnDestroy {
  @Input() year!: number;
  @Input() month!: number;
  @Input() availabilitiesData?: UserAvailability[] | null;
  @Input() notesByDate: Record<string, string> = {};
  @Input() targetUserId?: number;
  availabilities: UserAvailability[] = [];
  displayedColumns = ['date', 'notes', 'status'];
  readonly statusOptions = STATUS_OPTIONS;
  isSaving = false;
  private useExternalData = false;
  private loadRequestId = 0;
  private destroyed = false;

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
        this.loadRequestId++;
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

  ngOnDestroy(): void {
    this.destroyed = true;
    this.loadRequestId++;
  }

  private setAvailabilities(data: UserAvailability[]): void {
    this.availabilities = data.map(v => ({
      ...v,
      status: v.status ?? 'AVAILABLE',
      holidayHint: (v.holidayHint ?? getHolidayName(parseDateOnly(v.date))) || undefined
    }));
  }

  load(): void {
    if (!this.year || !this.month || this.useExternalData) {
      return;
    }
    const currentLoad = ++this.loadRequestId;
    this.api.getAvailabilities(this.year, this.month)
      .subscribe({
        next: a => {
          if (this.isStale(currentLoad)) {
            return;
          }
          this.setAvailabilities(a);
        },
        error: error => {
          if (this.isStale(currentLoad)) {
            return;
          }
          console.error('Fehler beim Laden der Verfügbarkeiten', error);
          this.availabilities = [];
        }
      });
  }

  setStatus(date: string, status: AvailabilityStatus): void {
    const current = this.availabilities.find(v => v.date === date);
    if (!current || current.status === status || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.updateLocalStatus(date, status);

    this.saveStatus(date, status)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: updated => this.updateLocalAvailability(updated),
        error: error => {
          console.error('Fehler beim Speichern der Verfügbarkeit', error);
          this.load();
        }
      });
  }

  trackByDate(_: number, availability: UserAvailability): string {
    return availability.date;
  }

  noteForDate(date: string): string {
    return this.notesByDate[this.dateKey(date)]?.trim() ?? '';
  }

  hasNote(date: string): boolean {
    return this.noteForDate(date).length > 0;
  }

  statusClass(status: AvailabilityStatus): string {
    return STATUS_OPTIONS.find(option => option.value === status)?.className ?? 'available';
  }

  isActiveStatus(date: string, status: AvailabilityStatus): boolean {
    return this.availabilities.find(v => v.date === date)?.status === status;
  }

  buttonAriaLabel(status: AvailabilityStatus, date: string): string {
    return `${STATUS_OPTIONS.find(option => option.value === status)?.label ?? status} für ${date}`;
  }

  private isStale(loadId: number): boolean {
    return this.destroyed || loadId !== this.loadRequestId;
  }

  private saveStatus(date: string, status: AvailabilityStatus): Observable<UserAvailability> {
    return this.targetUserId != null
      ? this.api.setMemberAvailability(this.targetUserId, date, status)
      : this.api.setAvailability(date, status);
  }

  private updateLocalAvailability(updated: UserAvailability): void {
    const index = this.availabilities.findIndex(v => v.date === updated.date);
    if (index >= 0) {
      this.availabilities[index] = {
        ...updated,
        status: updated.status ?? 'AVAILABLE',
        holidayHint: getHolidayName(parseDateOnly(updated.date)) || undefined
      };
    }
  }

  private updateLocalStatus(date: string, status: AvailabilityStatus): void {
    const index = this.availabilities.findIndex(v => v.date === date);
    if (index >= 0) {
      this.availabilities[index] = {
        ...this.availabilities[index],
        status
      };
    }
  }

  private dateKey(date: string): string {
    return date.slice(0, 10);
  }
}
