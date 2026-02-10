import { Pipe, PipeTransform } from '@angular/core';

/**
 * Joins an array of objects by extracting a property and concatenating the values.
 *
 * @example
 * // In template - join by property
 * {{ choirs | join:'name' }}
 * // Input: [{ name: "Choir A" }, { name: "Choir B" }]
 * // Output: "Choir A, Choir B"
 *
 * @example
 * // With custom separator
 * {{ choirs | join:'name':' | ' }}
 * // Input: [{ name: "Choir A" }, { name: "Choir B" }]
 * // Output: "Choir A | Choir B"
 *
 * @example
 * // Join array of strings (no property needed)
 * {{ tags | join }}
 * // Input: ["tag1", "tag2", "tag3"]
 * // Output: "tag1, tag2, tag3"
 *
 * @example
 * // Empty array
 * {{ emptyArray | join:'name' }}
 * // Input: []
 * // Output: ""
 */
@Pipe({
  name: 'join',
  standalone: true,
  pure: true
})
export class JoinPipe implements PipeTransform {
  /**
   * Joins array elements by property or as strings.
   *
   * @param value - Array of objects or primitives
   * @param property - Property name to extract from objects (optional for primitive arrays)
   * @param separator - Separator string (default: ', ')
   * @returns Joined string or empty string if array is null/undefined/empty
   */
  transform(
    value: any[] | null | undefined,
    property?: string,
    separator: string = ', '
  ): string {
    if (!value || !Array.isArray(value) || value.length === 0) {
      return '';
    }

    if (property) {
      // Extract property from each object and filter out null/undefined
      return value
        .map(item => item?.[property])
        .filter(val => val !== null && val !== undefined && val !== '')
        .join(separator);
    } else {
      // Join primitive values directly
      return value
        .filter(val => val !== null && val !== undefined && val !== '')
        .join(separator);
    }
  }
}
