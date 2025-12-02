import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { visualizationPersistence, VisualizationPersistence } from '../../../src/client/utils/visualizationPersistence';

/**
 * Tests for VisualizationPersistence - IndexedDB storage service
 * for persisting waveform and spectrogram data across page reloads
 */
describe('VisualizationPersistence', { timeout: 10000 }, () => {
  let persistence: VisualizationPersistence;

  beforeEach(async () => {
    // Create a new instance for each test with a unique database name
    persistence = new VisualizationPersistence(`test-db-${Date.now()}`);
    await persistence.initialize();
  });

  afterEach(async () => {
    // Clean up database after each test
    if (persistence) {
      await persistence.clear();
      await persistence.close();
    }
  });

  describe('Waveform Storage', () => {
    it('should store and retrieve waveform data', async () => {
      const filePath = '/test/audio.mp3';
      const width = 1000;
      const waveformData = [0.1, 0.3, 0.5, 0.7, 0.9, 0.6, 0.4, 0.2];

      await persistence.setWaveform(filePath, width, waveformData);
      const retrieved = await persistence.getWaveform(filePath, width);

      expect(retrieved).toEqual(waveformData);
    });

    it('should return null for non-existent waveform', async () => {
      const result = await persistence.getWaveform('/nonexistent.mp3', 1000);
      expect(result).toBeNull();
    });

    it('should overwrite existing waveform data', async () => {
      const filePath = '/test/audio.mp3';
      const width = 1000;
      const originalData = [0.1, 0.2, 0.3];
      const newData = [0.4, 0.5, 0.6, 0.7];

      await persistence.setWaveform(filePath, width, originalData);
      await persistence.setWaveform(filePath, width, newData);
      const retrieved = await persistence.getWaveform(filePath, width);

      expect(retrieved).toEqual(newData);
    });

    it('should store waveforms with different widths separately', async () => {
      const filePath = '/test/audio.mp3';
      const data1000 = [0.1, 0.2];
      const data500 = [0.3, 0.4, 0.5];

      await persistence.setWaveform(filePath, 1000, data1000);
      await persistence.setWaveform(filePath, 500, data500);

      expect(await persistence.getWaveform(filePath, 1000)).toEqual(data1000);
      expect(await persistence.getWaveform(filePath, 500)).toEqual(data500);
    });

    it('should check if waveform exists', async () => {
      const filePath = '/test/audio.mp3';
      const width = 1000;

      expect(await persistence.hasWaveform(filePath, width)).toBe(false);

      await persistence.setWaveform(filePath, width, [0.1, 0.2]);

      expect(await persistence.hasWaveform(filePath, width)).toBe(true);
    });

    it('should delete waveform data', async () => {
      const filePath = '/test/audio.mp3';
      const width = 1000;
      const data = [0.1, 0.2, 0.3];

      await persistence.setWaveform(filePath, width, data);
      expect(await persistence.hasWaveform(filePath, width)).toBe(true);

      await persistence.deleteWaveform(filePath, width);
      expect(await persistence.hasWaveform(filePath, width)).toBe(false);
    });
  });

  describe('Spectrogram Storage', () => {
    it('should store and retrieve spectrogram data', async () => {
      const filePath = '/test/audio.mp3';
      const width = 200;
      const height = 128;
      const spectrogramData = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ];

      await persistence.setSpectrogram(filePath, width, height, spectrogramData);
      const retrieved = await persistence.getSpectrogram(filePath, width, height);

      expect(retrieved).toEqual(spectrogramData);
    });

    it('should return null for non-existent spectrogram', async () => {
      const result = await persistence.getSpectrogram('/nonexistent.mp3', 200, 128);
      expect(result).toBeNull();
    });

    it('should overwrite existing spectrogram data', async () => {
      const filePath = '/test/audio.mp3';
      const width = 200;
      const height = 128;
      const originalData = [[0.1, 0.2]];
      const newData = [[0.3, 0.4], [0.5, 0.6]];

      await persistence.setSpectrogram(filePath, width, height, originalData);
      await persistence.setSpectrogram(filePath, width, height, newData);
      const retrieved = await persistence.getSpectrogram(filePath, width, height);

      expect(retrieved).toEqual(newData);
    });

    it('should store spectrograms with different dimensions separately', async () => {
      const filePath = '/test/audio.mp3';
      const data200x128 = [[0.1], [0.2]];
      const data100x64 = [[0.3, 0.4, 0.5]];

      await persistence.setSpectrogram(filePath, 200, 128, data200x128);
      await persistence.setSpectrogram(filePath, 100, 64, data100x64);

      expect(await persistence.getSpectrogram(filePath, 200, 128)).toEqual(data200x128);
      expect(await persistence.getSpectrogram(filePath, 100, 64)).toEqual(data100x64);
    });

    it('should check if spectrogram exists', async () => {
      const filePath = '/test/audio.mp3';
      const width = 200;
      const height = 128;

      expect(await persistence.hasSpectrogram(filePath, width, height)).toBe(false);

      await persistence.setSpectrogram(filePath, width, height, [[0.1]]);

      expect(await persistence.hasSpectrogram(filePath, width, height)).toBe(true);
    });

    it('should delete spectrogram data', async () => {
      const filePath = '/test/audio.mp3';
      const width = 200;
      const height = 128;
      const data = [[0.1, 0.2]];

      await persistence.setSpectrogram(filePath, width, height, data);
      expect(await persistence.hasSpectrogram(filePath, width, height)).toBe(true);

      await persistence.deleteSpectrogram(filePath, width, height);
      expect(await persistence.hasSpectrogram(filePath, width, height)).toBe(false);
    });
  });

  describe('LRU Eviction', () => {
    it('should track last access time when getting data', async () => {
      const filePath = '/test/audio.mp3';
      const width = 1000;
      const data = [0.1, 0.2, 0.3];

      await persistence.setWaveform(filePath, width, data);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Access the waveform
      await persistence.getWaveform(filePath, width);
      
      const stats = await persistence.getStorageStats();
      expect(stats.waveformCount).toBe(1);
    });

    it('should evict least recently used items when storage limit is exceeded', async () => {
      // Create a persistence instance with a small max size for testing
      const smallPersistence = new VisualizationPersistence(
        `test-small-db-${Date.now()}`,
        { maxWaveformCount: 3, maxSpectrogramCount: 3 }
      );
      await smallPersistence.initialize();

      try {
        // Add 4 waveforms to trigger eviction
        await smallPersistence.setWaveform('/file1.mp3', 1000, [0.1]);
        await new Promise(resolve => setTimeout(resolve, 10));
        
        await smallPersistence.setWaveform('/file2.mp3', 1000, [0.2]);
        await new Promise(resolve => setTimeout(resolve, 10));
        
        await smallPersistence.setWaveform('/file3.mp3', 1000, [0.3]);
        await new Promise(resolve => setTimeout(resolve, 10));

        // Access file1 to make it recently used
        await smallPersistence.getWaveform('/file1.mp3', 1000);
        await new Promise(resolve => setTimeout(resolve, 10));

        // Add file4, should evict file2 (least recently used)
        await smallPersistence.setWaveform('/file4.mp3', 1000, [0.4]);

        // Run cleanup to trigger eviction
        await smallPersistence.cleanup();

        // file1 should still exist (was accessed recently)
        expect(await smallPersistence.hasWaveform('/file1.mp3', 1000)).toBe(true);
        // file2 should be evicted (least recently used)
        expect(await smallPersistence.hasWaveform('/file2.mp3', 1000)).toBe(false);
        // file3 and file4 should exist
        expect(await smallPersistence.hasWaveform('/file3.mp3', 1000)).toBe(true);
        expect(await smallPersistence.hasWaveform('/file4.mp3', 1000)).toBe(true);
      } finally {
        await smallPersistence.clear();
        await smallPersistence.close();
      }
    });

    it('should evict spectrogram data using LRU strategy', async () => {
      const smallPersistence = new VisualizationPersistence(
        `test-small-spec-db-${Date.now()}`,
        { maxWaveformCount: 10, maxSpectrogramCount: 2 }
      );
      await smallPersistence.initialize();

      try {
        await smallPersistence.setSpectrogram('/file1.mp3', 200, 128, [[0.1]]);
        await new Promise(resolve => setTimeout(resolve, 10));
        
        await smallPersistence.setSpectrogram('/file2.mp3', 200, 128, [[0.2]]);
        await new Promise(resolve => setTimeout(resolve, 10));

        // Add file3, should trigger eviction of file1
        await smallPersistence.setSpectrogram('/file3.mp3', 200, 128, [[0.3]]);
        await smallPersistence.cleanup();

        expect(await smallPersistence.hasSpectrogram('/file1.mp3', 200, 128)).toBe(false);
        expect(await smallPersistence.hasSpectrogram('/file2.mp3', 200, 128)).toBe(true);
        expect(await smallPersistence.hasSpectrogram('/file3.mp3', 200, 128)).toBe(true);
      } finally {
        await smallPersistence.clear();
        await smallPersistence.close();
      }
    });
  });

  describe('Storage Statistics', () => {
    it('should return correct storage statistics', async () => {
      await persistence.setWaveform('/file1.mp3', 1000, [0.1, 0.2, 0.3]);
      await persistence.setWaveform('/file2.mp3', 500, [0.4, 0.5]);
      await persistence.setSpectrogram('/file1.mp3', 200, 128, [[0.1], [0.2]]);

      const stats = await persistence.getStorageStats();

      expect(stats.waveformCount).toBe(2);
      expect(stats.spectrogramCount).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should return zero counts for empty database', async () => {
      const stats = await persistence.getStorageStats();

      expect(stats.waveformCount).toBe(0);
      expect(stats.spectrogramCount).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });

  describe('File Removal', () => {
    it('should remove all data for a specific file', async () => {
      const filePath = '/test/audio.mp3';

      // Store multiple items for the same file
      await persistence.setWaveform(filePath, 1000, [0.1]);
      await persistence.setWaveform(filePath, 500, [0.2]);
      await persistence.setSpectrogram(filePath, 200, 128, [[0.1]]);
      await persistence.setSpectrogram(filePath, 100, 64, [[0.2]]);

      // Store data for another file
      await persistence.setWaveform('/other.mp3', 1000, [0.3]);

      // Remove all data for the test file
      await persistence.removeFile(filePath);

      // Verify test file data is removed
      expect(await persistence.hasWaveform(filePath, 1000)).toBe(false);
      expect(await persistence.hasWaveform(filePath, 500)).toBe(false);
      expect(await persistence.hasSpectrogram(filePath, 200, 128)).toBe(false);
      expect(await persistence.hasSpectrogram(filePath, 100, 64)).toBe(false);

      // Verify other file data is preserved
      expect(await persistence.hasWaveform('/other.mp3', 1000)).toBe(true);
    });
  });

  describe('Clear All Data', () => {
    it('should clear all stored data', async () => {
      await persistence.setWaveform('/file1.mp3', 1000, [0.1]);
      await persistence.setWaveform('/file2.mp3', 1000, [0.2]);
      await persistence.setSpectrogram('/file1.mp3', 200, 128, [[0.1]]);

      await persistence.clear();

      const stats = await persistence.getStorageStats();
      expect(stats.waveformCount).toBe(0);
      expect(stats.spectrogramCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock IndexedDB to simulate error
      const originalIndexedDB = globalThis.indexedDB;
      
      try {
        // Create a mock that throws
        Object.defineProperty(globalThis, 'indexedDB', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        const errorPersistence = new VisualizationPersistence(`error-test-${Date.now()}`);
        
        // Should not throw, but should handle gracefully
        await expect(errorPersistence.initialize()).rejects.toThrow();
      } finally {
        Object.defineProperty(globalThis, 'indexedDB', {
          value: originalIndexedDB,
          writable: true,
          configurable: true,
        });
      }
    });
  });
});

describe('visualizationPersistence singleton', () => {
  it('should export a singleton instance', () => {
    expect(visualizationPersistence).toBeDefined();
    expect(visualizationPersistence).toBeInstanceOf(VisualizationPersistence);
  });
});
