/**
 * Type guard functions for runtime type checking.
 * Provides safe type checking with proper TypeScript type narrowing.
 */

/**
 * Checks if a value is a string.
 *
 * @param value - The value to check
 * @returns true if value is a string
 *
 * @example
 * if (isString(value)) {
 *   console.log(value.length);  // TypeScript knows value is string
 * }
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Checks if a value is a number.
 *
 * @param value - The value to check
 * @returns true if value is a number
 *
 * @example
 * if (isNumber(value)) {
 *   console.log(value.toFixed(2));  // TypeScript knows value is number
 * }
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Checks if a value is a boolean.
 *
 * @param value - The value to check
 * @returns true if value is a boolean
 *
 * @example
 * if (isBoolean(value)) {
 *   console.log(!value);  // TypeScript knows value is boolean
 * }
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks if a value is a Date object.
 *
 * @param value - The value to check
 * @returns true if value is a Date instance
 *
 * @example
 * if (isDate(value)) {
 *   console.log(value.getTime());  // TypeScript knows value is Date
 * }
 */
export function isDate(value: any): value is Date {
  return value instanceof Date;
}

/**
 * Checks if a value is an array.
 *
 * @param value - The value to check
 * @returns true if value is an array
 *
 * @example
 * if (isArray(value)) {
 *   console.log(value.length);  // TypeScript knows value is array
 * }
 */
export function isArray<T = any>(value: any): value is T[] {
  return Array.isArray(value);
}

/**
 * Checks if a value is an array with at least one element.
 *
 * @param value - The value to check
 * @returns true if value is a non-empty array
 *
 * @example
 * if (isNonEmptyArray(value)) {
 *   console.log(value[0]);  // TypeScript knows value is non-empty array
 * }
 */
export function isNonEmptyArray<T = any>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Checks if a value is a plain object (not null, array, or other type).
 *
 * @param value - The value to check
 * @returns true if value is a plain object
 *
 * @example
 * if (isObject(value)) {
 *   console.log(Object.keys(value));
 * }
 */
export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

/**
 * Checks if a value is null or undefined.
 *
 * @param value - The value to check
 * @returns true if value is null or undefined
 *
 * @example
 * if (isNullOrUndefined(value)) {
 *   console.log('Value is empty');
 * }
 */
export function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Checks if a value is not null and not undefined.
 *
 * @param value - The value to check
 * @returns true if value is neither null nor undefined
 *
 * @example
 * if (isDefined(value)) {
 *   console.log(value);  // TypeScript knows value is defined
 * }
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
