import { Injectable, OnDestroy } from '@angular/core';

interface PracticeMediaRecord {
  pieceLinkId: number;
  url: string;
  blob: Blob;
  mimeType: string;
  size: number;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class PracticeOfflineMediaService implements OnDestroy {
  private readonly DB_NAME = 'choirapp-practice-offline';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'media';
  private dbPromise: Promise<IDBDatabase> | null = null;
  private objectUrlMap = new Map<number, string>();

  ngOnDestroy(): void {
    this.revokeAllObjectUrls();
  }

  async pinMedia(pieceLinkId: number, absoluteUrl: string): Promise<void> {
    const response = await fetch(absoluteUrl, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Download fehlgeschlagen (${response.status})`);
    }

    const blob = await response.blob();
    const record: PracticeMediaRecord = {
      pieceLinkId,
      url: absoluteUrl,
      blob,
      mimeType: blob.type || 'application/octet-stream',
      size: blob.size,
      updatedAt: Date.now()
    };

    await this.put(record);
  }

  async unpinMedia(pieceLinkId: number): Promise<void> {
    await this.delete(pieceLinkId);
    this.revokeObjectUrl(pieceLinkId);
  }

  async hasPinnedMedia(pieceLinkId: number): Promise<boolean> {
    const record = await this.get(pieceLinkId);
    return !!record;
  }

  async getPinnedMediaObjectUrl(pieceLinkId: number): Promise<string | null> {
    const existing = this.objectUrlMap.get(pieceLinkId);
    if (existing) {
      return existing;
    }

    const record = await this.get(pieceLinkId);
    if (!record) {
      return null;
    }

    const objectUrl = URL.createObjectURL(record.blob);
    this.objectUrlMap.set(pieceLinkId, objectUrl);
    return objectUrl;
  }

  async getAllPinnedIds(): Promise<number[]> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORE_NAME], 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.getAllKeys();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve((req.result as number[]) || []);
    });
  }

  async getStorageUsageBytes(): Promise<number> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORE_NAME], 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const rows = (req.result as PracticeMediaRecord[]) || [];
        const bytes = rows.reduce((sum, row) => sum + (row.size || row.blob?.size || 0), 0);
        resolve(bytes);
      };
    });
  }

  private async openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error ?? new Error('IndexedDB konnte nicht geöffnet werden.'));
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'pieceLinkId' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  private async get(pieceLinkId: number): Promise<PracticeMediaRecord | null> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORE_NAME], 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.get(pieceLinkId);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve((req.result as PracticeMediaRecord) || null);
    });
  }

  private async put(record: PracticeMediaRecord): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.put(record);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  private async delete(pieceLinkId: number): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.delete(pieceLinkId);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  private revokeObjectUrl(pieceLinkId: number): void {
    const objectUrl = this.objectUrlMap.get(pieceLinkId);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      this.objectUrlMap.delete(pieceLinkId);
    }
  }

  private revokeAllObjectUrls(): void {
    this.objectUrlMap.forEach(url => URL.revokeObjectURL(url));
    this.objectUrlMap.clear();
  }
}
