import { LRUCache } from './LRUCache';
import { visualizationPersistence } from './visualizationPersistence';

/**
 * Cached waveform data
 */
export interface CachedWaveform {
  data: number[];
  timestamp: number;
}

/**
 * Cached spectrogram data
 */
export interface CachedSpectrogram {
  data: number[][];
  timestamp: number;
}

/**
 * Cached audio buffer
 */
export interface CachedAudioBuffer {
  buffer: AudioBuffer;
  timestamp: number;
}

/**
 * Visualization cache manager
 * Centralized cache for waveforms, spectrograms, and audio buffers
 * Integrates with IndexedDB for persistent storage across page reloads
 */
class VisualizationCacheManager {
  private waveformCache: LRUCache<string, CachedWaveform>;
  private spectrogramCache: LRUCache<string, CachedSpectrogram>;
  private audioBufferCache: LRUCache<string, CachedAudioBuffer>;
  private persistenceInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize caches with appropriate sizes
    this.waveformCache = new LRUCache<string, CachedWaveform>(100);
    this.spectrogramCache = new LRUCache<string, CachedSpectrogram>(50);
    this.audioBufferCache = new LRUCache<string, CachedAudioBuffer>(20);
  }

  /**
   * Initialize persistent storage (IndexedDB)
   * Should be called before using cache to enable persistence
   */
  async initializePersistence(): Promise<void> {
    if (this.persistenceInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        await visualizationPersistence.initialize();
        this.persistenceInitialized = true;
        // Run cleanup on initialization to ensure storage limits are respected
        await visualizationPersistence.cleanup();
      } catch (error) {
        console.warn('Failed to initialize persistence, using memory-only cache:', error);
        this.persistenceInitialized = false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Generate cache key for waveform
   */
  private getWaveformKey(filePath: string, width: number): string {
    return `waveform:${filePath}:${width}`;
  }

  /**
   * Generate cache key for spectrogram
   */
  private getSpectrogramKey(filePath: string, width: number, height: number): string {
    return `spectrogram:${filePath}:${width}:${height}`;
  }

  /**
   * Generate cache key for audio buffer
   */
  private getAudioBufferKey(filePath: string): string {
    return `buffer:${filePath}`;
  }

  // Waveform cache methods

  /**
   * Get cached waveform from memory cache
   */
  getWaveform(filePath: string, width: number): number[] | null {
    const key = this.getWaveformKey(filePath, width);
    const cached = this.waveformCache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * Load waveform from persistent storage (IndexedDB)
   * Use this when memory cache doesn't have the data
   * @param filePath - Audio file path
   * @param width - Display width
   * @returns Waveform data or null if not found
   */
  async loadWaveformFromPersistence(filePath: string, width: number): Promise<number[] | null> {
    if (!this.persistenceInitialized) {
      await this.initializePersistence();
    }

    if (!this.persistenceInitialized) {
      return null;
    }

    try {
      const data = await visualizationPersistence.getWaveform(filePath, width);
      if (data) {
        // Also store in memory cache for faster subsequent access
        const key = this.getWaveformKey(filePath, width);
        this.waveformCache.set(key, {
          data,
          timestamp: Date.now(),
        });
      }
      return data;
    } catch (error) {
      console.warn('Failed to load waveform from persistence:', error);
      return null;
    }
  }

  /**
   * Set waveform in cache and persist to IndexedDB
   */
  setWaveform(filePath: string, width: number, data: number[]): void {
    const key = this.getWaveformKey(filePath, width);
    this.waveformCache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Persist to IndexedDB asynchronously
    if (this.persistenceInitialized) {
      visualizationPersistence.setWaveform(filePath, width, data).catch((error) => {
        console.warn('Failed to persist waveform:', error);
      });
    }
  }

  /**
   * Check if waveform is cached in memory
   */
  hasWaveform(filePath: string, width: number): boolean {
    const key = this.getWaveformKey(filePath, width);
    return this.waveformCache.has(key);
  }

  /**
   * Check if waveform exists in persistent storage
   * @param filePath - Audio file path
   * @param width - Display width
   * @returns True if waveform exists in IndexedDB
   */
  async hasWaveformInPersistence(filePath: string, width: number): Promise<boolean> {
    if (!this.persistenceInitialized) {
      await this.initializePersistence();
    }

    if (!this.persistenceInitialized) {
      return false;
    }

    try {
      return await visualizationPersistence.hasWaveform(filePath, width);
    } catch (error) {
      console.warn('Failed to check waveform in persistence:', error);
      return false;
    }
  }

  // Spectrogram cache methods

  /**
   * Get cached spectrogram from memory cache
   */
  getSpectrogram(filePath: string, width: number, height: number): number[][] | null {
    const key = this.getSpectrogramKey(filePath, width, height);
    const cached = this.spectrogramCache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * Load spectrogram from persistent storage (IndexedDB)
   * Use this when memory cache doesn't have the data
   * @param filePath - Audio file path
   * @param width - Display width
   * @param height - Display height
   * @returns Spectrogram data or null if not found
   */
  async loadSpectrogramFromPersistence(filePath: string, width: number, height: number): Promise<number[][] | null> {
    if (!this.persistenceInitialized) {
      await this.initializePersistence();
    }

    if (!this.persistenceInitialized) {
      return null;
    }

    try {
      const data = await visualizationPersistence.getSpectrogram(filePath, width, height);
      if (data) {
        // Also store in memory cache for faster subsequent access
        const key = this.getSpectrogramKey(filePath, width, height);
        this.spectrogramCache.set(key, {
          data,
          timestamp: Date.now(),
        });
      }
      return data;
    } catch (error) {
      console.warn('Failed to load spectrogram from persistence:', error);
      return null;
    }
  }

  /**
   * Set spectrogram in cache and persist to IndexedDB
   */
  setSpectrogram(filePath: string, width: number, height: number, data: number[][]): void {
    const key = this.getSpectrogramKey(filePath, width, height);
    this.spectrogramCache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Persist to IndexedDB asynchronously
    if (this.persistenceInitialized) {
      visualizationPersistence.setSpectrogram(filePath, width, height, data).catch((error) => {
        console.warn('Failed to persist spectrogram:', error);
      });
    }
  }

  /**
   * Check if spectrogram is cached in memory
   */
  hasSpectrogram(filePath: string, width: number, height: number): boolean {
    const key = this.getSpectrogramKey(filePath, width, height);
    return this.spectrogramCache.has(key);
  }

  /**
   * Check if spectrogram exists in persistent storage
   * @param filePath - Audio file path
   * @param width - Display width
   * @param height - Display height
   * @returns True if spectrogram exists in IndexedDB
   */
  async hasSpectrogramInPersistence(filePath: string, width: number, height: number): Promise<boolean> {
    if (!this.persistenceInitialized) {
      await this.initializePersistence();
    }

    if (!this.persistenceInitialized) {
      return false;
    }

    try {
      return await visualizationPersistence.hasSpectrogram(filePath, width, height);
    } catch (error) {
      console.warn('Failed to check spectrogram in persistence:', error);
      return false;
    }
  }

  // Audio buffer cache methods

  /**
   * Get cached audio buffer
   */
  getAudioBuffer(filePath: string): AudioBuffer | null {
    const key = this.getAudioBufferKey(filePath);
    const cached = this.audioBufferCache.get(key);
    return cached ? cached.buffer : null;
  }

  /**
   * Set audio buffer in cache
   */
  setAudioBuffer(filePath: string, buffer: AudioBuffer): void {
    const key = this.getAudioBufferKey(filePath);
    this.audioBufferCache.set(key, {
      buffer,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if audio buffer is cached
   */
  hasAudioBuffer(filePath: string): boolean {
    const key = this.getAudioBufferKey(filePath);
    return this.audioBufferCache.has(key);
  }

  // Cache management methods

  /**
   * Clear all caches (memory and persistent)
   */
  clearAll(): void {
    this.waveformCache.clear();
    this.spectrogramCache.clear();
    this.audioBufferCache.clear();

    // Clear persistent storage asynchronously
    if (this.persistenceInitialized) {
      visualizationPersistence.clear().catch((error) => {
        console.warn('Failed to clear persistent storage:', error);
      });
    }
  }

  /**
   * Clear waveform cache (memory and persistent)
   */
  clearWaveforms(): void {
    this.waveformCache.clear();
  }

  /**
   * Clear spectrogram cache (memory only)
   */
  clearSpectrograms(): void {
    this.spectrogramCache.clear();
  }

  /**
   * Clear audio buffer cache (memory only)
   */
  clearAudioBuffers(): void {
    this.audioBufferCache.clear();
  }

  /**
   * Get cache statistics (memory cache)
   */
  getStats() {
    return {
      waveforms: this.waveformCache.getStats(),
      spectrograms: this.spectrogramCache.getStats(),
      audioBuffers: this.audioBufferCache.getStats(),
    };
  }

  /**
   * Get persistent storage statistics
   * @returns Storage statistics from IndexedDB
   */
  async getPersistenceStats() {
    if (!this.persistenceInitialized) {
      await this.initializePersistence();
    }

    if (!this.persistenceInitialized) {
      return {
        waveformCount: 0,
        spectrogramCount: 0,
        totalSize: 0,
      };
    }

    try {
      return await visualizationPersistence.getStorageStats();
    } catch (error) {
      console.warn('Failed to get persistence stats:', error);
      return {
        waveformCount: 0,
        spectrogramCount: 0,
        totalSize: 0,
      };
    }
  }

  /**
   * Remove all cached data for a specific file (memory and persistent)
   */
  removeFile(filePath: string): void {
    // Remove audio buffer
    const bufferKey = this.getAudioBufferKey(filePath);
    this.audioBufferCache.delete(bufferKey);

    // Remove all waveforms for this file
    const waveformKeys = this.waveformCache.keys();
    waveformKeys.forEach(key => {
      if (key.startsWith(`waveform:${filePath}:`)) {
        this.waveformCache.delete(key);
      }
    });

    // Remove all spectrograms for this file
    const spectrogramKeys = this.spectrogramCache.keys();
    spectrogramKeys.forEach(key => {
      if (key.startsWith(`spectrogram:${filePath}:`)) {
        this.spectrogramCache.delete(key);
      }
    });

    // Remove from persistent storage asynchronously
    if (this.persistenceInitialized) {
      visualizationPersistence.removeFile(filePath).catch((error) => {
        console.warn('Failed to remove file from persistent storage:', error);
      });
    }
  }

  /**
   * Run cleanup on persistent storage to evict old entries
   */
  async runPersistenceCleanup(): Promise<void> {
    if (!this.persistenceInitialized) {
      await this.initializePersistence();
    }

    if (!this.persistenceInitialized) {
      return;
    }

    try {
      await visualizationPersistence.cleanup();
    } catch (error) {
      console.warn('Failed to run persistence cleanup:', error);
    }
  }
}

// Export singleton instance
export const visualizationCache = new VisualizationCacheManager();
