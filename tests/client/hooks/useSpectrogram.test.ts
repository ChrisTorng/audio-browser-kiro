import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpectrogram } from '../../../src/client/hooks/useSpectrogram';

// Create mock AudioBuffer
function createMockAudioBuffer(length: number = 1000, sampleRate: number = 44100): AudioBuffer {
  const audioContext = new AudioContext();
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  // Fill with sample data (sine wave with varying frequency)
  for (let i = 0; i < length; i++) {
    channelData[i] = Math.sin(2 * Math.PI * i / 50) * 0.5;
  }
  
  return buffer;
}

describe('useSpectrogram', () => {
  beforeEach(() => {
    // Ensure AudioContext is available
    if (global.AudioContext) {
      global.AudioContext = AudioContext;
    }
    if (global.OfflineAudioContext) {
      global.OfflineAudioContext = OfflineAudioContext;
    }
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useSpectrogram());

    expect(result.current.spectrogramData).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('generates spectrogram data from AudioBuffer', () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    act(() => {
      result.current.generateSpectrogram(mockBuffer, 50, 64);
    });

    expect(result.current.spectrogramData).toHaveLength(50);
    expect(result.current.spectrogramData[0]).toHaveLength(64);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('normalizes spectrogram data to 0-1 range', () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    act(() => {
      result.current.generateSpectrogram(mockBuffer, 50, 64);
    });

    const allInRange = result.current.spectrogramData.every(timeSlice =>
      timeSlice.every(v => v >= 0 && v <= 1)
    );
    expect(allInRange).toBe(true);
  });

  it('uses default dimensions when not specified', () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(20000);

    act(() => {
      result.current.generateSpectrogram(mockBuffer);
    });

    expect(result.current.spectrogramData).toHaveLength(200);
    expect(result.current.spectrogramData[0]).toHaveLength(128);
  });

  it('caches generated spectrograms', () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    act(() => {
      result.current.generateSpectrogram(mockBuffer, 50, 64);
    });

    const firstResult = result.current.spectrogramData;

    act(() => {
      result.current.generateSpectrogram(mockBuffer, 50, 64);
    });

    const secondResult = result.current.spectrogramData;

    // Should return same reference from cache
    expect(firstResult).toBe(secondResult);
  });

  it('generates different spectrograms for different dimensions', () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    act(() => {
      result.current.generateSpectrogram(mockBuffer, 50, 64);
    });

    const firstResult = result.current.spectrogramData;

    act(() => {
      result.current.generateSpectrogram(mockBuffer, 100, 128);
    });

    const secondResult = result.current.spectrogramData;

    expect(firstResult).toHaveLength(50);
    expect(secondResult).toHaveLength(100);
    expect(firstResult[0]).toHaveLength(64);
    expect(secondResult[0]).toHaveLength(128);
    expect(firstResult).not.toBe(secondResult);
  });

  it('clears spectrogram data', () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    act(() => {
      result.current.generateSpectrogram(mockBuffer, 50, 64);
    });

    expect(result.current.spectrogramData).toHaveLength(50);

    act(() => {
      result.current.clearSpectrogram();
    });

    expect(result.current.spectrogramData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('handles errors during generation', () => {
    const { result } = renderHook(() => useSpectrogram());
    
    // Create invalid buffer that will cause error
    const invalidBuffer = {} as AudioBuffer;

    act(() => {
      result.current.generateSpectrogram(invalidBuffer, 50, 64);
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles empty audio buffer', () => {
    const { result } = renderHook(() => useSpectrogram());
    const audioContext = new AudioContext();
    const emptyBuffer = audioContext.createBuffer(1, 0, 44100);

    act(() => {
      result.current.generateSpectrogram(emptyBuffer, 50, 64);
    });

    // Should handle gracefully
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state during generation', () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    act(() => {
      result.current.generateSpectrogram(mockBuffer, 50, 64);
    });

    // After generation completes, loading should be false
    expect(result.current.isLoading).toBe(false);
  });
});
