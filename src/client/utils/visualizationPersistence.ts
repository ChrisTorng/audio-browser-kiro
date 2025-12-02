/**
 * VisualizationPersistence - IndexedDB storage service for persisting
 * waveform and spectrogram data across page reloads.
 *
 * Features:
 * - Persistent storage using IndexedDB
 * - LRU (Least Recently Used) eviction strategy
 * - Configurable storage limits
 * - Automatic cleanup of old data
 */

/**
 * Configuration options for persistence storage
 */
export interface PersistenceOptions {
  /** Maximum number of waveform entries to store (default: 500) */
  maxWaveformCount: number;
  /** Maximum number of spectrogram entries to store (default: 200) */
  maxSpectrogramCount: number;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Number of waveform entries */
  waveformCount: number;
  /** Number of spectrogram entries */
  spectrogramCount: number;
  /** Estimated total size in bytes */
  totalSize: number;
}

/**
 * Stored waveform entry in IndexedDB
 */
interface WaveformEntry {
  /** Unique key: filePath + width */
  key: string;
  /** File path */
  filePath: string;
  /** Display width */
  width: number;
  /** Waveform data array */
  data: number[];
  /** Last access timestamp for LRU */
  lastAccessed: number;
  /** Creation timestamp */
  created: number;
  /** Estimated size in bytes */
  size: number;
}

/**
 * Stored spectrogram entry in IndexedDB
 */
interface SpectrogramEntry {
  /** Unique key: filePath + width + height */
  key: string;
  /** File path */
  filePath: string;
  /** Display width */
  width: number;
  /** Display height */
  height: number;
  /** Spectrogram data array */
  data: number[][];
  /** Last access timestamp for LRU */
  lastAccessed: number;
  /** Creation timestamp */
  created: number;
  /** Estimated size in bytes */
  size: number;
}

const DEFAULT_OPTIONS: PersistenceOptions = {
  maxWaveformCount: 500,
  maxSpectrogramCount: 200,
};

const DB_NAME = 'audio-browser-visualization';
const DB_VERSION = 1;
const WAVEFORM_STORE = 'waveforms';
const SPECTROGRAM_STORE = 'spectrograms';

/**
 * IndexedDB persistence service for visualization data
 */
export class VisualizationPersistence {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private options: PersistenceOptions;
  private initPromise: Promise<void> | null = null;

  /**
   * Create a new VisualizationPersistence instance
   * @param dbName - Database name (default: 'audio-browser-visualization')
   * @param options - Configuration options
   */
  constructor(
    dbName: string = DB_NAME,
    options: Partial<PersistenceOptions> = {}
  ) {
    this.dbName = dbName;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize the IndexedDB database
   * @returns Promise that resolves when database is ready
   */
  async initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.openDatabase();
    return this.initPromise;
  }

  /**
   * Open or create the IndexedDB database
   */
  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new Error('IndexedDB is not available'));
        return;
      }

      const request = indexedDB.open(this.dbName, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create waveform store with indexes
        if (!db.objectStoreNames.contains(WAVEFORM_STORE)) {
          const waveformStore = db.createObjectStore(WAVEFORM_STORE, {
            keyPath: 'key',
          });
          waveformStore.createIndex('filePath', 'filePath', { unique: false });
          waveformStore.createIndex('lastAccessed', 'lastAccessed', {
            unique: false,
          });
        }

        // Create spectrogram store with indexes
        if (!db.objectStoreNames.contains(SPECTROGRAM_STORE)) {
          const spectrogramStore = db.createObjectStore(SPECTROGRAM_STORE, {
            keyPath: 'key',
          });
          spectrogramStore.createIndex('filePath', 'filePath', { unique: false });
          spectrogramStore.createIndex('lastAccessed', 'lastAccessed', {
            unique: false,
          });
        }
      };
    });
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Generate waveform cache key
   */
  private getWaveformKey(filePath: string, width: number): string {
    return `waveform:${filePath}:${width}`;
  }

  /**
   * Generate spectrogram cache key
   */
  private getSpectrogramKey(
    filePath: string,
    width: number,
    height: number
  ): string {
    return `spectrogram:${filePath}:${width}:${height}`;
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: number[] | number[][]): number {
    if (Array.isArray(data[0])) {
      // 2D array (spectrogram)
      return (data as number[][]).reduce(
        (sum, row) => sum + row.length * 8,
        0
      );
    }
    // 1D array (waveform)
    return (data as number[]).length * 8;
  }

  // ==================== Waveform Methods ====================

  /**
   * Store waveform data
   * @param filePath - Audio file path
   * @param width - Display width
   * @param data - Waveform data array
   */
  async setWaveform(
    filePath: string,
    width: number,
    data: number[]
  ): Promise<void> {
    const db = await this.ensureDb();
    const key = this.getWaveformKey(filePath, width);
    const now = Date.now();

    const entry: WaveformEntry = {
      key,
      filePath,
      width,
      data,
      lastAccessed: now,
      created: now,
      size: this.estimateSize(data),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(WAVEFORM_STORE, 'readwrite');
      const store = transaction.objectStore(WAVEFORM_STORE);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to store waveform: ${request.error?.message}`));
    });
  }

  /**
   * Get waveform data
   * @param filePath - Audio file path
   * @param width - Display width
   * @returns Waveform data array or null if not found
   */
  async getWaveform(filePath: string, width: number): Promise<number[] | null> {
    const db = await this.ensureDb();
    const key = this.getWaveformKey(filePath, width);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(WAVEFORM_STORE, 'readwrite');
      const store = transaction.objectStore(WAVEFORM_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as WaveformEntry | undefined;
        if (entry) {
          // Update last accessed time
          entry.lastAccessed = Date.now();
          store.put(entry);
          resolve(entry.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () =>
        reject(new Error(`Failed to get waveform: ${request.error?.message}`));
    });
  }

  /**
   * Check if waveform exists in storage
   * @param filePath - Audio file path
   * @param width - Display width
   * @returns True if waveform exists
   */
  async hasWaveform(filePath: string, width: number): Promise<boolean> {
    const db = await this.ensureDb();
    const key = this.getWaveformKey(filePath, width);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(WAVEFORM_STORE, 'readonly');
      const store = transaction.objectStore(WAVEFORM_STORE);
      const request = store.count(IDBKeyRange.only(key));

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () =>
        reject(
          new Error(`Failed to check waveform: ${request.error?.message}`)
        );
    });
  }

  /**
   * Delete waveform data
   * @param filePath - Audio file path
   * @param width - Display width
   */
  async deleteWaveform(filePath: string, width: number): Promise<void> {
    const db = await this.ensureDb();
    const key = this.getWaveformKey(filePath, width);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(WAVEFORM_STORE, 'readwrite');
      const store = transaction.objectStore(WAVEFORM_STORE);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          new Error(`Failed to delete waveform: ${request.error?.message}`)
        );
    });
  }

  // ==================== Spectrogram Methods ====================

  /**
   * Store spectrogram data
   * @param filePath - Audio file path
   * @param width - Display width
   * @param height - Display height
   * @param data - Spectrogram data array
   */
  async setSpectrogram(
    filePath: string,
    width: number,
    height: number,
    data: number[][]
  ): Promise<void> {
    const db = await this.ensureDb();
    const key = this.getSpectrogramKey(filePath, width, height);
    const now = Date.now();

    const entry: SpectrogramEntry = {
      key,
      filePath,
      width,
      height,
      data,
      lastAccessed: now,
      created: now,
      size: this.estimateSize(data),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SPECTROGRAM_STORE, 'readwrite');
      const store = transaction.objectStore(SPECTROGRAM_STORE);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          new Error(`Failed to store spectrogram: ${request.error?.message}`)
        );
    });
  }

  /**
   * Get spectrogram data
   * @param filePath - Audio file path
   * @param width - Display width
   * @param height - Display height
   * @returns Spectrogram data array or null if not found
   */
  async getSpectrogram(
    filePath: string,
    width: number,
    height: number
  ): Promise<number[][] | null> {
    const db = await this.ensureDb();
    const key = this.getSpectrogramKey(filePath, width, height);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SPECTROGRAM_STORE, 'readwrite');
      const store = transaction.objectStore(SPECTROGRAM_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as SpectrogramEntry | undefined;
        if (entry) {
          // Update last accessed time
          entry.lastAccessed = Date.now();
          store.put(entry);
          resolve(entry.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () =>
        reject(
          new Error(`Failed to get spectrogram: ${request.error?.message}`)
        );
    });
  }

  /**
   * Check if spectrogram exists in storage
   * @param filePath - Audio file path
   * @param width - Display width
   * @param height - Display height
   * @returns True if spectrogram exists
   */
  async hasSpectrogram(
    filePath: string,
    width: number,
    height: number
  ): Promise<boolean> {
    const db = await this.ensureDb();
    const key = this.getSpectrogramKey(filePath, width, height);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SPECTROGRAM_STORE, 'readonly');
      const store = transaction.objectStore(SPECTROGRAM_STORE);
      const request = store.count(IDBKeyRange.only(key));

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () =>
        reject(
          new Error(`Failed to check spectrogram: ${request.error?.message}`)
        );
    });
  }

  /**
   * Delete spectrogram data
   * @param filePath - Audio file path
   * @param width - Display width
   * @param height - Display height
   */
  async deleteSpectrogram(
    filePath: string,
    width: number,
    height: number
  ): Promise<void> {
    const db = await this.ensureDb();
    const key = this.getSpectrogramKey(filePath, width, height);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SPECTROGRAM_STORE, 'readwrite');
      const store = transaction.objectStore(SPECTROGRAM_STORE);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          new Error(`Failed to delete spectrogram: ${request.error?.message}`)
        );
    });
  }

  // ==================== Management Methods ====================

  /**
   * Get storage statistics
   * @returns Storage statistics object
   */
  async getStorageStats(): Promise<StorageStats> {
    const db = await this.ensureDb();

    const countStore = (storeName: string): Promise<number> => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    };

    const getTotalSize = (storeName: string): Promise<number> => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result as Array<{ size: number }>;
          const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
          resolve(totalSize);
        };
        request.onerror = () => reject(request.error);
      });
    };

    const [waveformCount, spectrogramCount, waveformSize, spectrogramSize] =
      await Promise.all([
        countStore(WAVEFORM_STORE),
        countStore(SPECTROGRAM_STORE),
        getTotalSize(WAVEFORM_STORE),
        getTotalSize(SPECTROGRAM_STORE),
      ]);

    return {
      waveformCount,
      spectrogramCount,
      totalSize: waveformSize + spectrogramSize,
    };
  }

  /**
   * Cleanup old entries using LRU eviction
   * Removes least recently accessed entries when limits are exceeded
   */
  async cleanup(): Promise<void> {
    const db = await this.ensureDb();

    // Cleanup waveforms
    await this.cleanupStore(
      db,
      WAVEFORM_STORE,
      this.options.maxWaveformCount
    );

    // Cleanup spectrograms
    await this.cleanupStore(
      db,
      SPECTROGRAM_STORE,
      this.options.maxSpectrogramCount
    );
  }

  /**
   * Cleanup a specific store using LRU eviction
   */
  private async cleanupStore(
    db: IDBDatabase,
    storeName: string,
    maxCount: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('lastAccessed');

      // Get all entries sorted by lastAccessed (ascending = oldest first)
      const request = index.getAll();

      request.onsuccess = () => {
        const entries = request.result as Array<{ key: string; lastAccessed: number }>;
        
        // Calculate how many to remove
        const removeCount = entries.length - maxCount;
        
        if (removeCount > 0) {
          // Sort by lastAccessed ascending (oldest first)
          entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
          
          // Delete oldest entries
          for (let i = 0; i < removeCount; i++) {
            store.delete(entries[i].key);
          }
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error(`Cleanup failed: ${transaction.error?.message}`));
    });
  }

  /**
   * Remove all data for a specific file
   * @param filePath - File path to remove
   */
  async removeFile(filePath: string): Promise<void> {
    const db = await this.ensureDb();

    const removeFromStore = (storeName: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const index = store.index('filePath');
        const request = index.getAllKeys(IDBKeyRange.only(filePath));

        request.onsuccess = () => {
          const keys = request.result;
          keys.forEach((key) => store.delete(key));
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    };

    await Promise.all([
      removeFromStore(WAVEFORM_STORE),
      removeFromStore(SPECTROGRAM_STORE),
    ]);
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    const db = await this.ensureDb();

    const clearStore = (storeName: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    };

    await Promise.all([
      clearStore(WAVEFORM_STORE),
      clearStore(SPECTROGRAM_STORE),
    ]);
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const visualizationPersistence = new VisualizationPersistence();
