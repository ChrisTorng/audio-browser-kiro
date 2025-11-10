import { describe, it, expect, beforeEach } from 'vitest';
import { SpectrogramGenerator } from '../../../src/client/services/spectrogramGenerator';

describe('SpectrogramGenerator', () => {
  let generator: SpectrogramGenerator;

  beforeEach(() => {
    generator = new SpectrogramGenerator();
  });

  describe('generateFromAudioBuffer', () => {
    it('should generate spectrogram data from AudioBuffer', () => {
      // Create mock AudioBuffer
      const sampleRate = 44100;
      const duration = 1; // 1 second
      const audioContext = new AudioContext({ sampleRate });
      const audioBuffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      
      // Fill with test data (sine wave)
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }

      const width = 100;
      const height = 64;
      const spectrogram = generator.generateFromAudioBuffer(audioBuffer, width, height);

      expect(spectrogram).toHaveLength(width);
      expect(spectrogram[0]).toHaveLength(height);
      
      // All values should be normalized to 0-1 range
      spectrogram.forEach(timeSlice => {
        timeSlice.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        });
      });
    });

    it('should normalize frequency data to 0-1 range', () => {
      const sampleRate = 44100;
      const audioContext = new AudioContext({ sampleRate });
      const audioBuffer = audioContext.createBuffer(1, 10000, sampleRate);
      
      // Fill with varying amplitudes
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * (i / channelData.length);
      }

      const width = 50;
      const height = 32;
      const spectrogram = generator.generateFromAudioBuffer(audioBuffer, width, height);

      // Find max value across all time slices
      let maxValue = 0;
      spectrogram.forEach(timeSlice => {
        const sliceMax = Math.max(...timeSlice);
        maxValue = Math.max(maxValue, sliceMax);
      });

      // At least one value should be close to 1 (normalized)
      expect(maxValue).toBeGreaterThan(0.9);
    });

    it('should throw error for invalid AudioBuffer', () => {
      expect(() => {
        generator.generateFromAudioBuffer(null as any, 100, 64);
      }).toThrow('Invalid AudioBuffer');
    });

    it('should throw error for invalid dimensions', () => {
      const audioContext = new AudioContext();
      const audioBuffer = audioContext.createBuffer(1, 1000, 44100);

      expect(() => {
        generator.generateFromAudioBuffer(audioBuffer, 0, 64);
      }).toThrow('Invalid dimensions');

      expect(() => {
        generator.generateFromAudioBuffer(audioBuffer, 100, 0);
      }).toThrow('Invalid dimensions');

      expect(() => {
        generator.generateFromAudioBuffer(audioBuffer, -10, 64);
      }).toThrow('Invalid dimensions');
    });

    it('should generate correct dimensions', () => {
      const sampleRate = 44100;
      const audioContext = new AudioContext({ sampleRate });
      const audioBuffer = audioContext.createBuffer(1, 10000, sampleRate);
      
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.random() * 0.5;
      }

      const width = 80;
      const height = 48;
      const spectrogram = generator.generateFromAudioBuffer(audioBuffer, width, height);

      expect(spectrogram).toHaveLength(width);
      spectrogram.forEach(timeSlice => {
        expect(timeSlice).toHaveLength(height);
      });
    });
  });

  describe('generateFromBlob', () => {
    it('should generate spectrogram data from Blob', async () => {
      // Create a simple WAV file blob
      const sampleRate = 44100;
      const duration = 0.1; // 0.1 seconds
      const numSamples = sampleRate * duration;
      
      // Create WAV file buffer
      const wavBuffer = createWavBuffer(numSamples, sampleRate);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });

      const width = 50;
      const height = 32;
      const spectrogram = await generator.generateFromBlob(blob, width, height);

      expect(spectrogram).toHaveLength(width);
      expect(spectrogram[0]).toHaveLength(height);
      
      // All values should be normalized to 0-1 range
      spectrogram.forEach(timeSlice => {
        timeSlice.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        });
      });
    });

    it('should throw error for invalid Blob', async () => {
      await expect(
        generator.generateFromBlob(null as any, 100, 64)
      ).rejects.toThrow('Invalid Blob');

      await expect(
        generator.generateFromBlob(new Blob([]), 100, 64)
      ).rejects.toThrow('Invalid Blob');
    });

    it('should throw error for invalid dimensions', async () => {
      const blob = new Blob([new ArrayBuffer(100)], { type: 'audio/wav' });

      await expect(
        generator.generateFromBlob(blob, 0, 64)
      ).rejects.toThrow('Invalid dimensions');

      await expect(
        generator.generateFromBlob(blob, 100, 0)
      ).rejects.toThrow('Invalid dimensions');
    });
  });

  describe('applyColorMap', () => {
    it('should apply hot color map correctly', () => {
      // Test black (low value)
      const black = generator.applyColorMap(0, 'hot');
      expect(black[0]).toBe(0);
      expect(black[1]).toBe(0);
      expect(black[2]).toBe(0);

      // Test red (mid-low value)
      const red = generator.applyColorMap(0.33, 'hot');
      expect(red[0]).toBeGreaterThan(200);
      expect(red[1]).toBeLessThan(50);

      // Test yellow (mid-high value)
      const yellow = generator.applyColorMap(0.66, 'hot');
      expect(yellow[0]).toBe(255);
      expect(yellow[1]).toBeGreaterThan(200);

      // Test white (high value)
      const white = generator.applyColorMap(1, 'hot');
      expect(white[0]).toBe(255);
      expect(white[1]).toBe(255);
      expect(white[2]).toBeGreaterThan(200);
    });

    it('should apply grayscale color map correctly', () => {
      const black = generator.applyColorMap(0, 'grayscale');
      expect(black[0]).toBe(0);
      expect(black[1]).toBe(0);
      expect(black[2]).toBe(0);

      const gray = generator.applyColorMap(0.5, 'grayscale');
      expect(gray[0]).toBeCloseTo(127, 0);
      expect(gray[1]).toBeCloseTo(127, 0);
      expect(gray[2]).toBeCloseTo(127, 0);

      const white = generator.applyColorMap(1, 'grayscale');
      expect(white[0]).toBe(255);
      expect(white[1]).toBe(255);
      expect(white[2]).toBe(255);
    });

    it('should apply viridis color map correctly', () => {
      const low = generator.applyColorMap(0, 'viridis');
      expect(low[0]).toBeGreaterThan(0);
      expect(low[1]).toBeGreaterThan(0);
      expect(low[2]).toBeGreaterThan(0);

      const high = generator.applyColorMap(1, 'viridis');
      expect(high[0]).toBeGreaterThan(200);
      expect(high[1]).toBeGreaterThan(200);
    });

    it('should clamp values outside 0-1 range', () => {
      const belowZero = generator.applyColorMap(-0.5, 'hot');
      expect(belowZero[0]).toBe(0);
      expect(belowZero[1]).toBe(0);
      expect(belowZero[2]).toBe(0);

      const aboveOne = generator.applyColorMap(1.5, 'hot');
      expect(aboveOne[0]).toBe(255);
      expect(aboveOne[1]).toBe(255);
      expect(aboveOne[2]).toBeGreaterThan(200);
    });

    it('should default to hot color map', () => {
      const defaultMap = generator.applyColorMap(0.5);
      const hotMap = generator.applyColorMap(0.5, 'hot');
      
      expect(defaultMap[0]).toBe(hotMap[0]);
      expect(defaultMap[1]).toBe(hotMap[1]);
      expect(defaultMap[2]).toBe(hotMap[2]);
    });
  });
});

/**
 * Helper function to create a simple WAV file buffer
 */
function createWavBuffer(numSamples: number, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Audio data (sine wave)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Helper function to write string to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
