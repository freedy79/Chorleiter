import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

import { Piece } from 'src/app/core/models/piece';
import { Event } from 'src/app/core/models/event';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule
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

  getPieceSubtitle(piece: Piece): string {
    if (!piece) {
      return '';
    }
    return piece.composer?.name || '';
  }

  getPieceReference(piece: Piece): string {
    if (piece.collections && piece.collections.length > 0) {
      const ref = piece.collections[0]; // Nehmen Sie die erste Referenz für die Anzeige
      // Die Datenstruktur hängt davon ab, wie Sequelize sie zurückgibt
      const num = (ref as any).collection_piece?.numberInCollection;

      if (num) {
        return `${ref.prefix || ''}${num}`;
      }
    }
    // Fallback, wenn keine Referenz vorhanden ist
    return '';
  }
}
