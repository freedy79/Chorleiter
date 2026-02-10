export interface CachedImage {
  key: string;              // Format: "piece:123" or "collection:456"
  data: string;             // base64 encoded image data
  timestamp: number;        // Last access time (for LRU)
  size: number;             // Data size in bytes
  accessCount: number;      // Usage tracking
  metadata?: {
    type: 'piece' | 'collection' | 'post';
    id: number;
    mimeType?: string;
  };
}

export interface CacheConfig {
  memory: {
    maxItems: number;       // Default: 50
    maxSizeBytes: number;   // Default: 50MB
  };
  indexedDB: {
    maxItems: number;       // Default: 500
    maxSizeBytes: number;   // Default: 200MB
    dbName: string;
    version: number;
  };
}

export interface CacheStats {
  memory: { items: number; sizeBytes: number; hitRate: number };
  indexedDB: { items: number; sizeBytes: number; hitRate: number };
  network: { requests: number; failures: number };
}

export interface ImageRef {
  type: 'piece' | 'collection' | 'post';
  id: number;
}

export interface PreloadOptions {
  priority?: 'high' | 'medium' | 'low';
  maxConcurrent?: number;
  abortSignal?: AbortSignal;
}

export interface IDBImageRecord {
  key: string;
  data: string;
  timestamp: number;
  size: number;
  type: 'piece' | 'collection' | 'post';
  id: number;
  mimeType?: string;
  createdAt: number;
}
