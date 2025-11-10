import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWaveform } from '../../../src/client/hooks/useWaveform';

// Create mock AudioBuffer
function createMockAudioBuffer(length: number = 1000, sampleRate: number = 44100): AudioBuffer {
  const audioContext = new AudioContext();
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  // Fill with sample data (sine wave)
  for (let i = 0; i < length; i++) {
    channelData[i] = Math.sin(2 * Math.PI * i / 100);
  }
  
  return buffer;
}

describe('useWaveform', () => {
  beforeEach(() => {
    // Reset AudioContext for each test
    if (global.AudioContext) {
      global.AudioContext = AudioContext;
    }
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useWaveform());

    expect(result.current.waveformData).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('generates waveform data from AudioBuffer', () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    act(() => {
      result.current.generateWaveform(mockBuffer, 100);
    });

    expect(result.current.waveformData).toHaveLength(100);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('normalizes waveform data to 0-1 range', () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    act(() => {
      result.current.generateWaveform(mockBuffer, 100);
    });

    const allInRange = result.current.waveformData.every(v => v >= 0 && v <= 1);
    expect(allInRange).toBe(true);
  });

  it('uses default width when not specified', () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(10000);

    act(() => {
      result.current.generateWaveform(mockBuffer);
    });

    expect(result.current.waveformData).toHaveLength(1000);
  });

  it('caches generated waveforms', () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    act(() => {
      result.current.generateWaveform(mockBuffer, 100);
    });

    const firstResult = result.current.waveformData;

    act(() => {
      result.current.generateWaveform(mockBuffer, 100);
    });

    const secondResult = result.current.waveformData;

    // Should return same reference from cache
    expect(firstResult).toBe(secondResult);
  });

  it('generates different waveforms for different widths', () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    act(() => {
      result.current.generateWaveform(mockBuffer, 50);
    });

    const firstResult = result.current.waveformData;

    act(() => {
      result.current.generateWaveform(mockBuffer, 100);
    });

    const secondResult = result.current.waveformData;

    expect(firstResult).toHaveLength(50);
    expect(secondResult).toHaveLength(100);
    expect(firstResult).not.toBe(secondResult);
  });

  it('clears waveform data', () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    act(() => {
      result.current.generateWaveform(mockBuffer, 100);
    });

    expect(result.current.waveformData).toHaveLength(100);

    act(() => {
      result.current.clearWaveform();
    });

    expect(result.current.waveformData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('handles errors during generation', () => {
    const { result } = renderHook(() => useWaveform());
    
    // Create invalid buffer that will cause error
    const invalidBuffer = {} as AudioBuffer;

    act(() => {
      result.current.generateWaveform(invalidBuffer, 100);
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state during generation', () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    act(() => {
      result.current.generateWaveform(mockBuffer, 100);
    });

    // After generation completes, loading should be false
    expect(result.current.isLoading).toBe(false);
  });
});
