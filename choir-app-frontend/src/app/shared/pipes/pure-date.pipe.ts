import { Pipe, PipeTransform } from '@angular/core';
import { parseDateOnly } from '@shared/util/date';

@Pipe({
  name: 'pureDate',
  standalone: true
})
export class PureDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    return parseDateOnly(value);
  }
}
