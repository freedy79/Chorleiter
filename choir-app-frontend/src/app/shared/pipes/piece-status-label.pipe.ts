import { Pipe, PipeTransform } from '@angular/core';

/**
 * Wandelt die Repertoire-Statuswerte in ihre deutschen Bezeichnungen um.
 */
@Pipe({
  name: 'pieceStatusLabel',
  standalone: true
})
export class PieceStatusLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    switch (value) {
      case 'CAN_BE_SUNG':
        return 'Auff\u00fchrbar';
      case 'IN_REHEARSAL':
        return 'Wird geprobt';
      case 'NOT_READY':
        return 'Nicht im Repertoire';
      default:
        return value;
    }
  }
}
