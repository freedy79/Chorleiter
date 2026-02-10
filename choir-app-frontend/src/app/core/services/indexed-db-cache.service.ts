import { Injectable } from '@angular/core';
import { CachedImage, IDBImageRecord } from '../models/cached-image';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBCacheService {
  private readonly DB_NAME = 'choirapp-image-cache';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'images';
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {}

  /**
   * Initialize and open IndexedDB connection
   */
  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (event.oldVersion < 1) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Get cached image by key
   */
  async get(key: string): Promise<CachedImage | null> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const record = request.result as IDBImageRecord | undefined;
          if (record) {
            resolve(this.recordToCachedImage(record));
          } else {
            resolve(null);
          }
        };
      });
    } catch (error) {
      console.error('[IndexedDB] Get error:', error);
      return null;
    }
  }

  /**
   * Store cached image
   */
  async set(image: CachedImage): Promise<void> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const record: IDBImageRecord = this.cachedImageToRecord(image);
        const request = store.put(record);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IndexedDB] Set error:', error);
      throw error;
    }
  }

  /**
   * Delete cached image by key
   */
  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IndexedDB] Delete error:', error);
    }
  }

  /**
   * Delete multiple images by type
   */
  async deleteByType(type: string): Promise<void> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index('type');
        const request = index.openCursor(IDBKeyRange.only(type));

        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    } catch (error) {
      console.error('[IndexedDB] DeleteByType error:', error);
    }
  }

  /**
   * Clear all cached images
   */
  async clear(): Promise<void> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IndexedDB] Clear error:', error);
    }
  }

  /**
   * Get all cache keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAllKeys();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch (error) {
      console.error('[IndexedDB] GetAllKeys error:', error);
      return [];
    }
  }

  /**
   * Get total cache size in bytes
   */
  async getTotalSize(): Promise<number> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const records = request.result as IDBImageRecord[];
          const totalSize = records.reduce((sum, record) => sum + (record.size || 0), 0);
          resolve(totalSize);
        };
      });
    } catch (error) {
      console.error('[IndexedDB] GetTotalSize error:', error);
      return 0;
    }
  }

  /**
   * Get number of cached items
   */
  async count(): Promise<number> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.count();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    } catch (error) {
      console.error('[IndexedDB] Count error:', error);
      return 0;
    }
  }

  /**
   * Evict oldest items using LRU strategy until target size is reached
   */
  async evictLRU(targetSizeBytes: number): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('timestamp');

      let currentSize = await this.getTotalSize();
      if (currentSize <= targetSizeBytes) {
        return;
      }

      return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'next');

        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

          if (cursor && currentSize > targetSizeBytes) {
            const record = cursor.value as IDBImageRecord;
            currentSize -= record.size || 0;
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    } catch (error) {
      console.error('[IndexedDB] EvictLRU error:', error);
    }
  }

  /**
   * Update access timestamp for an image (for LRU tracking)
   */
  async touch(key: string): Promise<void> {
    try {
      const image = await this.get(key);
      if (image) {
        image.timestamp = Date.now();
        image.accessCount++;
        await this.set(image);
      }
    } catch (error) {
      console.error('[IndexedDB] Touch error:', error);
    }
  }

  /**
   * Check if IndexedDB is available
   */
  isAvailable(): boolean {
    try {
      return typeof indexedDB !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Convert IDBImageRecord to CachedImage
   */
  private recordToCachedImage(record: IDBImageRecord): CachedImage {
    return {
      key: record.key,
      data: record.data,
      timestamp: record.timestamp,
      size: record.size,
      accessCount: 0,
      metadata: {
        type: record.type,
        id: record.id,
        mimeType: record.mimeType
      }
    };
  }

  /**
   * Convert CachedImage to IDBImageRecord
   */
  private cachedImageToRecord(image: CachedImage): IDBImageRecord {
    return {
      key: image.key,
      data: image.data,
      timestamp: image.timestamp,
      size: image.size,
      type: image.metadata?.type || 'piece',
      id: image.metadata?.id || 0,
      mimeType: image.metadata?.mimeType,
      createdAt: Date.now()
    };
  }
}
