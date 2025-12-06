/**
 * VisualizationService Tests
 * Tests for waveform and spectrogram generation using ffmpeg
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { VisualizationService } from '../../../src/server/services/visualizationService.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

describe('VisualizationService', () => {
  let service: VisualizationService;
  const testAudioRoot = process.env.AUDIO_ROOT_PATH || path.join(process.cwd(), 'tests', 'audio');
  const testAudioFile = 'Echo/Samples/Noise1.wav';
  const testAudioPath = path.join(testAudioRoot, testAudioFile);
  const cacheDir = path.join(process.cwd(), 'cache');

  beforeAll(async () => {
    // Ensure test audio file exists
    if (!existsSync(testAudioPath)) {
      throw new Error(`Test audio file not found: ${testAudioPath}`);
    }
  });

  beforeEach(() => {
    service = new VisualizationService(cacheDir);
  });

  afterEach(async () => {
    // Clean up generated cache files for test
    const waveformCache = path.join(cacheDir, 'waveforms', testAudioFile.replace(/\//g, '_') + '.png');
    const spectrogramCache = path.join(cacheDir, 'spectrograms', testAudioFile.replace(/\//g, '_') + '.png');
    
    try {
      if (existsSync(waveformCache)) {
        await fs.unlink(waveformCache);
      }
      if (existsSync(spectrogramCache)) {
        await fs.unlink(spectrogramCache);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('generateWaveform', () => {
    it('should generate waveform image using ffmpeg', async () => {
      const result = await service.generateWaveform(testAudioPath, testAudioFile);

      expect(result).toBeDefined();
      expect(result.imagePath).toBeDefined();
      expect(result.cached).toBe(false);
      expect(existsSync(result.imagePath)).toBe(true);

      // Verify PNG file signature
      const buffer = await fs.readFile(result.imagePath);
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    }, 10000);

    it('should return cached waveform on second call', async () => {
      // First call - generates
      const result1 = await service.generateWaveform(testAudioPath, testAudioFile);
      expect(result1.cached).toBe(false);

      // Second call - uses cache
      const result2 = await service.generateWaveform(testAudioPath, testAudioFile);
      expect(result2.cached).toBe(true);
      expect(result2.imagePath).toBe(result1.imagePath);
    }, 10000);

    it('should throw error for non-existent audio file', async () => {
      const nonExistentPath = path.join(testAudioRoot, 'nonexistent.wav');
      const nonExistentRelative = 'nonexistent.wav';

      await expect(
        service.generateWaveform(nonExistentPath, nonExistentRelative)
      ).rejects.toThrow();
    }, 10000);

    it('should create error placeholder on generation failure', async () => {
      // Use a corrupted or invalid audio file path that exists but can't be processed
      // For this test, we'll use a text file pretending to be audio
      const invalidAudioPath = path.join(testAudioRoot, 'invalid.wav');
      const invalidRelative = 'invalid.wav';
      
      // Create a dummy invalid file
      await fs.writeFile(invalidAudioPath, 'not a valid audio file');
      
      try {
        const result = await service.generateWaveform(invalidAudioPath, invalidRelative);
        
        // Should still return a result (error placeholder)
        expect(result).toBeDefined();
        expect(result.imagePath).toBeDefined();
        expect(existsSync(result.imagePath)).toBe(true);
        
        // Verify it's a valid PNG (the error placeholder)
        const buffer = await fs.readFile(result.imagePath);
        expect(buffer[0]).toBe(0x89);
        expect(buffer[1]).toBe(0x50);
        expect(buffer[2]).toBe(0x4e);
        expect(buffer[3]).toBe(0x47);
        
        // Clean up
        await fs.unlink(invalidAudioPath);
        const cachePath = service.getCachedPath(invalidRelative, 'waveform');
        if (existsSync(cachePath)) {
          await fs.unlink(cachePath);
        }
      } catch (error) {
        // Clean up even on failure
        try {
          await fs.unlink(invalidAudioPath);
        } catch {
          // Ignore
        }
        throw error;
      }
    }, 10000);
  });

  describe('generateSpectrogram', () => {
    it('should generate spectrogram image using ffmpeg', async () => {
      const result = await service.generateSpectrogram(testAudioPath, testAudioFile);

      expect(result).toBeDefined();
      expect(result.imagePath).toBeDefined();
      expect(result.cached).toBe(false);
      expect(existsSync(result.imagePath)).toBe(true);

      // Verify PNG file signature
      const buffer = await fs.readFile(result.imagePath);
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    }, 10000);

    it('should return cached spectrogram on second call', async () => {
      // First call - generates
      const result1 = await service.generateSpectrogram(testAudioPath, testAudioFile);
      expect(result1.cached).toBe(false);

      // Second call - uses cache
      const result2 = await service.generateSpectrogram(testAudioPath, testAudioFile);
      expect(result2.cached).toBe(true);
      expect(result2.imagePath).toBe(result1.imagePath);
    }, 10000);

    it('should throw error for non-existent audio file', async () => {
      const nonExistentPath = path.join(testAudioRoot, 'nonexistent.wav');
      const nonExistentRelative = 'nonexistent.wav';

      await expect(
        service.generateSpectrogram(nonExistentPath, nonExistentRelative)
      ).rejects.toThrow();
    }, 10000);

    it('should create error placeholder on generation failure', async () => {
      // Use a corrupted or invalid audio file path that exists but can't be processed
      const invalidAudioPath = path.join(testAudioRoot, 'invalid-spec.wav');
      const invalidRelative = 'invalid-spec.wav';
      
      // Create a dummy invalid file
      await fs.writeFile(invalidAudioPath, 'not a valid audio file');
      
      try {
        const result = await service.generateSpectrogram(invalidAudioPath, invalidRelative);
        
        // Should still return a result (error placeholder)
        expect(result).toBeDefined();
        expect(result.imagePath).toBeDefined();
        expect(existsSync(result.imagePath)).toBe(true);
        
        // Verify it's a valid PNG (the error placeholder)
        const buffer = await fs.readFile(result.imagePath);
        expect(buffer[0]).toBe(0x89);
        expect(buffer[1]).toBe(0x50);
        expect(buffer[2]).toBe(0x4e);
        expect(buffer[3]).toBe(0x47);
        
        // Clean up
        await fs.unlink(invalidAudioPath);
        const cachePath = service.getCachedPath(invalidRelative, 'spectrogram');
        if (existsSync(cachePath)) {
          await fs.unlink(cachePath);
        }
      } catch (error) {
        // Clean up even on failure
        try {
          await fs.unlink(invalidAudioPath);
        } catch {
          // Ignore
        }
        throw error;
      }
    }, 10000);
  });

  describe('getCachedPath', () => {
    it('should return correct cache path for waveform', () => {
      const cachePath = service.getCachedPath(testAudioFile, 'waveform');
      expect(cachePath).toContain('cache');
      expect(cachePath).toContain('waveforms');
      expect(cachePath).toContain('.png');
    });

    it('should return correct cache path for spectrogram', () => {
      const cachePath = service.getCachedPath(testAudioFile, 'spectrogram');
      expect(cachePath).toContain('cache');
      expect(cachePath).toContain('spectrograms');
      expect(cachePath).toContain('.png');
    });
  });

  describe('clearCache', () => {
    it('should clear waveform cache for specific file', async () => {
      // Generate waveform first
      await service.generateWaveform(testAudioPath, testAudioFile);
      
      // Clear cache
      await service.clearCache(testAudioFile, 'waveform');
      
      // Verify cache is cleared
      const cachePath = service.getCachedPath(testAudioFile, 'waveform');
      expect(existsSync(cachePath)).toBe(false);
    }, 10000);

    it('should clear spectrogram cache for specific file', async () => {
      // Generate spectrogram first
      await service.generateSpectrogram(testAudioPath, testAudioFile);
      
      // Clear cache
      await service.clearCache(testAudioFile, 'spectrogram');
      
      // Verify cache is cleared
      const cachePath = service.getCachedPath(testAudioFile, 'spectrogram');
      expect(existsSync(cachePath)).toBe(false);
    }, 10000);

    it('should clear both caches for specific file', async () => {
      // Generate both
      await service.generateWaveform(testAudioPath, testAudioFile);
      await service.generateSpectrogram(testAudioPath, testAudioFile);
      
      // Clear both
      await service.clearCache(testAudioFile, 'both');
      
      // Verify both are cleared
      const waveformPath = service.getCachedPath(testAudioFile, 'waveform');
      const spectrogramPath = service.getCachedPath(testAudioFile, 'spectrogram');
      expect(existsSync(waveformPath)).toBe(false);
      expect(existsSync(spectrogramPath)).toBe(false);
    }, 10000);
  });
});
