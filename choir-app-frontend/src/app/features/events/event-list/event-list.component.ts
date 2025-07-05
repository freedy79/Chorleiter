import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { CreateEventResponse, Event } from '@core/models/event';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { PaginatorService } from '@core/services/paginator.service';
import { startWith } from 'rxjs/operators';
import { SelectionModel } from '@angular/cdk/collections';
import { forkJoin } from 'rxjs';
import { EventDialogComponent } from '../event-dialog/event-dialog.component';
import { EventImportDialogComponent } from '../event-import-dialog/event-import-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EventTypeLabelPipe } from '@shared/pipes/event-type-label.pipe';
import { EventCardComponent } from '../../home/event-card/event-card.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    EventCardComponent,
    EventTypeLabelPipe
  ],
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss']
})
export class EventListComponent implements OnInit, AfterViewInit {
  typeControl = new FormControl('ALL');
  displayedColumns: string[] = ['date', 'type', 'updatedAt', 'director', 'actions'];
  dataSource = new MatTableDataSource<Event>();
  selectedEvent: Event | null = null;
  isChoirAdmin = false;
  isAdmin = false;
  selection = new SelectionModel<Event>(true, []);
  pageSizeOptions: number[] = [10, 25, 50, 100];
  pageSize = 25;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private apiService: ApiService,
              private authService: AuthService,
              private dialog: MatDialog,
              private snackBar: MatSnackBar,
              private paginatorService: PaginatorService,
              private route: ActivatedRoute) {
    this.pageSize = this.paginatorService.getPageSize('event-list', this.pageSizeOptions[0]);
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.paginator.page.subscribe(e => this.paginatorService.setPageSize('event-list', e.pageSize));
      this.dataSource.paginator = this.paginator;
    }
  }

  ngOnInit(): void {
    this.loadEvents();
    const eventId = Number(this.route.snapshot.queryParamMap.get('eventId'));
    if (eventId) {
      this.apiService.getEventById(eventId).subscribe(e => this.selectedEvent = e);
    }
    this.typeControl.valueChanges.pipe(startWith('ALL')).subscribe(() => this.loadEvents());
    this.apiService.checkChoirAdminStatus().subscribe(s => {
      this.isChoirAdmin = s.isChoirAdmin;
      this.updateDisplayedColumns();
    });
    this.authService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
      this.updateDisplayedColumns();
    });
  }

  private updateDisplayedColumns(): void {
    const base = ['date', 'type', 'updatedAt', 'director', 'actions'];
    this.displayedColumns = this.isAdmin ? ['select', ...base] : base;
  }

  private loadEvents(): void {
    const type = this.typeControl.value;
    this.apiService.getEvents(type === 'ALL' ? undefined : (type as any))
      .subscribe(events => {
        this.dataSource.data = events;
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
        this.selectedEvent = null;
      });
  }

  selectEvent(event: Event): void {
    this.apiService.getEventById(event.id).subscribe(e => this.selectedEvent = e);
  }

  editEvent(event: Event): void {
    this.apiService.getEventById(event.id).subscribe(fullEvent => {
      const dialogRef = this.dialog.open(EventDialogComponent, { width: '600px', data: { event: fullEvent } });
      dialogRef.afterClosed().subscribe(result => {
        if (result && result.id) {
          const originalPieces = fullEvent.pieces.map(p => p.id).sort();
          const newPieces = [...result.pieceIds].sort();
          const changed =
            new Date(result.date).getTime() !== new Date(fullEvent.date).getTime() ||
            result.type !== fullEvent.type ||
            (result.notes || '') !== (fullEvent.notes || '') ||
            JSON.stringify(originalPieces) !== JSON.stringify(newPieces);

          if (!changed) {
            this.snackBar.open('Keine Änderungen vorgenommen.', 'OK', { duration: 3000 });
            return;
          }

          this.apiService.updateEvent(result.id, result).subscribe({
            next: () => { this.snackBar.open('Event aktualisiert.', 'OK', { duration: 3000 }); this.loadEvents(); },
            error: () => this.snackBar.open('Fehler beim Aktualisieren des Events.', 'Schließen', { duration: 4000 })
          });
        }
      });
    });
  }

  deleteEvent(event: Event): void {
    const dialogData: ConfirmDialogData = { title: 'Event löschen?', message: 'Möchten Sie dieses Event wirklich löschen?' };
    const ref = this.dialog.open(ConfirmDialogComponent, { data: dialogData });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.apiService.deleteEvent(event.id).subscribe({
          next: () => { this.snackBar.open('Event gelöscht.', 'OK', { duration: 3000 }); this.loadEvents(); },
          error: () => this.snackBar.open('Fehler beim Löschen des Events.', 'Schließen', { duration: 4000 })
        });
      }
    });
  }

  deleteSelectedEvents(): void {
    const dialogData: ConfirmDialogData = { title: 'Events löschen?', message: 'Möchten Sie die ausgewählten Events wirklich löschen?' };
    const ref = this.dialog.open(ConfirmDialogComponent, { data: dialogData });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        const requests = this.selection.selected.map(ev => this.apiService.deleteEvent(ev.id));
        forkJoin(requests).subscribe({
          next: () => {
            this.snackBar.open('Events gelöscht.', 'OK', { duration: 3000 });
            this.selection.clear();
            this.loadEvents();
          },
          error: () => this.snackBar.open('Fehler beim Löschen der Events.', 'Schließen', { duration: 4000 })
        });
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
    const dialogRef = this.dialog.open(EventDialogComponent, { width: '600px', disableClose: true });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.createEvent(result).subscribe({
          next: (response: CreateEventResponse) => {
            const baseMessage = response.wasUpdated ?
              'Event für diesen Tag wurde aktualisiert!' :
              'Event erfolgreich angelegt!';
            const message = response.warning ? response.warning : baseMessage;
            this.snackBar.open(message, 'OK', { duration: 3000 });
            this.loadEvents();
          },
          error: (err) => {
            const msg = err.status === 409 && err.error?.message
              ? err.error.message
              : 'Fehler: Das Event konnte nicht gespeichert werden.';
            this.snackBar.open(msg, 'Schließen', { duration: 5000 });
          }
        });
      }
    });
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(EventImportDialogComponent, { width: '800px' });
    dialogRef.afterClosed().subscribe(wasImported => {
      if (wasImported) {
        this.loadEvents();
      }
    });
  }
}
