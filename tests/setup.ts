// Vitest setup file for client tests
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock react-window for testing (v2 API)
vi.mock('react-window', () => {
  const React = require('react');
  
  const MockList = React.forwardRef(({ rowComponent: RowComponent, rowCount, rowProps, rowHeight, listRef }: any, ref: any) => {
    // Render all items for testing purposes
    const items: React.ReactElement[] = [];
    const height = typeof rowHeight === 'number' ? rowHeight : 40;
    
    for (let index = 0; index < rowCount; index++) {
      const itemStyle = {
        position: 'absolute' as const,
        top: index * height,
        height,
        width: '100%',
      };

      const ariaAttributes = {
        'aria-posinset': index + 1,
        'aria-setsize': rowCount,
        role: 'listitem' as const,
      };

      items.push(
        React.createElement(RowComponent, {
          key: `item-${index}`,
          index,
          style: itemStyle,
          ariaAttributes,
          ...rowProps,
        })
      );
    }
    
    // Expose scrollToRow method for ref
    const api = {
      scrollToRow: vi.fn(),
      get element() {
        return null;
      },
    };
    
    if (listRef && typeof listRef === 'object') {
      listRef.current = api;
    }
    if (ref && typeof ref === 'object') {
      ref.current = api;
    }
    
    return React.createElement('div', { 'data-testid': 'react-window-list' }, items);
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
      getChannelData: (_channel: number) => {
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

  decodeAudioData(_arrayBuffer: ArrayBuffer) {
    return Promise.resolve(this.createBuffer(1, 44100, 44100));
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

// Set up global mocks
global.AudioContext = MockAudioContext as any;
global.OfflineAudioContext = MockOfflineAudioContext as any;
global.FileReader = MockFileReader as any;

// Cleanup after each test
afterEach(() => {
  cleanup();
});
