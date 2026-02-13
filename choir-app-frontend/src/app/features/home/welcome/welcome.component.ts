import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { AuthService } from '@core/services/auth.service';
import { BackendStatusService } from '@core/services/backend-status.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  demoEmail = 'demo@nak-chorleiter.de';
  demoPassword = 'demo';
  isBackendAvailable = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private backendStatusService: BackendStatusService
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

  features = [
    {
      icon: 'people',
      title: 'Mitgliederverwaltung',
      description: 'Verwalten Sie Ihre Chormitglieder, Kontaktdaten und Stimmen zentral'
    },
    {
      icon: 'library_music',
      title: 'Literaturverwaltung',
      description: 'Organisieren Sie Ihre Notenbibliothek mit umfassenden Suchfunktionen'
    },
    {
      icon: 'calendar_today',
      title: 'Dienstplanung',
      description: 'Erstellen Sie Monatsdienstpläne und fragen Sie Verfügbarkeiten ab'
    },
    {
      icon: 'event',
      title: 'Programmplanung',
      description: 'Planen Sie Konzerte und Gottesdienste mit Ihrem Repertoire'
    },
    {
      icon: 'mail',
      title: 'Kommunikation',
      description: 'E-Mail-Benachrichtigungen und direkte Kommunikation mit dem Chor'
    },
    {
      icon: 'insights',
      title: 'Statistiken',
      description: 'Behalten Sie den Überblick über Anwesenheit und Aktivitäten'
    }
  ];
}
