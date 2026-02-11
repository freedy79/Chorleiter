/**
 * Object utility functions for common object operations.
 * Consolidates object manipulation logic used across the application.
 */

/**
 * Performs a deep clone of an object using JSON serialization.
 * Warning: Does not work with functions, symbols, undefined values, or circular references.
 *
 * @param obj - The object to clone
 * @returns A deep clone of the object
 *
 * @example
 * const original = {a: 1, b: {c: 2}};
 * const cloned = deepClone(original);
 * cloned.b.c = 3;
 * console.log(original.b.c);  // 2 (unchanged)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Safely retrieves a nested property value using a path string.
 * Returns undefined if the path doesn't exist.
 *
 * @param obj - The object to retrieve from
 * @param path - The property path (e.g., 'user.profile.name')
 * @returns The value at the path, or undefined
 *
 * @example
 * const obj = {user: {profile: {name: 'Alice'}}};
 * safeGet(obj, 'user.profile.name')  // 'Alice'
 * safeGet(obj, 'user.email')         // undefined
 */
export function safeGet<T = any>(obj: any, path: string): T | undefined {
  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current == null) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Safely sets a value at a nested property path, creating intermediate objects as needed.
 *
 * @param obj - The object to modify
 * @param path - The property path (e.g., 'user.profile.name')
 * @param value - The value to set
 *
 * @example
 * const obj = {};
 * safeSet(obj, 'user.profile.name', 'Alice');
 * console.log(obj);  // {user: {profile: {name: 'Alice'}}}
 */
export function safeSet(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop();

  if (!lastKey) return;

  let current: any = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
}

/**
 * Merges one or more source objects into a target object (shallow merge).
 *
 * @param target - The target object
 * @param sources - Objects to merge into target
 * @returns The modified target object
 *
 * @example
 * const obj = {a: 1, b: 2};
 * merge(obj, {b: 3, c: 4});
 * console.log(obj);  // {a: 1, b: 3, c: 4}
 */
export function merge<T extends Record<string, any>>(target: T, ...sources: Array<Partial<T>>): T {
  return Object.assign(target, ...sources);
}

/**
 * Creates a new object with only the specified keys from the source object.
 *
 * @param obj - The source object
 * @param keys - The keys to include
 * @returns New object with only the specified keys
 *
 * @example
 * const obj = {a: 1, b: 2, c: 3};
 * pick(obj, ['a', 'c']);  // {a: 1, c: 3}
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Partial<T> {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {} as Partial<T>);
}

/**
 * Creates a new object excluding the specified keys from the source object.
 *
 * @param obj - The source object
 * @param keys - The keys to exclude
 * @returns New object without the specified keys
 *
 * @example
 * const obj = {a: 1, b: 2, c: 3};
 * omit(obj, ['b']);  // {a: 1, c: 3}
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const keysSet = new Set(keys);
  return Object.keys(obj).reduce((result, key) => {
    if (!keysSet.has(key as K)) {
      (result as any)[key] = obj[key as K];
    }
    return result;
  }, {} as Omit<T, K>);
}

/**
 * Checks if an object is empty (has no own properties).
 *
 * @param obj - The object to check
 * @returns true if object has no properties
 *
 * @example
 * isEmpty({})         // true
 * isEmpty({a: 1})     // false
 */
export function isEmpty(obj: any): boolean {
  return obj == null || Object.keys(obj).length === 0;
}
