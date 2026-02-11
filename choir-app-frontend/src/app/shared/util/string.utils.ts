/**
 * String utility functions for common string operations.
 * Consolidates string manipulation logic used across the application.
 */

/**
 * Performs case-insensitive substring search.
 * Returns true if the text contains the query (case-insensitive).
 *
 * @param text - The text to search in
 * @param query - The search query
 * @returns true if text contains query (case-insensitive), false otherwise
 *
 * @example
 * searchContainsIgnoreCase('Hello World', 'world')  // true
 * searchContainsIgnoreCase('Test', 'xyz')           // false
 */
export function searchContainsIgnoreCase(text: string, query: string): boolean {
  if (!text || !query) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Pads a number with leading zeros to the specified number of digits.
 *
 * @param num - The number to pad
 * @param digits - The target number of digits (default: 2)
 * @returns The padded number as a string
 *
 * @example
 * padZero(5, 2)        // "05"
 * padZero(25, 2)       // "25"
 * padZero(5, 3)        // "005"
 */
export function padZero(num: number | string, digits: number = 2): string {
  return String(num).padStart(digits, '0');
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param str - The string to capitalize
 * @returns The string with first character capitalized
 *
 * @example
 * capitalize('hello')  // "Hello"
 * capitalize('world')  // "World"
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Trims whitespace from both ends of a string safely.
 * Returns empty string if input is null/undefined.
 *
 * @param str - The string to trim
 * @returns Trimmed string or empty string
 *
 * @example
 * safeTrim('  hello  ')   // "hello"
 * safeTrim(null)          // ""
 */
export function safeTrim(str: string | null | undefined): string {
  return str?.trim() ?? '';
}

/**
 * Checks if a string is null, undefined, or consists only of whitespace.
 *
 * @param str - The string to check
 * @returns true if string is empty or whitespace-only, false otherwise
 *
 * @example
 * isEmptyOrWhitespace('')       // true
 * isEmptyOrWhitespace('  ')     // true
 * isEmptyOrWhitespace('hello')  // false
 */
export function isEmptyOrWhitespace(str: string | null | undefined): boolean {
  return !str || !str.trim();
}

/**
 * Truncates a string to a maximum length with ellipsis.
 *
 * @param str - The string to truncate
 * @param maxLength - The maximum length (including ellipsis)
 * @returns Truncated string with "..." if needed
 *
 * @example
 * truncate('Hello World', 8)  // "Hello..."
 * truncate('Hi', 8)           // "Hi"
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
