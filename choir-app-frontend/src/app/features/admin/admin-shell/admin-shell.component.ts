import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { ResponsiveService } from '@shared/services/responsive.service';
import { AdminNavGroup, groupAdminNavByCategory } from '../admin-nav.config';

/**
 * Persistente Hülle für den gesamten Administrationsbereich.
 *
 * Stellt eine nach Kategorie gruppierte Kontext-Navigation bereit, die beim
 * Wechsel zwischen den Hubs sichtbar bleibt. Auf Mobilgeräten wird die Leiste
 * durch ein kompaktes Menü ersetzt, um Platz zu sparen.
 */
@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
})
export class AdminShellComponent {
  readonly groups: AdminNavGroup[] = groupAdminNavByCategory();
  readonly isMobile$: Observable<boolean>;

  constructor(responsive: ResponsiveService) {
    this.isMobile$ = responsive.isHandset$;
  }
}
