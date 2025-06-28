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
import { EventDialogComponent } from '../../events/event-dialog/event-dialog.component';
import { Piece } from '@core/models/piece';
import { EventCardComponent } from '../event-card/event-card.component';
import { AuthService } from '@core/services/auth.service';
import { Choir } from '@core/models/choir';
import { PieceChange } from '@core/models/piece-change';

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
  public refresh$ = new BehaviorSubject<void>(undefined);

  lastService$!: Observable<Event | null>;
  lastRehearsal$!: Observable<Event | null>;
  activeChoir$: Observable<Choir | null>;
  pieceChanges$!: Observable<PieceChange[]>;

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

    this.pieceChanges$ = this.authService.isAdmin$.pipe(
      switchMap(isAdmin => isAdmin ? this.apiService.getPieceChangeRequests() : of([]))
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
          next: (response: CreateEventResponse) => {
            const baseMessage = response.wasUpdated
              ? 'Event für diesen Tag wurde aktualisiert!'
              : 'Event erfolgreich angelegt!';
            const message = response.warning ? response.warning : baseMessage;
            this.snackBar.open(message, 'OK', {
              duration: 3000,
              verticalPosition: 'top'
            });
            this.refresh$.next();
          },
          error: (err) => {
            console.error('Fehler beim Anlegen/Aktualisieren des Events', err);
            const msg = err.status === 409 && err.error?.message
              ? err.error.message
              : 'Fehler: Das Event konnte nicht gespeichert werden.';
            this.snackBar.open(msg, 'Schließen', {
              duration: 5000,
              verticalPosition: 'top'
            });
          }
        });
      }
    });
  }


  approvePieceChange(change: PieceChange): void {
    this.apiService.approvePieceChange(change.id).subscribe({
      next: () => {
        this.snackBar.open('Stückänderung genehmigt!', 'OK', {
          duration: 3000,
          verticalPosition: 'top'
        });
        this.refresh$.next();
      },
      error: (err) => {
        console.error('Fehler beim Genehmigen der Stückänderung', err);
        this.snackBar.open('Fehler: Die Stückänderung konnte nicht genehmigt werden.', 'Schließen', {
          duration: 5000,
          verticalPosition: 'top'
        });
      }
    });
  }

  declinePieceChange(change: PieceChange): void {
    this.apiService.deletePieceChange(change.id).subscribe({
      next: () => {
        this.snackBar.open('Stückänderung abgelehnt!', 'OK', {
          duration: 3000,
          verticalPosition: 'top'
        });
        this.refresh$.next();
      },
      error: (err) => {
        console.error('Fehler beim Ablehnen der Stückänderung', err);
        this.snackBar.open('Fehler: Die Stückänderung konnte nicht abgelehnt werden.', 'Schließen', {
          duration: 5000,
          verticalPosition: 'top'
        });
      }
    });
  }

}
