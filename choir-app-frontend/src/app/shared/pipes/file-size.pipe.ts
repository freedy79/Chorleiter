import { Pipe, PipeTransform } from '@angular/core';

/**
 * Transforms file size in bytes to a human-readable format.
 *
 * @example
 * // In template
 * {{ 1536 | fileSize }}       // Output: "1.5 kB"
 * {{ 1048576 | fileSize }}    // Output: "1.0 MB"
 * {{ 500 | fileSize }}        // Output: "0.5 kB"
 * {{ null | fileSize }}       // Output: ""
 *
 * @example
 * // With custom decimal places
 * {{ 1536 | fileSize:2 }}     // Output: "1.50 kB"
 * {{ 1048576 | fileSize:0 }}  // Output: "1 MB"
 */
@Pipe({
  name: 'fileSize',
  standalone: true,
  pure: true
})
export class FileSizePipe implements PipeTransform {
  /**
   * Transforms bytes to human-readable file size.
   *
   * @param value - File size in bytes
   * @param decimals - Number of decimal places to show (default: 1)
   * @returns Formatted string with unit (kB or MB) or empty string if input is null/undefined
   */
  transform(value: number | null | undefined, decimals: number = 1): string {
    if (value === null || value === undefined || typeof value !== 'number') {
      return '';
    }

    const kilobytes = value / 1024;

    if (kilobytes < 1024) {
      return `${kilobytes.toFixed(decimals)} kB`;
    }

    const megabytes = kilobytes / 1024;
    return `${megabytes.toFixed(decimals)} MB`;
  }
}
