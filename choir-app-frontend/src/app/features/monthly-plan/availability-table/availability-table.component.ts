import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { UserAvailability } from '@core/models/user-availability';
import { getHolidayName } from '@shared/util/holiday';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { parseDateOnly } from '@shared/util/date';
import { forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

type AvailabilityStatus = NonNullable<UserAvailability['status']>;

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
  @Input() targetUserId?: number;
  availabilities: UserAvailability[] = [];
  displayedColumns = ['select', 'date', 'status'];
  selectedDates = new Set<string>();
  bulkStatus: AvailabilityStatus | null = null;
  isBulkSaving = false;
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
      holidayHint: (v.holidayHint ?? getHolidayName(parseDateOnly(v.date))) || undefined
    }));
    this.keepOnlyVisibleSelections();
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

  setStatus(date: string, status: 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE'): void {
    const i = this.availabilities.findIndex(v => v.date === date);
    if (i >= 0) this.availabilities[i].status = status;

    this.saveStatus(date, status).subscribe(updated => this.updateLocalAvailability(updated));
  }

  toggleSelection(date: string, checked: boolean): void {
    if (checked) {
      this.selectedDates.add(date);
    } else {
      this.selectedDates.delete(date);
    }
  }

  isSelected(date: string): boolean {
    return this.selectedDates.has(date);
  }

  toggleAllVisible(checked: boolean): void {
    if (checked) {
      this.availabilities.forEach(a => this.selectedDates.add(a.date));
    } else {
      this.clearSelection();
    }
  }

  get selectedCount(): number {
    return this.selectedDates.size;
  }

  get allVisibleSelected(): boolean {
    return this.availabilities.length > 0 && this.availabilities.every(a => this.selectedDates.has(a.date));
  }

  get someVisibleSelected(): boolean {
    return this.availabilities.some(a => this.selectedDates.has(a.date)) && !this.allVisibleSelected;
  }

  get canApplyBulkStatus(): boolean {
    return this.selectedCount > 0 && this.bulkStatus !== null && !this.isBulkSaving;
  }

  applyBulkStatus(): void {
    if (!this.canApplyBulkStatus || this.bulkStatus === null) {
      return;
    }

    const selectedVisibleDates = this.availabilities
      .map(a => a.date)
      .filter(date => this.selectedDates.has(date));

    if (selectedVisibleDates.length === 0) {
      this.clearSelection();
      return;
    }

    const status = this.bulkStatus;
    this.isBulkSaving = true;
    selectedVisibleDates.forEach(date => this.updateLocalStatus(date, status));

    forkJoin(selectedVisibleDates.map(date => this.saveStatus(date, status)))
      .pipe(finalize(() => this.isBulkSaving = false))
      .subscribe({
        next: updatedItems => {
          updatedItems.forEach(updated => this.updateLocalAvailability(updated));
          this.clearSelection();
          this.bulkStatus = null;
        },
        error: error => {
          console.error('Fehler beim Speichern der ausgewählten Verfügbarkeiten', error);
          this.load();
        }
      });
  }

  clearSelection(): void {
    this.selectedDates.clear();
  }

  trackByDate(_: number, availability: UserAvailability): string {
    return availability.date;
  }

  cellClass(status?: string): string {
    switch (status) {
      case 'AVAILABLE': return 'available';
      case 'MAYBE': return 'maybe';
      case 'UNAVAILABLE': return 'unavailable';
      default: return '';
    }
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

  private keepOnlyVisibleSelections(): void {
    const visibleDates = new Set(this.availabilities.map(a => a.date));
    this.selectedDates.forEach(date => {
      if (!visibleDates.has(date)) {
        this.selectedDates.delete(date);
      }
    });
  }
}
