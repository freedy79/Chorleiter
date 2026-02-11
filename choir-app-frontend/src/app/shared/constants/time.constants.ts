/**
 * Time-related constants.
 * Consolidates time and duration values used throughout the application.
 */

/**
 * Milliseconds per second.
 */
export const MS_PER_SECOND = 1000;

/**
 * Milliseconds per minute.
 */
export const MS_PER_MINUTE = 60 * 1000;

/**
 * Milliseconds per hour.
 */
export const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Milliseconds per day.
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Seconds per minute.
 */
export const SECONDS_PER_MINUTE = 60;

/**
 * Minutes per hour.
 */
export const MINUTES_PER_HOUR = 60;

/**
 * Hours per day.
 */
export const HOURS_PER_DAY = 24;

/**
 * Days per week.
 */
export const DAYS_PER_WEEK = 7;

/**
 * Common polling interval (30 minutes in milliseconds).
 */
export const POLLING_INTERVAL_30_MIN = 30 * MS_PER_MINUTE;

/**
 * Common cache TTL (1 hour in seconds).
 */
export const CACHE_TTL_1_HOUR = 60 * 60;

/**
 * Common cache TTL (5 minutes in seconds).
 */
export const CACHE_TTL_5_MIN = 5 * 60;

/**
 * Common debounce delay (300 milliseconds).
 */
export const DEBOUNCE_DELAY = 300;

/**
 * Common debounce delay for search (500 milliseconds).
 */
export const SEARCH_DEBOUNCE_DELAY = 500;

/**
 * Converts seconds to milliseconds.
 *
 * @param seconds - Number of seconds
 * @returns Number of milliseconds
 */
export function secondsToMs(seconds: number): number {
  return seconds * MS_PER_SECOND;
}

/**
 * Converts minutes to milliseconds.
 *
 * @param minutes - Number of minutes
 * @returns Number of milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * MS_PER_MINUTE;
}

/**
 * Converts hours to milliseconds.
 *
 * @param hours - Number of hours
 * @returns Number of milliseconds
 */
export function hoursToMs(hours: number): number {
  return hours * MS_PER_HOUR;
}

/**
 * Converts days to milliseconds.
 *
 * @param days - Number of days
 * @returns Number of milliseconds
 */
export function daysToMs(days: number): number {
  return days * MS_PER_DAY;
}
