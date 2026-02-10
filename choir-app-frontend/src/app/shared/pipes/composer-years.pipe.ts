import { Pipe, PipeTransform } from '@angular/core';

/**
 * Interface for composer or person with birth and death years.
 */
export interface ComposerYears {
  birthYear?: number | null;
  deathYear?: number | null;
}

/**
 * Transforms a composer object with birth/death years into a formatted string.
 *
 * @example
 * // In template
 * {{ composer | composerYears }}
 * // Input: { birthYear: 1685, deathYear: 1750 }
 * // Output: " (1685-1750)"
 *
 * {{ composer | composerYears }}
 * // Input: { birthYear: 1900 }
 * // Output: " (1900)"
 *
 * {{ composer | composerYears }}
 * // Input: null or { }
 * // Output: ""
 *
 * @example
 * // With prefix option
 * {{ composer | composerYears:false }}
 * // Input: { birthYear: 1685, deathYear: 1750 }
 * // Output: "1685-1750" (no parentheses or leading space)
 */
@Pipe({
  name: 'composerYears',
  standalone: true,
  pure: true
})
export class ComposerYearsPipe implements PipeTransform {
  /**
   * Transforms composer years to formatted string.
   *
   * @param value - Composer object with birthYear and/or deathYear
   * @param includeParentheses - Whether to include leading space and parentheses (default: true)
   * @returns Formatted string with years, or empty string if no birth year
   */
  transform(value: ComposerYears | null | undefined, includeParentheses: boolean = true): string {
    if (!value || !value.birthYear) {
      return '';
    }

    const yearsText = value.deathYear
      ? `${value.birthYear}-${value.deathYear}`
      : `${value.birthYear}`;

    return includeParentheses ? ` (${yearsText})` : yearsText;
  }
}
