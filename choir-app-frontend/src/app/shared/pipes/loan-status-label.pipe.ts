import { Pipe, PipeTransform } from '@angular/core';

/**
 * Wandelt den Ausleihstatus in deutsche Bezeichnungen um.
 */
@Pipe({
  name: 'loanStatusLabel',
  standalone: true
})
export class LoanStatusLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    switch (value) {
      case 'available':
        return 'Verfügbar';
      case 'borrowed':
        return 'Verliehen';
      default:
        return value;
    }
  }
}
