// Vitest setup file for client tests
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock Web Audio API
class MockAudioContext {
  createBuffer(channels: number, length: number, sampleRate: number) {
    const buffer = {
      length,
      sampleRate,
      numberOfChannels: channels,
      duration: length / sampleRate,
      getChannelData: (channel: number) => {
        const data = new Float32Array(length);
        // Fill with sample data
        for (let i = 0; i < length; i++) {
          data[i] = Math.sin(2 * Math.PI * i / 100);
        }
        return data;
      },
    };
    return buffer as AudioBuffer;
  }
}

class MockOfflineAudioContext extends MockAudioContext {
  constructor(
    public numberOfChannels: number,
    public length: number,
    public sampleRate: number
  ) {
    super();
  }

  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      smoothingTimeConstant: 0.8,
      connect: vi.fn(),
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
    };
  }

  get destination() {
    return {};
  }
}

// Set up global mocks
global.AudioContext = MockAudioContext as any;
global.OfflineAudioContext = MockOfflineAudioContext as any;

// Cleanup after each test
afterEach(() => {
  cleanup();
});
