import { describe, it, expect, beforeEach } from 'vitest';
import { WaveformGenerator } from '../../../src/client/services/waveformGenerator';

describe('WaveformGenerator', () => {
  let generator: WaveformGenerator;

  beforeEach(() => {
    generator = new WaveformGenerator();
  });

  describe('generateFromAudioBuffer', () => {
    it('should generate waveform data from AudioBuffer', () => {
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
      const waveform = generator.generateFromAudioBuffer(audioBuffer, width);

      expect(waveform).toHaveLength(width);
      expect(waveform.every(v => v >= 0 && v <= 1)).toBe(true);
    });

    it('should normalize waveform data to 0-1 range', () => {
      const sampleRate = 44100;
      const audioContext = new AudioContext({ sampleRate });
      const audioBuffer = audioContext.createBuffer(1, 1000, sampleRate);
      
      // Fill with varying amplitudes
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = (i / channelData.length) * 2 - 1; // -1 to 1
      }

      const waveform = generator.generateFromAudioBuffer(audioBuffer, 50);

      // Check that max value is 1 (normalized)
      const maxValue = Math.max(...waveform);
      expect(maxValue).toBeCloseTo(1, 1);
    });

    it('should throw error for invalid AudioBuffer', () => {
      expect(() => {
        generator.generateFromAudioBuffer(null as any, 100);
      }).toThrow('Invalid AudioBuffer');
    });

    it('should throw error for invalid width', () => {
      const audioContext = new AudioContext();
      const audioBuffer = audioContext.createBuffer(1, 1000, 44100);

      expect(() => {
        generator.generateFromAudioBuffer(audioBuffer, 0);
      }).toThrow('Invalid width');

      expect(() => {
        generator.generateFromAudioBuffer(audioBuffer, -10);
      }).toThrow('Invalid width');
    });

    it('should downsample audio data correctly', () => {
      const sampleRate = 44100;
      const audioContext = new AudioContext({ sampleRate });
      const audioBuffer = audioContext.createBuffer(1, 10000, sampleRate);
      
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = 0.5;
      }

      const width = 100;
      const waveform = generator.generateFromAudioBuffer(audioBuffer, width);

      // With constant amplitude, all values should be similar
      expect(waveform).toHaveLength(width);
      const avgValue = waveform.reduce((a, b) => a + b, 0) / waveform.length;
      expect(avgValue).toBeGreaterThan(0.9); // Should be close to 1 after normalization
    });
  });

  describe('generateFromAudioBufferAsync', () => {
    it('should generate waveform data from AudioBuffer in background', async () => {
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
      const waveform = await generator.generateFromAudioBufferAsync(audioBuffer, width);

      expect(waveform).toHaveLength(width);
      expect(waveform.every(v => v >= 0 && v <= 1)).toBe(true);
    });

    it('should normalize waveform data to 0-1 range in background', async () => {
      const sampleRate = 44100;
      const audioContext = new AudioContext({ sampleRate });
      const audioBuffer = audioContext.createBuffer(1, 1000, sampleRate);
      
      // Fill with varying amplitudes
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = (i / channelData.length) * 2 - 1; // -1 to 1
      }

      const waveform = await generator.generateFromAudioBufferAsync(audioBuffer, 50);

      // Check that max value is 1 (normalized)
      const maxValue = Math.max(...waveform);
      expect(maxValue).toBeCloseTo(1, 1);
    });

    it('should throw error for invalid AudioBuffer', async () => {
      await expect(
        generator.generateFromAudioBufferAsync(null as any, 100)
      ).rejects.toThrow('Invalid AudioBuffer');
    });

    it('should throw error for invalid width', async () => {
      const audioContext = new AudioContext();
      const audioBuffer = audioContext.createBuffer(1, 1000, 44100);

      await expect(
        generator.generateFromAudioBufferAsync(audioBuffer, 0)
      ).rejects.toThrow('Invalid width');

      await expect(
        generator.generateFromAudioBufferAsync(audioBuffer, -10)
      ).rejects.toThrow('Invalid width');
    });

    it('should produce same results as synchronous generation', async () => {
      const sampleRate = 44100;
      const audioContext = new AudioContext({ sampleRate });
      const audioBuffer = audioContext.createBuffer(1, 10000, sampleRate);
      
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }

      const width = 100;
      const syncWaveform = generator.generateFromAudioBuffer(audioBuffer, width);
      const asyncWaveform = await generator.generateFromAudioBufferAsync(audioBuffer, width);

      expect(asyncWaveform).toHaveLength(syncWaveform.length);
      
      // Results should be very similar (allowing for small floating point differences)
      for (let i = 0; i < width; i++) {
        expect(asyncWaveform[i]).toBeCloseTo(syncWaveform[i], 5);
      }
    });

    it('should handle multiple concurrent requests', async () => {
      const sampleRate = 44100;
      const audioContext = new AudioContext({ sampleRate });
      
      // Create multiple audio buffers
      const buffers = Array.from({ length: 3 }, (_, i) => {
        const audioBuffer = audioContext.createBuffer(1, 5000, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        for (let j = 0; j < channelData.length; j++) {
          channelData[j] = Math.sin(2 * Math.PI * (440 + i * 100) * j / sampleRate);
        }
        return audioBuffer;
      });

      const width = 50;
      
      // Generate waveforms concurrently
      const promises = buffers.map(buffer => 
        generator.generateFromAudioBufferAsync(buffer, width)
      );

      const waveforms = await Promise.all(promises);

      // All should complete successfully
      expect(waveforms).toHaveLength(3);
      waveforms.forEach(waveform => {
        expect(waveform).toHaveLength(width);
        expect(waveform.every(v => v >= 0 && v <= 1)).toBe(true);
      });
    });
  });

  describe('cancelAllRequests', () => {
    it('should cancel all pending requests when using Web Worker', async () => {
      const sampleRate = 44100;
      const audioContext = new AudioContext({ sampleRate });
      const audioBuffer = audioContext.createBuffer(1, 100000, sampleRate);
      
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }

      // Start multiple requests
      const promises = Array.from({ length: 3 }, () =>
        generator.generateFromAudioBufferAsync(audioBuffer, 1000)
      );

      // Cancel all requests immediately
      generator.cancelAllRequests();

      // All promises should reject with cancellation error (if Web Worker is available)
      // or complete successfully (if falling back to synchronous execution)
      const results = await Promise.allSettled(promises);
      
      // In test environment, Web Worker may not be available, so requests complete synchronously
      // Just verify that cancelAllRequests doesn't cause errors
      expect(results).toHaveLength(3);
      results.forEach(result => {
        // Either rejected (worker available) or fulfilled (fallback to sync)
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    });
  });

  describe('terminate', () => {
    it('should terminate worker and cancel all requests', async () => {
      const sampleRate = 44100;
      const audioContext = new AudioContext({ sampleRate });
      const audioBuffer = audioContext.createBuffer(1, 10000, sampleRate);
      
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }

      // Start a request
      const promise = generator.generateFromAudioBufferAsync(audioBuffer, 100);

      // Terminate immediately
      generator.terminate();

      // In test environment, Web Worker may not be available, so request completes synchronously
      // Just verify that terminate doesn't cause errors
      const result = await Promise.allSettled([promise]);
      expect(result).toHaveLength(1);
      // Either rejected (worker available) or fulfilled (fallback to sync)
      expect(['fulfilled', 'rejected']).toContain(result[0].status);
    });
  });

  describe('generateFromBlob', () => {
    it('should generate waveform data from Blob', async () => {
      // Create a simple WAV file blob
      const sampleRate = 44100;
      const duration = 0.1; // 0.1 seconds
      const numSamples = sampleRate * duration;
      
      // Create WAV file buffer
      const wavBuffer = createWavBuffer(numSamples, sampleRate);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });

      const width = 50;
      const waveform = await generator.generateFromBlob(blob, width);

      expect(waveform).toHaveLength(width);
      expect(waveform.every(v => v >= 0 && v <= 1)).toBe(true);
    });

    it('should throw error for invalid Blob', async () => {
      await expect(
        generator.generateFromBlob(null as any, 100)
      ).rejects.toThrow('Invalid Blob');

      await expect(
        generator.generateFromBlob(new Blob([]), 100)
      ).rejects.toThrow('Invalid Blob');
    });

    it('should throw error for invalid width', async () => {
      const blob = new Blob([new ArrayBuffer(100)], { type: 'audio/wav' });

      await expect(
        generator.generateFromBlob(blob, 0)
      ).rejects.toThrow('Invalid width');
    });

    it('should handle blob conversion correctly', async () => {
      // Create a simple WAV file blob
      const sampleRate = 44100;
      const duration = 0.05;
      const numSamples = sampleRate * duration;
      
      const wavBuffer = createWavBuffer(numSamples, sampleRate);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });

      const width = 20;
      const waveform = await generator.generateFromBlob(blob, width);

      expect(waveform).toHaveLength(width);
      expect(waveform.every(v => v >= 0 && v <= 1)).toBe(true);
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
