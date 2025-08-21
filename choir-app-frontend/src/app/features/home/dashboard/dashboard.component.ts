import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, switchMap, tap, take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { CreateEventResponse, Event } from '@core/models/event';
import { EventDialogComponent } from '../../events/event-dialog/event-dialog.component';
import { Piece } from '@core/models/piece';
import { EventCardComponent } from '../event-card/event-card.component';
import { AuthService } from '@core/services/auth.service';
import { Choir } from '@core/models/choir';
import { PieceChange } from '@core/models/piece-change';
import { Post } from '@core/models/post';
import { HelpService } from '@core/services/help.service';
import { HelpWizardComponent } from '@shared/components/help-wizard/help-wizard.component';
import { UserPreferencesService } from '@core/services/user-preferences.service';
import { UserPreferences } from '@core/models/user-preferences';
import { LibraryItem } from '@core/models/library-item';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
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
  nextEvents$!: Observable<Event[]>;
  latestPost$!: Observable<import('@core/models/post').Post | null>;
  borrowedItems$!: Observable<LibraryItem[]>;
  showOnlyMine = false;
  isAdmin$: Observable<boolean | false>;
  isSingerOnly$: Observable<boolean>;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private dialog: MatDialog, // Zum Öffnen von Dialogen
    private snackBar: MatSnackBar, // Zum Anzeigen von Benachrichtigungen
    private help: HelpService,
    private prefs: UserPreferencesService,
    private router: Router
  ) {
    this.activeChoir$ = this.authService.activeChoir$;
    this.isAdmin$ = this.authService.isAdmin$;
    this.isSingerOnly$ = this.authService.currentUser$.pipe(
      map(user => {
        const roles = Array.isArray(user?.roles) ? user.roles : [];
        return roles.includes('singer') &&
          !roles.some(r => ['choir_admin', 'director', 'admin', 'librarian'].includes(r));
      })
    );
  }

  ngOnInit(): void {
    // Diese Streams werden jedes Mal neu ausgeführt, wenn `refresh$` einen neuen Wert ausgibt.
    this.lastService$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLastEvent('SERVICE'))
    );

    this.lastRehearsal$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLastEvent('REHEARSAL'))
    );

    this.nextEvents$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getNextEvents(5, this.showOnlyMine))
    );

    this.latestPost$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLatestPost())
    );

    this.borrowedItems$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLibraryItems()),
      map(items => items.filter(i => i.status === 'borrowed'))
    );

    this.pieceChanges$ = this.authService.isAdmin$.pipe(
      switchMap(isAdmin => isAdmin ? this.apiService.getPieceChangeRequests() : of([]))
    );

    // Willkommenstext ggf. anzeigen
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) return;
      const load$: Observable<UserPreferences | null> = this.prefs.isLoaded()
        ? of(null)
        : this.prefs.load();
      load$.pipe(take(1)).subscribe(() => {
        if (this.help.shouldShowHelp(user)) {
          const ref = this.dialog.open(HelpWizardComponent, { width: '600px' });
          ref.afterClosed().subscribe(() => this.help.markHelpShown(user));
        }
      });
    });
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

  openEvent(ev: Event): void {
    this.isSingerOnly$.pipe(take(1)).subscribe(isSinger => {
      if (isSinger) {
        const d = new Date(ev.date);
        this.router.navigate(['/availability'], {
          queryParams: { year: d.getFullYear(), month: d.getMonth() + 1 }
        });
      } else {
        this.apiService.getEventById(ev.id).subscribe(fullEvent => {
          const dialogRef = this.dialog.open(EventDialogComponent, {
            width: '600px',
            data: { event: fullEvent }
          });
          dialogRef.afterClosed().subscribe(result => {
            if (result && result.id) {
              this.apiService.updateEvent(result.id, result).subscribe({
                next: () => {
                  this.snackBar.open('Event aktualisiert.', 'OK', { duration: 3000, verticalPosition: 'top' });
                  this.refresh$.next();
                },
                error: () => this.snackBar.open('Fehler beim Aktualisieren des Events.', 'Schließen', { duration: 4000, verticalPosition: 'top' })
              });
            }
          });
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

  onToggleMine(): void {
    this.refresh$.next();
  }

  openLatestPost(post: Post): void {
    this.router.navigate(['/posts'], { fragment: `post-${post.id}` });
  }

}
