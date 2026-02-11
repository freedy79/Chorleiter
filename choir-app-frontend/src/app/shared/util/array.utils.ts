/**
 * Array utility functions for common array operations.
 * Consolidates array manipulation logic used across the application.
 */

/**
 * Returns unique items from an array.
 * Uses strict equality (===) for comparison.
 *
 * @param array - The array to filter
 * @returns New array with duplicate items removed
 *
 * @example
 * unique([1, 2, 2, 3, 3, 3])  // [1, 2, 3]
 * unique(['a', 'b', 'a'])     // ['a', 'b']
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Groups array items by a field value.
 *
 * @param array - The array to group
 * @param key - The field name to group by
 * @returns Object with keys mapping to arrays of items
 *
 * @example
 * const items = [{type: 'A', name: 'x'}, {type: 'A', name: 'y'}, {type: 'B', name: 'z'}];
 * groupBy(items, 'type')  // {A: [{...}, {...}], B: [{...}]}
 */
export function groupBy<T extends Record<K, any>, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Sorts an array using a custom comparison function.
 *
 * @param array - The array to sort
 * @param compareFn - Function that returns negative (a<b), 0 (a==b), or positive (a>b)
 * @returns New sorted array (original is not modified)
 *
 * @example
 * const items = [{name: 'Charlie'}, {name: 'Alice'}, {name: 'Bob'}];
 * sortBy(items, (a, b) => a.name.localeCompare(b.name))
 * // [{name: 'Alice'}, {name: 'Bob'}, {name: 'Charlie'}]
 */
export function sortBy<T>(array: T[], compareFn: (a: T, b: T) => number): T[] {
  return [...array].sort(compareFn);
}

/**
 * Finds the first item in an array matching a predicate.
 *
 * @param array - The array to search
 * @param predicate - Function to test each item
 * @returns The first matching item or undefined
 *
 * @example
 * const items = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
 * findFirst(items, item => item.id === 2)  // {id: 2, name: 'Bob'}
 */
export function findFirst<T>(array: T[], predicate: (item: T) => boolean): T | undefined {
  return array.find(predicate);
}

/**
 * Removes an item from an array at the specified index.
 *
 * @param array - The array to remove from
 * @param index - The index of the item to remove
 * @returns New array without the item at the specified index
 *
 * @example
 * removeAt([1, 2, 3], 1)  // [1, 3]
 */
export function removeAt<T>(array: T[], index: number): T[] {
  return array.filter((_, i) => i !== index);
}

/**
 * Checks if an array contains an item.
 *
 * @param array - The array to check
 * @param item - The item to search for
 * @returns true if array contains the item, false otherwise
 *
 * @example
 * contains([1, 2, 3], 2)        // true
 * contains([1, 2, 3], 4)        // false
 */
export function contains<T>(array: T[], item: T): boolean {
  return array.includes(item);
}

/**
 * Flattens a nested array by one level.
 *
 * @param array - The array to flatten
 * @returns Flattened array
 *
 * @example
 * flatten([[1, 2], [3, 4], [5]])  // [1, 2, 3, 4, 5]
 */
export function flatten<T>(array: T[][]): T[] {
  return array.reduce((result, items) => result.concat(items), []);
}

/**
 * Returns true if the array is empty.
 *
 * @param array - The array to check
 * @returns true if array is null, undefined, or has no items
 *
 * @example
 * isEmpty([])          // true
 * isEmpty([1, 2, 3])   // false
 * isEmpty(null)        // true
 */
export function isEmpty<T>(array: T[] | null | undefined): boolean {
  return !array || array.length === 0;
}

/**
 * Returns true if the array is not empty.
 *
 * @param array - The array to check
 * @returns true if array has at least one item
 *
 * @example
 * isNotEmpty([1])      // true
 * isNotEmpty([])       // false
 */
export function isNotEmpty<T>(array: T[] | null | undefined): array is T[] {
  return Array.isArray(array) && array.length > 0;
}
