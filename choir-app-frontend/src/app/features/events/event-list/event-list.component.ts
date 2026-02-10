import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
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
import { startWith } from 'rxjs/operators';
import { SelectionModel } from '@angular/cdk/collections';
import { forkJoin } from 'rxjs';
import { EventDialogComponent } from '../event-dialog/event-dialog.component';
import { EventImportDialogComponent } from '../event-import-dialog/event-import-dialog.component';
import { EventTypeLabelPipe } from '@shared/pipes/event-type-label.pipe';
import { EventCardComponent } from '../../home/event-card/event-card.component';
import { ActivatedRoute } from '@angular/router';
import { ListDataSource } from '@shared/util/list-data-source';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    EventCardComponent,
    EventTypeLabelPipe,
    PureDatePipe
  ],
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss']
})
export class EventListComponent implements OnInit, AfterViewInit {
  typeControl = new FormControl('ALL');
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private apiService: ApiService,
              private authService: AuthService,
              private dialogHelper: DialogHelperService,
              private apiHelper: ApiHelperService,
              private notification: NotificationService,
              private paginatorService: PaginatorService,
              private route: ActivatedRoute) {
    this.dataSource = new ListDataSource<Event>(this.paginatorService, 'event-list');
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
      this.apiService.getEventById(eventId).subscribe(e => this.selectedEvent = e);
    }
    this.typeControl.valueChanges.pipe(startWith('ALL')).subscribe(() => this.loadEvents());
    this.authService.isChoirAdmin$.subscribe(isChoirAdmin => {
      this.isChoirAdmin = isChoirAdmin;
      this.updateDisplayedColumns();
    });
    this.authService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
      this.updateDisplayedColumns();
    });
    this.authService.isDirector$.subscribe(isDirector => {
      this.isDirector = isDirector;
      this.updateDisplayedColumns();
    });
    this.authService.isSingerOnly$.subscribe(isSingerOnly => {
      this.isSingerOnly = isSingerOnly;
      this.updateDisplayedColumns();
    });
  }

  private updateDisplayedColumns(): void {
    const base = ['date', 'type', 'updatedAt', 'director'];
    if (!this.isSingerOnly) {
      base.push('actions');
    }
    this.displayedColumns = this.isAdmin ? ['select', ...base] : base;
  }

  private loadEvents(): void {
    const type = this.typeControl.value;
    this.apiService.getEvents(type === 'ALL' ? undefined : (type as any))
      .subscribe(events => {
        this.dataSource.data = events;
        this.selectedEvent = null;
      });
  }

  selectEvent(event: Event): void {
    this.apiService.getEventById(event.id).subscribe(e => this.selectedEvent = e);
  }

  editEvent(event: Event): void {
    this.apiService.getEventById(event.id).subscribe(fullEvent => {
      this.dialogHelper.openDialogWithApi<
        EventDialogComponent,
        { id: number; date: string; type: string; notes?: string; pieceIds: number[] },
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

  openAddEventDialog(): void {
    this.dialogHelper.openDialogWithApi<
      EventDialogComponent,
      { date: string; type: string; notes?: string; pieceIds?: number[]; directorId?: number; organistId?: number; finalized?: boolean; version?: number; monthlyPlanId?: number },
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
}
