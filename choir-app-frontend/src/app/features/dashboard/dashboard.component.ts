import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { CreateEventResponse, Event } from '@core/models/event';
import { EventDialogComponent } from '../events/event-dialog/event-dialog.component';
import { Piece } from '@core/models/piece';
import { EventCardComponent } from './event-card/event-card.component';
import { AuthService } from '@core/services/auth.service';
import { Choir } from '@core/models/choir';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    EventCardComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Ein BehaviorSubject, das als manueller Auslöser für das Neuladen von Daten dient.
  private refresh$ = new BehaviorSubject<void>(undefined);

  lastService$!: Observable<Event | null>;
  lastRehearsal$!: Observable<Event | null>;
  activeChoir$: Observable<Choir | null>;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private dialog: MatDialog, // Zum Öffnen von Dialogen
    private snackBar: MatSnackBar // Zum Anzeigen von Benachrichtigungen
  ) {
    this.activeChoir$ = this.authService.activeChoir$;
  }

  ngOnInit(): void {
    // Diese Streams werden jedes Mal neu ausgeführt, wenn `refresh$` einen neuen Wert ausgibt.
    this.lastService$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLastEvent('SERVICE'))
    );

    this.lastRehearsal$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLastEvent('REHEARSAL'))
    );
  }

  /**
   * Öffnet den Dialog zum Erstellen eines neuen Events (Gottesdienst oder Probe).
   * Diese Methode ist flexibel und kann für beide Event-Typen verwendet werden.
   */
  openAddEventDialog(): void {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Der API-Aufruf bleibt gleich, aber wir erwarten eine andere Antwort.
        this.apiService.createEvent(result).subscribe({
          // --- DIE NEUE LOGIK IST HIER ---
          next: (response: CreateEventResponse) => {
            // Wählen Sie die Snackbar-Nachricht basierend auf der Antwort des Servers.
            const message = response.wasUpdated
              ? 'Event für diesen Tag wurde aktualisiert!'
              : 'Event erfolgreich angelegt!';

            this.snackBar.open(message, 'OK', {
              duration: 3000,
              verticalPosition: 'top'
            });

            // Das Dashboard wird in beiden Fällen aktualisiert.
            this.refresh$.next();
          },
          error: (err) => {
            console.error('Fehler beim Anlegen/Aktualisieren des Events', err);
            this.snackBar.open('Fehler: Das Event konnte nicht gespeichert werden.', 'Schließen', {
              duration: 5000,
              verticalPosition: 'top'
            });
          }
        });
      }
    });
  }


}
