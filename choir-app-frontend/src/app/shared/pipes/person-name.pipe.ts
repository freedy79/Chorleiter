import { Pipe, PipeTransform } from '@angular/core';

/**
 * Interface for person object with name and firstName.
 */
export interface Person {
  name?: string | null;
  firstName?: string | null;
}

/**
 * Display format options for person names.
 */
export type PersonNameFormat = 'lastFirst' | 'firstLast' | 'lastOnly' | 'firstOnly';

/**
 * Transforms a person object into a formatted name string.
 *
 * @example
 * // In template - default format "lastFirst"
 * {{ person | personName }}
 * // Input: { name: "Müller", firstName: "Hans" }
 * // Output: "Müller, Hans"
 *
 * @example
 * // First name first
 * {{ person | personName:'firstLast' }}
 * // Input: { name: "Müller", firstName: "Hans" }
 * // Output: "Hans Müller"
 *
 * @example
 * // Last name only
 * {{ person | personName:'lastOnly' }}
 * // Input: { name: "Müller", firstName: "Hans" }
 * // Output: "Müller"
 *
 * @example
 * // Handling missing data
 * {{ person | personName }}
 * // Input: { name: "Müller" }
 * // Output: "Müller"
 *
 * {{ person | personName }}
 * // Input: { firstName: "Hans" }
 * // Output: "Hans"
 */
@Pipe({
  name: 'personName',
  standalone: true,
  pure: true
})
export class PersonNamePipe implements PipeTransform {
  /**
   * Transforms a person object to a formatted name string.
   *
   * @param value - Person object with name and/or firstName
   * @param format - Display format (default: 'lastFirst')
   *   - 'lastFirst': "Müller, Hans"
   *   - 'firstLast': "Hans Müller"
   *   - 'lastOnly': "Müller"
   *   - 'firstOnly': "Hans"
   * @returns Formatted name string or empty string if no name data
   */
  transform(value: Person | null | undefined, format: PersonNameFormat = 'lastFirst'): string {
    if (!value) {
      return '';
    }

    const lastName = value.name?.trim() || '';
    const firstName = value.firstName?.trim() || '';

    if (!lastName && !firstName) {
      return '';
    }

    switch (format) {
      case 'lastFirst':
        if (lastName && firstName) {
          return `${lastName}, ${firstName}`;
        }
        return lastName || firstName;

      case 'firstLast':
        if (lastName && firstName) {
          return `${firstName} ${lastName}`;
        }
        return firstName || lastName;

      case 'lastOnly':
        return lastName;

      case 'firstOnly':
        return firstName;

      default:
        return lastName && firstName ? `${lastName}, ${firstName}` : (lastName || firstName);
    }
  }
}
