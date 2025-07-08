import { Pipe, PipeTransform } from '@angular/core';
import { getHolidayName } from '../util/holiday';

@Pipe({
  name: 'holidayName',
  standalone: true
})
export class HolidayNamePipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return getHolidayName(date) || '';
  }
}
