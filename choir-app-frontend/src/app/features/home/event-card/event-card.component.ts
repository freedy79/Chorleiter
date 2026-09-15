import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { NotificationService } from '@core/services/notification.service';

import { MaterialModule } from '@modules/material.module';
import { Event, EventPiece } from 'src/app/core/models/event';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { ApiService } from '@core/services/api.service';

type AvailabilityStatus = 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule,
    PureDatePipe
  ],
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.scss']
})
export class EventCardComponent {
  private readonly availabilityLabels: Record<AvailabilityStatus, string> = {
    AVAILABLE: 'Zugesagt',
    MAYBE: 'Vielleicht',
    UNAVAILABLE: 'Abgesagt'
  };

  private readonly availabilityIcons: Record<AvailabilityStatus, string> = {
    AVAILABLE: 'check_circle',
    MAYBE: 'help',
    UNAVAILABLE: 'cancel'
  };

  /**
   * Der Titel, der in der Kopfzeile der Karte angezeigt wird (z.B. "Letzter Gottesdienst").
   */
  @Input() cardTitle: string = 'Event';

  /**
   * Das Event-Objekt, das angezeigt werden soll. Kann null sein, wenn kein Event gefunden wurde.
   */
  @Input() event: Event | null = null;
  @Input() availabilityStatus: AvailabilityStatus | null = null;
  @Input() allowAvailabilityActions = false;
  @Input() choirId?: number | null;
  availabilityMenuOpen = false;

  readonly availabilityOptions: Array<{ value: AvailabilityStatus; icon: string; label: string }> = [
    { value: 'AVAILABLE', icon: 'check_circle', label: 'Zusage' },
    { value: 'MAYBE', icon: 'help', label: 'Vielleicht' },
    { value: 'UNAVAILABLE', icon: 'cancel', label: 'Absage' }
  ];
  isSavingAvailability = false;

  constructor(
    private clipboard: Clipboard,
    private notification: NotificationService,
    private api: ApiService
  ) {}

  getPieceSubtitle(piece: EventPiece): string {
    if (!piece) {
      return '';
    }
    const composer = piece.composer?.name || piece.origin || '';
    const author = piece.author?.name || piece.lyricsSource || '';
    return author ? `${composer} - ${author}` : composer;
  }

  getPieceReference(piece: EventPiece): string {
    if (piece.collections && piece.collections.length > 0) {
      const ref = piece.collections[0]; // Nehmen Sie die erste Referenz für die Anzeige
      // Die Datenstruktur hängt davon ab, wie Sequelize sie zurückgibt
      const num = (ref as any).collection_piece?.numberInCollection;

      if (num && !ref.singleEdition) {
        const prefix = ref.prefix || '';
        return `${prefix}${num}`;
      }
    }
    // Fallback, wenn keine Referenz vorhanden ist
    return '';
  }

  copyPieceList(): void {
    if (!this.event || !this.event.pieces || this.event.pieces.length === 0) {
      return;
    }
    const lines = this.event.pieces.map(p => {
      const ref = this.getPieceReference(p);
      const sub = this.getPieceSubtitle(p);
      const refPart = ref ? `${ref} ` : '';
      const subPart = sub ? ` – ${sub}` : '';
      return `- ${refPart}${p.title}${subPart}`;
    });
    const text = lines.join('\n');
    if (this.clipboard.copy(text)) {
      this.notification.success('Liste kopiert');
    }
  }

  setAvailability(status: AvailabilityStatus, event?: MouseEvent): void {
    event?.stopPropagation();
    if (!this.event?.date || this.isSavingAvailability || this.availabilityStatus === status) {
      return;
    }

    this.isSavingAvailability = true;
    this.api.setAvailability(this.event.date.slice(0, 10), status, this.choirId ?? this.event.choirId).subscribe({
      next: (updated) => {
        this.availabilityStatus = updated.status;
        this.isSavingAvailability = false;
        this.notification.success(`${this.getAvailabilityLabel(updated.status)} gespeichert.`);
      },
      error: () => {
        this.isSavingAvailability = false;
        this.notification.error('Verfügbarkeit konnte nicht gespeichert werden.');
      }
    });
  }

  isActiveAvailability(status: AvailabilityStatus): boolean {
    return this.availabilityStatus === status;
  }

  openAvailabilityMenu(event?: MouseEvent): void {
    event?.stopPropagation();
    this.availabilityMenuOpen = true;
  }

  updateAvailabilityFromMenu(status: AvailabilityStatus, event: MouseEvent): void {
    event.stopPropagation();
    this.setAvailability(status, event);
  }

  getAvailabilityLabel(status: AvailabilityStatus | null | undefined): string {
    return status ? this.availabilityLabels[status] : 'Noch keine Rückmeldung';
  }

  getAvailabilityIcon(status: AvailabilityStatus | null | undefined): string {
    return status ? this.availabilityIcons[status] : 'event_available';
  }

  getAvailabilityClass(status: AvailabilityStatus | null | undefined): string {
    if (!status) {
      return 'status-unset';
    }
    if (status === 'AVAILABLE') {
      return 'status-available';
    }
    if (status === 'UNAVAILABLE') {
      return 'status-unavailable';
    }
    return 'status-maybe';
  }

  getEventTypeLabel(): string {
    if (this.event?.type === 'SERVICE') {
      return 'Gottesdienst';
    }
    if (this.event?.type === 'REHEARSAL') {
      return 'Probe';
    }
    return 'Termin';
  }
}
