// Vitest setup file for client tests
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock react-window for testing
vi.mock('react-window', () => {
  const React = require('react');
  const MockList = React.forwardRef(({ children, itemCount, itemData }: any, ref: any) => {
    // Render all items for testing purposes
    const items = [];
    for (let index = 0; index < itemCount; index++) {
      items.push(
        React.createElement(
          'div',
          { key: `item-${index}` },
          children({
            index,
            style: { position: 'absolute', top: index * 40, height: 40, width: '100%' },
            data: itemData,
          })
        )
      );
    }
    
    // Expose scrollToItem method for ref
    if (ref && typeof ref === 'object') {
      ref.current = {
        scrollToItem: vi.fn(),
      };
    }
    
    return React.createElement('div', null, items);
  });
  
  return {
    List: MockList,
    FixedSizeList: MockList,
  };
});

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

// Mock FileReader for Blob handling
class MockFileReader {
  result: ArrayBuffer | string | null = null;
  error: Error | null = null;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  readAsArrayBuffer(blob: Blob) {
    // Simulate async read
    setTimeout(() => {
      if (blob.size > 0) {
        // Create a mock ArrayBuffer
        this.result = new ArrayBuffer(blob.size);
        if (this.onload) {
          this.onload({ target: this });
        }
      } else {
        this.error = new Error('Empty blob');
        if (this.onerror) {
          this.onerror({ target: this });
        }
      }
    }, 0);
  }
}

// Mock AudioContext.decodeAudioData
MockAudioContext.prototype.decodeAudioData = function(arrayBuffer: ArrayBuffer) {
  return Promise.resolve(this.createBuffer(1, 44100, 44100));
};

// Set up global mocks
global.AudioContext = MockAudioContext as any;
global.OfflineAudioContext = MockOfflineAudioContext as any;
global.FileReader = MockFileReader as any;

// Cleanup after each test
afterEach(() => {
  cleanup();
});
