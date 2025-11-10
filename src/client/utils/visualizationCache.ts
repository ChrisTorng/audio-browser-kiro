import { LRUCache } from './LRUCache';

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
 */
class VisualizationCacheManager {
  private waveformCache: LRUCache<string, CachedWaveform>;
  private spectrogramCache: LRUCache<string, CachedSpectrogram>;
  private audioBufferCache: LRUCache<string, CachedAudioBuffer>;

  constructor() {
    // Initialize caches with appropriate sizes
    this.waveformCache = new LRUCache<string, CachedWaveform>(100);
    this.spectrogramCache = new LRUCache<string, CachedSpectrogram>(50);
    this.audioBufferCache = new LRUCache<string, CachedAudioBuffer>(20);
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
   * Get cached waveform
   */
  getWaveform(filePath: string, width: number): number[] | null {
    const key = this.getWaveformKey(filePath, width);
    const cached = this.waveformCache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * Set waveform in cache
   */
  setWaveform(filePath: string, width: number, data: number[]): void {
    const key = this.getWaveformKey(filePath, width);
    this.waveformCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if waveform is cached
   */
  hasWaveform(filePath: string, width: number): boolean {
    const key = this.getWaveformKey(filePath, width);
    return this.waveformCache.has(key);
  }

  // Spectrogram cache methods

  /**
   * Get cached spectrogram
   */
  getSpectrogram(filePath: string, width: number, height: number): number[][] | null {
    const key = this.getSpectrogramKey(filePath, width, height);
    const cached = this.spectrogramCache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * Set spectrogram in cache
   */
  setSpectrogram(filePath: string, width: number, height: number, data: number[][]): void {
    const key = this.getSpectrogramKey(filePath, width, height);
    this.spectrogramCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if spectrogram is cached
   */
  hasSpectrogram(filePath: string, width: number, height: number): boolean {
    const key = this.getSpectrogramKey(filePath, width, height);
    return this.spectrogramCache.has(key);
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
   * Clear all caches
   */
  clearAll(): void {
    this.waveformCache.clear();
    this.spectrogramCache.clear();
    this.audioBufferCache.clear();
  }

  /**
   * Clear waveform cache
   */
  clearWaveforms(): void {
    this.waveformCache.clear();
  }

  /**
   * Clear spectrogram cache
   */
  clearSpectrograms(): void {
    this.spectrogramCache.clear();
  }

  /**
   * Clear audio buffer cache
   */
  clearAudioBuffers(): void {
    this.audioBufferCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      waveforms: this.waveformCache.getStats(),
      spectrograms: this.spectrogramCache.getStats(),
      audioBuffers: this.audioBufferCache.getStats(),
    };
  }

  /**
   * Remove all cached data for a specific file
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
  }
}

// Export singleton instance
export const visualizationCache = new VisualizationCacheManager();
