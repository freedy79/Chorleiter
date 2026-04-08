import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { ApiHelperService } from '@core/services/api-helper.service';
import { NotificationService } from '@core/services/notification.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { CreateEventResponse, Event } from '@core/models/event';
import { MatPaginator } from '@angular/material/paginator';
import { PaginatorService } from '@core/services/paginator.service';
import { startWith, takeUntil } from 'rxjs/operators';
import { SelectionModel } from '@angular/cdk/collections';
import { forkJoin, Subject } from 'rxjs';
import { EventDialogComponent } from '../event-dialog/event-dialog.component';
import { EventImportDialogComponent } from '../event-import-dialog/event-import-dialog.component';
import { EventTypeLabelPipe } from '@shared/pipes/event-type-label.pipe';
import { EventCardComponent } from '../../home/event-card/event-card.component';
import { ActivatedRoute } from '@angular/router';
import { ListDataSource } from '@shared/util/list-data-source';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { ResponsiveService } from '@shared/services/responsive.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    EventCardComponent,
    EventTypeLabelPipe,
    PureDatePipe,
    EmptyStateComponent
  ],
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventListComponent implements OnInit, AfterViewInit, OnDestroy {
  typeControl = new FormControl('ALL');
  timeControl = new FormControl('RECENT');
  displayedColumns: string[] = ['date', 'type', 'updatedAt', 'director', 'actions'];
  dataSource: ListDataSource<Event>;
  selectedEvent: Event | null = null;
  isChoirAdmin = false;
  isAdmin = false;
  isDirector = false;
  isSingerOnly = false;
  selection = new SelectionModel<Event>(true, []);
  pageSizeOptions: number[] = [10, 25, 50, 100];
  pageSize: number = this.pageSizeOptions[0];
  isLoading = false;

  // Dynamic past-year filter options
  pastYears: number[] = [];

  // Mobile lazy rendering
  private readonly MOBILE_PAGE_SIZE = 15;
  mobileVisibleCount = this.MOBILE_PAGE_SIZE;
  private readonly destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private apiService: ApiService,
              private authService: AuthService,
              private dialogHelper: DialogHelperService,
              private apiHelper: ApiHelperService,
              private notification: NotificationService,
              private paginatorService: PaginatorService,
              private route: ActivatedRoute,
              private responsive: ResponsiveService,
              private cdr: ChangeDetectorRef) {
    this.dataSource = new ListDataSource<Event>(this.paginatorService, 'event-list');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.pageSize = this.dataSource.connectPaginator(this.paginator, this.pageSizeOptions);
    }
  }

  ngOnInit(): void {
    this.loadEvents();
    const eventId = Number(this.route.snapshot.queryParamMap.get('eventId'));
    if (eventId) {
      this.apiService.getEventById(eventId).pipe(takeUntil(this.destroy$)).subscribe(e => { this.selectedEvent = e; this.cdr.markForCheck(); });
    }
    this.typeControl.valueChanges.pipe(startWith('ALL'), takeUntil(this.destroy$)).subscribe(() => this.loadEvents());
    this.timeControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.applyTimeFilter());
    this.authService.isChoirAdmin$.pipe(takeUntil(this.destroy$)).subscribe(isChoirAdmin => {
      this.isChoirAdmin = isChoirAdmin;
      this.updateDisplayedColumns();
      this.cdr.markForCheck();
    });
    this.authService.isAdmin$.pipe(takeUntil(this.destroy$)).subscribe(isAdmin => {
      this.isAdmin = isAdmin;
      this.updateDisplayedColumns();
      this.cdr.markForCheck();
    });
    this.authService.isDirector$.pipe(takeUntil(this.destroy$)).subscribe(isDirector => {
      this.isDirector = isDirector;
      this.updateDisplayedColumns();
      this.cdr.markForCheck();
    });
    this.authService.isSingerOnly$.pipe(takeUntil(this.destroy$)).subscribe(isSingerOnly => {
      this.isSingerOnly = isSingerOnly;
      this.updateDisplayedColumns();
      this.cdr.markForCheck();
    });
  }

  private updateDisplayedColumns(): void {
    const base = ['date', 'type', 'updatedAt', 'director'];
    if (!this.isSingerOnly) {
      base.push('actions');
    }
    this.displayedColumns = this.isAdmin ? ['select', ...base] : base;
  }

  private allEvents: Event[] = [];

  private loadEvents(): void {
    this.isLoading = true;
    this.mobileVisibleCount = this.MOBILE_PAGE_SIZE;
    const type = this.typeControl.value;
    this.apiService.getEvents(type === 'ALL' ? undefined : (type as any))
      .subscribe({
        next: events => {
          this.allEvents = events;
          this.applyTimeFilter();
          this.selectedEvent = null;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private applyTimeFilter(): void {
    const time = this.timeControl.value;
    if (time === 'ALL') {
      this.dataSource.data = this.allEvents;
      this.updatePastYears();
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (time === 'RECENT') {
      const pastLimit = new Date(today);
      pastLimit.setDate(pastLimit.getDate() - 10);
      const futureLimit = new Date(today);
      futureLimit.setDate(futureLimit.getDate() + 10);
      this.dataSource.data = this.allEvents.filter(ev => {
        const eventDate = new Date(ev.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= pastLimit && eventDate <= futureLimit;
      });
    } else if (time === 'FUTURE') {
      this.dataSource.data = this.allEvents.filter(ev => {
        const eventDate = new Date(ev.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      });
    } else if (time === 'PAST') {
      this.dataSource.data = this.allEvents.filter(ev => {
        const eventDate = new Date(ev.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate < today;
      });
    } else if (time?.startsWith('YEAR_')) {
      const year = parseInt(time.substring(5), 10);
      this.dataSource.data = this.allEvents.filter(ev => {
        const eventDate = new Date(ev.date);
        return eventDate.getFullYear() === year && eventDate < today;
      });
    }
    this.updatePastYears();
    this.mobileVisibleCount = this.MOBILE_PAGE_SIZE;
  }

  private updatePastYears(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const years = new Set<number>();
    this.allEvents.forEach(ev => {
      const eventDate = new Date(ev.date);
      if (eventDate < today) {
        years.add(eventDate.getFullYear());
      }
    });
    this.pastYears = Array.from(years).sort((a, b) => b - a);
  }

  selectEvent(event: Event): void {
    // On mobile: open dialog directly (read-only for singers, editable for editors)
    if (this.responsive.checkMobile()) {
      if (this.isSingerOnly) {
        this.openReadOnlyDialog(event);
      } else {
        this.editEvent(event);
      }
      return;
    }
    this.apiService.getEventById(event.id).pipe(takeUntil(this.destroy$)).subscribe(e => { this.selectedEvent = e; this.cdr.markForCheck(); });
  }

  private openReadOnlyDialog(event: Event): void {
    this.apiService.getEventById(event.id).pipe(takeUntil(this.destroy$)).subscribe(fullEvent => {
      this.dialogHelper.openDialog<EventDialogComponent, void>(
        EventDialogComponent,
        { width: '600px', data: { event: fullEvent, readOnly: true } }
      ).subscribe();
    });
  }

  editEvent(event: Event): void {
    this.apiService.getEventById(event.id).subscribe(fullEvent => {
      this.dialogHelper.openDialogWithApi<
        EventDialogComponent,
        { id: number; date: string; type: string; notes?: string; pieceIds: number[]; programId?: string | null },
        Event
      >(
        EventDialogComponent,
        (result) => this.apiService.updateEvent(result.id, result),
        {
          dialogConfig: {
            width: '600px',
            data: { event: fullEvent }
          },
          apiConfig: {
            shouldProceed: (result) => {
              if (!result || !result.id) return false;

              const originalPieces = fullEvent.pieces.map(p => p.id).sort();
              const newPieces = [...result.pieceIds].sort();
              const changed =
                new Date(result.date).getTime() !== new Date(fullEvent.date).getTime() ||
                result.type !== fullEvent.type ||
                (result.notes || '') !== (fullEvent.notes || '') ||
                JSON.stringify(originalPieces) !== JSON.stringify(newPieces);

              if (!changed) {
                this.notification.info('Keine Änderungen vorgenommen.');
                return false;
              }
              return true;
            },
            successMessage: 'Event aktualisiert.',
            errorMessage: 'Fehler beim Aktualisieren des Events.',
            onRefresh: () => this.loadEvents()
          }
        }
      ).subscribe();
    });
  }

  deleteEvent(event: Event): void {
    this.dialogHelper.confirmDelete(
      { itemName: 'dieses Event' },
      () => this.apiService.deleteEvent(event.id),
      {
        successMessage: 'Event gelöscht.',
        errorMessage: 'Fehler beim Löschen des Events.',
        onRefresh: () => this.loadEvents()
      }
    ).subscribe();
  }

  deleteSelectedEvents(): void {
    this.dialogHelper.confirm({
      title: 'Events löschen?',
      message: 'Möchten Sie die ausgewählten Events wirklich löschen?'
    }).subscribe(confirmed => {
      if (confirmed) {
        const requests = this.selection.selected.map(ev => this.apiService.deleteEvent(ev.id));
        this.apiHelper.handleApiCall(
          forkJoin(requests),
          {
            successMessage: 'Events gelöscht.',
            errorMessage: 'Fehler beim Löschen der Events.',
            onSuccess: () => {
              this.selection.clear();
              this.loadEvents();
            }
          }
        ).subscribe();
      }
    });
  }

  toggleEvent(event: Event): void {
    this.selection.toggle(event);
  }

  toggleAll(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(row => this.selection.select(row));
    }
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  trackByEventId(index: number, event: Event): number {
    return event.id;
  }

  get mobileVisibleEvents(): Event[] {
    return this.dataSource.data.slice(0, this.mobileVisibleCount);
  }

  get hasMoreMobileEvents(): boolean {
    return this.mobileVisibleCount < this.dataSource.data.length;
  }

  loadMoreMobile(): void {
    this.mobileVisibleCount += this.MOBILE_PAGE_SIZE;
  }

  openAddEventDialog(): void {
    this.dialogHelper.openDialogWithApi<
      EventDialogComponent,
      { date: string; type: string; notes?: string; pieceIds?: number[]; directorId?: number; organistId?: number; finalized?: boolean; version?: number; monthlyPlanId?: number; programId?: string | null },
      CreateEventResponse
    >(
      EventDialogComponent,
      (result) => this.apiService.createEvent(result),
      {
        dialogConfig: { width: '600px', disableClose: true },
        apiConfig: {
          onSuccess: (response: CreateEventResponse) => {
            const baseMessage = response.wasUpdated ?
              'Event für diesen Tag wurde aktualisiert!' :
              'Event erfolgreich angelegt!';
            const message = response.warning ? response.warning : baseMessage;
            this.notification.success(message);
            this.loadEvents();
          },
          onError: (err): boolean => {
            if (err.status === 409 && err.error?.message) {
              this.notification.error(err.error.message);
              return true; // Suppress default error notification
            }
            return false; // Use default error handling
          },
          errorMessage: 'Fehler: Das Event konnte nicht gespeichert werden.'
        }
      }
    ).subscribe();
  }

  openImportDialog(): void {
    this.dialogHelper.openDialog<EventImportDialogComponent, boolean>(
      EventImportDialogComponent,
      { width: '800px' }
    ).subscribe(wasImported => {
      if (wasImported) {
        this.loadEvents();
      }
    });
  }

  downloadIcs(): void {
    const token = this.authService.getToken();
    if (!token) return;
    const url = `${environment.apiUrl}/events/ics?token=${token}`;
    window.open(url, '_blank');
  }

  subscribeIcal(): void {
    const token = this.authService.getToken();
    if (!token) return;
    const webcalUrl = `${environment.apiUrl}/events/ics?token=${token}`.replace(/^https?:/, 'webcal:');
    window.location.href = webcalUrl;
  }

  connectGoogleCalendar(): void {
    const token = this.authService.getToken();
    if (!token) return;
    const webcalUrl = `${environment.apiUrl}/events/ics?token=${token}`.replace(/^https?:/, 'webcal:');
    window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`, '_blank');
}
}
