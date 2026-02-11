/**
 * Duration utility functions for working with time durations.
 * Consolidates duration parsing and formatting logic used across the application.
 */

/**
 * Formats a duration in seconds to "MM:SS" format with zero-padding.
 *
 * @param seconds - The duration in seconds (number) or null/undefined
 * @returns Formatted string "MM:SS" or empty string if input is null/undefined
 *
 * @example
 * formatSecondsAsDuration(125)  // "02:05"
 * formatSecondsAsDuration(3661) // "61:01"
 * formatSecondsAsDuration(null) // ""
 */
export function formatSecondsAsDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || typeof seconds !== 'number') {
    return '';
  }

  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${remainingSeconds}`;
}

/**
 * Parses a duration string in "MM:SS" format to total seconds.
 *
 * @param duration - The duration string in "MM:SS" or "M:SS" format
 * @returns Total seconds as a number, or null if input is invalid
 *
 * @example
 * parseDurationToSeconds("02:05")  // 125
 * parseDurationToSeconds("61:01")  // 3661
 * parseDurationToSeconds("5:30")   // 330
 * parseDurationToSeconds("invalid") // null
 * parseDurationToSeconds("")       // null
 */
export function parseDurationToSeconds(duration: string | null | undefined): number | null {
  if (!duration) return null;

  // Match format: 1-2 digits, colon, exactly 2 digits (MM:SS or M:SS)
  const match = duration.match(/^\d{1,2}:\d{2}$/);
  if (!match) return null;

  const [minutes, seconds] = duration.split(':').map(v => parseInt(v, 10));

  // Validate parsed values
  if (isNaN(minutes) || isNaN(seconds) || seconds >= 60) {
    return null;
  }

  return minutes * 60 + seconds;
}
