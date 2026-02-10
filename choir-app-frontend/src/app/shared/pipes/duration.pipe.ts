import { Pipe, PipeTransform } from '@angular/core';

/**
 * Transforms a duration in seconds to a formatted string in "mm:ss" format.
 *
 * @example
 * // In template
 * {{ 125 | duration }}  // Output: "02:05"
 * {{ 3661 | duration }} // Output: "61:01"
 * {{ null | duration }} // Output: ""
 *
 * @example
 * // In component
 * constructor(private durationPipe: DurationPipe) {}
 * const formatted = this.durationPipe.transform(125); // "02:05"
 */
@Pipe({
  name: 'duration',
  standalone: true,
  pure: true
})
export class DurationPipe implements PipeTransform {
  /**
   * Transforms seconds to "mm:ss" format.
   *
   * @param value - The duration in seconds (number) or null/undefined
   * @returns Formatted string "mm:ss" or empty string if input is null/undefined
   */
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || typeof value !== 'number') {
      return '';
    }

    const minutes = Math.floor(value / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(value % 60)
      .toString()
      .padStart(2, '0');

    return `${minutes}:${seconds}`;
  }
}
