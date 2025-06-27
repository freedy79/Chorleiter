import { Component, OnInit, ViewChild } from '@angular/core';
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
import { startWith } from 'rxjs/operators';
import { EventDialogComponent } from '../event-dialog/event-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EventTypeLabelPipe } from '@shared/pipes/event-type-label.pipe';
import { EventCardComponent } from '../../dashboard/event-card/event-card.component';

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
export class EventListComponent implements OnInit {
  typeControl = new FormControl('ALL');
  displayedColumns: string[] = ['date', 'type', 'updatedAt', 'director', 'actions'];
  dataSource = new MatTableDataSource<Event>();
  selectedEvent: Event | null = null;
  isChoirAdmin = false;
  isAdmin = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private apiService: ApiService, private authService: AuthService, private dialog: MatDialog, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadEvents();
    this.typeControl.valueChanges.pipe(startWith('ALL')).subscribe(() => this.loadEvents());
    this.apiService.checkChoirAdminStatus().subscribe(s => this.isChoirAdmin = s.isChoirAdmin);
    this.authService.isAdmin$.subscribe(isAdmin => this.isAdmin = isAdmin);
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
    const dialogRef = this.dialog.open(EventDialogComponent, { width: '600px', data: { event } });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.id) {
        this.apiService.updateEvent(result.id, result).subscribe({
          next: () => { this.snackBar.open('Event updated.', 'OK', { duration: 3000 }); this.loadEvents(); },
          error: () => this.snackBar.open('Error updating event.', 'Close', { duration: 4000 })
        });
      }
    });
  }

  deleteEvent(event: Event): void {
    const dialogData: ConfirmDialogData = { title: 'Event löschen?', message: 'Möchten Sie dieses Event wirklich löschen?' };
    const ref = this.dialog.open(ConfirmDialogComponent, { data: dialogData });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.apiService.deleteEvent(event.id).subscribe({
          next: () => { this.snackBar.open('Event deleted.', 'OK', { duration: 3000 }); this.loadEvents(); },
          error: () => this.snackBar.open('Error deleting event.', 'Close', { duration: 4000 })
        });
      }
    });
  }

  openAddEventDialog(): void {
    const dialogRef = this.dialog.open(EventDialogComponent, { width: '600px', disableClose: true });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.createEvent(result).subscribe({
          next: (response: CreateEventResponse) => {
            const message = response.wasUpdated ?
              'Event für diesen Tag wurde aktualisiert!' :
              'Event erfolgreich angelegt!';
            this.snackBar.open(message, 'OK', { duration: 3000 });
            this.loadEvents();
          },
          error: () => this.snackBar.open('Fehler: Das Event konnte nicht gespeichert werden.', 'Schließen', { duration: 5000 })
        });
      }
    });
  }
}
