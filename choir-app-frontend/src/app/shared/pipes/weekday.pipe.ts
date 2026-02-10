import { Pipe, PipeTransform } from '@angular/core';
import { parseDateOnly } from '@shared/util/date';

/**
 * Weekday format options.
 */
export type WeekdayFormat = 'short' | 'long';

/**
 * Transforms a date into a weekday name (German locale).
 *
 * @example
 * // In template - short format (default)
 * {{ date | weekday }}
 * // Input: "2024-01-15" (Monday)
 * // Output: "Mo"
 *
 * @example
 * // Long format
 * {{ date | weekday:'long' }}
 * // Input: "2024-01-15" (Monday)
 * // Output: "Montag"
 *
 * @example
 * // Works with Date objects
 * {{ dateObject | weekday }}
 * // Input: Date object for Monday
 * // Output: "Mo"
 */
@Pipe({
  name: 'weekday',
  standalone: true,
  pure: true
})
export class WeekdayPipe implements PipeTransform {
  private readonly weekdaysShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  private readonly weekdaysLong = [
    'Sonntag',
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag'
  ];

  /**
   * Transforms a date to weekday name.
   *
   * @param value - Date string or Date object
   * @param format - Display format: 'short' (default) or 'long'
   * @returns Weekday name in German or empty string if input is invalid
   */
  transform(value: string | Date | null | undefined, format: WeekdayFormat = 'short'): string {
    if (!value) {
      return '';
    }

    try {
      const date = parseDateOnly(value);
      const dayIndex = date.getUTCDay();

      return format === 'long'
        ? this.weekdaysLong[dayIndex]
        : this.weekdaysShort[dayIndex];
    } catch (error) {
      return '';
    }
  }
}
