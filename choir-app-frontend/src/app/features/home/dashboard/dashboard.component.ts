import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, BehaviorSubject, of, combineLatest } from 'rxjs';

import { map, switchMap, take, shareReplay } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { CreateEventResponse, Event } from '@core/models/event';
import { Program } from '@core/models/program';
import { EventDialogComponent } from '../../events/event-dialog/event-dialog.component';

import { EventCardComponent } from '../event-card/event-card.component';
import { AuthService } from '@core/services/auth.service';
import { Choir } from '@core/models/choir';
import { PieceChange } from '@core/models/piece-change';
import { Post } from '@core/models/post';
import { HelpService } from '@core/services/help.service';
import { HelpWizardComponent } from '@shared/components/help-wizard/help-wizard.component';
import { UserService } from '@core/services/user.service';
import { LibraryItem } from '@core/models/library-item';
import { MyCalendarComponent } from '@features/my-calendar/my-calendar.component';
import { environment } from 'src/environments/environment';

// WIDGETS (standalone)
import { UpcomingEventsWidgetComponent } from './widgets/upcoming-events-widget.component';
import { KpiWidgetComponent } from './widgets/kpi-widget.component';
import { LatestPostWidgetComponent } from './widgets/latest-post-widget.component';
import { CurrentProgramWidgetComponent } from './widgets/current-program.component';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';

type VM = {
  activeChoir: any | null;
  isSingerOnly: boolean;
  nextRehearsal: any | null;
  lastRehearsal: any | null;
  lastService: any | null;
  latestPost: any | null;
  lastProgram: Program | null;
  upcomingEvents: any[];
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
    EventCardComponent,
    MyCalendarComponent,

    // Widgets
    KpiWidgetComponent,
    UpcomingEventsWidgetComponent,
    LatestPostWidgetComponent,
    CurrentProgramWidgetComponent,
    PureDatePipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Ein BehaviorSubject, das als manueller Auslöser für das Neuladen von Daten dient.
  public refresh$ = new BehaviorSubject<void>(undefined);


  lastService$!: Observable<Event | null>;
  lastRehearsal$!: Observable<Event | null>;
  lastProgram$!: Observable<Program | null>;
  activeChoir$!: Observable<Choir | null>;
  pieceChanges$!: Observable<PieceChange[]>;

  upcomingEvents$!: Observable<Event[]>;
  nextEvents$!: Observable<Event[]>;
  nextRehearsal$!: Observable<Event | null>;
  memberCount$!: Observable<number>;
  openTasksCount$!: Observable<number>;
  latestPost$!: Observable<import('@core/models/post').Post | null>;
  borrowedItems$!: Observable<LibraryItem[]>;
  showOnlyMine = false;
  isAdmin$: Observable<boolean | false>;
  isSingerOnly$!: Observable<boolean>;
  choirColors: Record<number, string> = {};
  private colorPalette = ['#e57373', '#64b5f6', '#81c784', '#ba68c8', '#ffb74d', '#4dd0e1', '#9575cd', '#4db6ac'];

  // ViewModel: ein async im Template
  vm$!: Observable<VM>;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private dialog: MatDialog, // Zum Öffnen von Dialogen
    private snackBar: MatSnackBar, // Zum Anzeigen von Benachrichtigungen
    private help: HelpService,
    private userService: UserService,
    private router: Router
  ) {
    this.activeChoir$ = this.authService.activeChoir$;
    this.isAdmin$ = this.authService.isAdmin$;
    this.isSingerOnly$ = this.authService.isSingerOnly$;
    this.authService.availableChoirs$.subscribe(choirs => {
      choirs.forEach((c, idx) => {
        this.choirColors[c.id] = this.colorPalette[idx % this.colorPalette.length];
      });
    });
  }


  ngOnInit(): void {
    this.memberCount$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getChoirMemberCount())
    );

    this.borrowedItems$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLibraryItems()),
      map(items => items.filter(i => i.status === 'borrowed'))
    );

    this.pieceChanges$ = this.authService.isAdmin$.pipe(
      switchMap(isAdmin => isAdmin ? this.apiService.getPieceChangeRequests() : of([]))
    );

    this.openTasksCount$ = this.pieceChanges$.pipe(
      map(changes => changes.length)
    );

    this.lastService$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLastEvent('SERVICE'))
    );

    this.lastProgram$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLastProgram())
    );

    this.lastRehearsal$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLastEvent('REHEARSAL'))
    );

    this.upcomingEvents$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getNextEvents(5, this.showOnlyMine))
    );

    this.nextEvents$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getNextEvents(5, this.showOnlyMine)),
      shareReplay(1)
    );

    this.nextRehearsal$ = this.nextEvents$.pipe(
      map(events => events.find(ev => ev.type === 'REHEARSAL') || null)
    );

    this.latestPost$ = this.refresh$.pipe(
      switchMap(() => this.apiService.getLatestPost())
    );

    this.userService.getCurrentUser().pipe(take(1)).subscribe(user => {
      this.authService.setCurrentUser(user);
      if (this.help.shouldShowHelp(user)) {
        const ref = this.dialog.open(HelpWizardComponent, { width: '600px' });
        ref.afterClosed().subscribe(() => this.help.markHelpShown(user));
      }
    });

    this.vm$ = combineLatest({
      activeChoir: this.activeChoir$,
      isSingerOnly: this.isSingerOnly$,
      nextRehearsal: this.nextRehearsal$,
      lastRehearsal: this.lastRehearsal$,
      lastService: this.lastService$,
      latestPost: this.latestPost$,
      lastProgram: this.lastProgram$,
      upcomingEvents: this.upcomingEvents$
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
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

  downloadIcs(): void {
    const token = this.authService.getToken();
    if (!token) return;
    const url = `${environment.apiUrl}/events/ics?token=${token}`;
    window.open(url, '_blank');
  }

  connectGoogleCalendar(): void {
    const token = this.authService.getToken();
    if (!token) return;
    const icsUrl = encodeURIComponent(`${environment.apiUrl}/events/ics?token=${token}`);
    window.open(`https://calendar.google.com/calendar/r?cid=${icsUrl}`, '_blank');
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

  timeAgo(date: string | Date | undefined): string {
    if (!date) {
      return '—';
    }
    const d = typeof date === 'string' ? new Date(date) : date;
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return 'heute';
    }
    if (diffDays === 1) {
      return 'vor 1 Tag';
    }
    return `vor ${diffDays} Tagen`;
  }



}
