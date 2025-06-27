import { Pipe, PipeTransform } from '@angular/core';

/**
 * Wandelt die Event-Typen "SERVICE" und "REHEARSAL" in ihre deutschen
 * Bezeichnungen um.
 */
@Pipe({
  name: 'eventTypeLabel',
  standalone: true
})
export class EventTypeLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    switch (value) {
      case 'SERVICE':
        return 'Gottesdienst';
      case 'REHEARSAL':
        return 'Probe';
      default:
        return value;
    }
  }
}
