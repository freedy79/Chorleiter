import { Pipe, PipeTransform } from '@angular/core';

/**
 * Interface for plan entry with notes.
 */
export interface PlanEntry {
  notes?: string | null;
}

/**
 * Transforms a plan entry into a short event type abbreviation
 * by analyzing the notes field.
 *
 * @example
 * // In template
 * {{ entry | eventShort }}
 * // Input: { notes: "Gottesdienst 10:00" }
 * // Output: "GD"
 *
 * {{ entry | eventShort }}
 * // Input: { notes: "Chorprobe im Gemeindesaal" }
 * // Output: "CP"
 *
 * {{ entry | eventShort }}
 * // Input: { notes: "Konzert" }
 * // Output: ""
 */
@Pipe({
  name: 'eventShort',
  standalone: true,
  pure: true
})
export class EventShortPipe implements PipeTransform {
  /**
   * Transforms plan entry to short event type abbreviation.
   *
   * @param value - Plan entry object with notes field
   * @returns Short abbreviation ("GD" for Gottesdienst, "CP" for Chorprobe) or empty string
   */
  transform(value: PlanEntry | null | undefined): string {
    if (!value || !value.notes) {
      return '';
    }

    const notes = value.notes.toLowerCase();

    // Check for Gottesdienst (service)
    if (/\b(gottesdienst|gd)\b/.test(notes)) {
      return 'GD';
    }

    // Check for Chorprobe (choir rehearsal)
    if (/\b(chorprobe|probe|cp)\b/.test(notes)) {
      return 'CP';
    }

    return '';
  }
}
