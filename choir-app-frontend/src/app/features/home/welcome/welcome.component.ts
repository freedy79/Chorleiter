import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { AuthService } from '@core/services/auth.service';
import { BackendStatusService } from '@core/services/backend-status.service';
import { take } from 'rxjs/operators';
import { DemoLeadDialogComponent } from '@features/user/login/demo-lead-dialog.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('hero') heroRef?: ElementRef<HTMLElement>;
  demoLeadMessage: string | null = null;
  isBackendAvailable = true;
  isPwa = window.matchMedia('(display-mode: standalone)').matches
       || (navigator as any).standalone === true;

  /** true, sobald der Hero aus dem Viewport gescrollt ist. */
  showStickyCta = false;
  currentYear = new Date().getFullYear();

  private heroObserver?: IntersectionObserver;

  constructor(
    private authService: AuthService,
    private router: Router,
    private backendStatusService: BackendStatusService,
    private dialog: MatDialog
  ) {
    this.isBackendAvailable = this.backendStatusService.isBackendAvailable();
  }

  ngOnInit(): void {
    // Redirect logged-in users to dashboard
    this.authService.isLoggedIn$.pipe(
      take(1)
    ).subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.router.navigate(['/dashboard']);
      }
    });

    // Clear the unavailable redirect flag if coming from that page
    if (this.backendStatusService.isComingFromUnavailableRedirect()) {
      this.backendStatusService.setComingFromUnavailableRedirect(false);
    }

    this.backendStatusService.backendAvailable$.subscribe(available => {
      this.isBackendAvailable = available;
    });
  }

  ngAfterViewInit(): void {
    const hero = this.heroRef?.nativeElement;
    if (!hero || typeof IntersectionObserver === 'undefined') {
      return;
    }

    // Die CTA-Leisten erscheinen erst, wenn der Hero (mit denselben
    // Buttons) nicht mehr sichtbar ist – vorher wären sie redundant.
    this.heroObserver = new IntersectionObserver(
      ([entry]) => { this.showStickyCta = !entry.isIntersecting; },
      { threshold: 0, rootMargin: '-72px 0px 0px 0px' }
    );
    this.heroObserver.observe(hero);
  }

  ngOnDestroy(): void {
    this.heroObserver?.disconnect();
  }

  features = [
    {
      icon: 'people',
      title: 'Dein Chor auf einen Blick',
      description: 'Alle Mitglieder, Stimmgruppen und Kontaktdaten zentral – inkl. Anwesenheitsübersicht bei Proben und Auftritten'
    },
    {
      icon: 'library_music',
      title: 'Noten & Übungslisten',
      description: 'Finde alle Stücke im Repertoire, stöbere in Sammlungen, leihe Noten aus und erstelle persönliche Übungslisten'
    },
    {
      icon: 'calendar_today',
      title: 'Termine & Verfügbarkeiten',
      description: 'Sieh alle Proben und Auftritte im Überblick, melde deine Verfügbarkeit und behalte den Dienstplan im Blick'
    },
    {
      icon: 'event',
      title: 'Programme & Auftritte',
      description: 'Erfahre, welche Stücke beim nächsten Gottesdienst oder Konzert gesungen werden – immer aktuell'
    },
    {
      icon: 'forum',
      title: 'Chat, Neuigkeiten & Umfragen',
      description: 'Tausche dich mit dem Chor aus, lies aktuelle Beiträge und nimm an Umfragen und Formularen teil'
    },
    {
      icon: 'insights',
      title: 'Statistiken & Chorseite',
      description: 'Verfolge deine Probe-Teilnahmen und entdecke die öffentliche Seite deines Chors'
    }
  ];

  openDemoLeadDialog(): void {
    if (!this.isBackendAvailable) {
      return;
    }

    const dialogRef = this.dialog.open(DemoLeadDialogComponent, {
      width: '420px',
      panelClass: 'demo-lead-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((email?: string) => {
      if (!email) {
        return;
      }

      this.demoLeadMessage = null;
      this.authService.requestDemoLead(email).subscribe({
        next: (response) => {
          this.demoLeadMessage = response.message;
        },
        error: (err) => {
          this.demoLeadMessage = err.error?.message || 'Der Demo-Zugang konnte nicht angefragt werden.';
        }
      });
    });
  }
}
