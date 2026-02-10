import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { NotificationService } from '@core/services/notification.service';

import { MaterialModule } from '@modules/material.module';
import { Event, EventPiece } from 'src/app/core/models/event';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';

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
  /**
   * Der Titel, der in der Kopfzeile der Karte angezeigt wird (z.B. "Letzter Gottesdienst").
   */
  @Input() cardTitle: string = 'Event';

  /**
   * Das Event-Objekt, das angezeigt werden soll. Kann null sein, wenn kein Event gefunden wurde.
   */
  @Input() event: Event | null = null;

  constructor(
    private clipboard: Clipboard,
    private notification: NotificationService
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
}
