/**
 * Storage utility functions for safe localStorage and sessionStorage operations.
 * Handles JSON serialization/deserialization safely.
 */

/**
 * Safely retrieves a JSON value from storage.
 *
 * @param key - The storage key
 * @param storage - The storage instance (localStorage or sessionStorage)
 * @returns The parsed value or null if not found or invalid
 *
 * @example
 * const user = getFromStorage<User>('user', localStorage);
 */
export function getFromStorage<T = any>(key: string, storage: Storage): T | null {
  try {
    const item = storage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error retrieving from storage key "${key}":`, error);
    return null;
  }
}

/**
 * Safely stores a JSON value in storage.
 *
 * @param key - The storage key
 * @param value - The value to store
 * @param storage - The storage instance (localStorage or sessionStorage)
 *
 * @example
 * setInStorage('user', {id: 1, name: 'Alice'}, localStorage);
 */
export function setInStorage<T>(key: string, value: T, storage: Storage): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error storing in storage key "${key}":`, error);
  }
}

/**
 * Removes a key from storage.
 *
 * @param key - The storage key
 * @param storage - The storage instance (localStorage or sessionStorage)
 *
 * @example
 * removeFromStorage('user', localStorage);
 */
export function removeFromStorage(key: string, storage: Storage): void {
  try {
    storage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from storage key "${key}":`, error);
  }
}

/**
 * Checks if a key exists in storage.
 *
 * @param key - The storage key
 * @param storage - The storage instance (localStorage or sessionStorage)
 * @returns true if the key exists
 *
 * @example
 * if (hasInStorage('user', localStorage)) {
 *   // key exists
 * }
 */
export function hasInStorage(key: string, storage: Storage): boolean {
  return storage.getItem(key) !== null;
}

/**
 * Clears all keys from storage, optionally keeping certain prefixes.
 *
 * @param storage - The storage instance (localStorage or sessionStorage)
 * @param keepPrefixes - Array of prefixes to preserve (e.g., ['app_'])
 *
 * @example
 * clearStorage(localStorage, ['app_']);  // Clears all except keys starting with 'app_'
 */
export function clearStorage(storage: Storage, keepPrefixes: string[] = []): void {
  const keys = Object.keys(storage);
  for (const key of keys) {
    if (!keepPrefixes.some(prefix => key.startsWith(prefix))) {
      storage.removeItem(key);
    }
  }
}
