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

  it('generates spectrogram data from AudioBuffer', async () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    await act(async () => {
      await result.current.generateSpectrogram(mockBuffer, '/test/audio.mp3', 50, 64);
    });

    expect(result.current.spectrogramData).toHaveLength(50);
    expect(result.current.spectrogramData[0]).toHaveLength(64);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('normalizes spectrogram data to 0-1 range', async () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    await act(async () => {
      await result.current.generateSpectrogram(mockBuffer, '/test/audio.mp3', 50, 64);
    });

    const allInRange = result.current.spectrogramData.every(timeSlice =>
      timeSlice.every(v => v >= 0 && v <= 1)
    );
    expect(allInRange).toBe(true);
  });

  it('uses default dimensions when not specified', { timeout: 30000 }, async () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(20000);

    await act(async () => {
      await result.current.generateSpectrogram(mockBuffer, '/test/audio.mp3');
    });

    expect(result.current.spectrogramData).toHaveLength(200);
    expect(result.current.spectrogramData[0]).toHaveLength(128);
  });

  it('caches generated spectrograms', async () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    await act(async () => {
      await result.current.generateSpectrogram(mockBuffer, '/test/audio.mp3', 50, 64);
    });

    const firstResult = result.current.spectrogramData;

    await act(async () => {
      await result.current.generateSpectrogram(mockBuffer, '/test/audio.mp3', 50, 64);
    });

    const secondResult = result.current.spectrogramData;

    // Should return same reference from cache
    expect(firstResult).toBe(secondResult);
  });

  it('generates different spectrograms for different dimensions', async () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    await act(async () => {
      await result.current.generateSpectrogram(mockBuffer, '/test/audio1.mp3', 50, 64);
    });

    const firstResult = result.current.spectrogramData;

    await act(async () => {
      await result.current.generateSpectrogram(mockBuffer, '/test/audio2.mp3', 100, 128);
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
      result.current.generateSpectrogram(mockBuffer, '/test/audio.mp3', 50, 64);
    });

    expect(result.current.spectrogramData).toHaveLength(50);

    act(() => {
      result.current.clearSpectrogram();
    });

    expect(result.current.spectrogramData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('handles errors during generation', async () => {
    const { result } = renderHook(() => useSpectrogram());
    
    // Create invalid buffer that will cause error (missing getChannelData method)
    const invalidBuffer = {
      length: 10000,
      sampleRate: 44100,
      numberOfChannels: 1,
    } as AudioBuffer;

    await act(async () => {
      await result.current.generateSpectrogram(invalidBuffer, '/test/invalid.mp3', 50, 64);
    });

    // Error should be set when generation fails
    expect(result.current.error).not.toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles empty audio buffer', async () => {
    const { result } = renderHook(() => useSpectrogram());
    const audioContext = new AudioContext();
    const emptyBuffer = audioContext.createBuffer(1, 0, 44100);

    await act(async () => {
      await result.current.generateSpectrogram(emptyBuffer, '/test/audio.mp3', 50, 64);
    });

    // Should handle gracefully
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state during generation', async () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    await act(async () => {
      await result.current.generateSpectrogram(mockBuffer, '/test/audio.mp3', 50, 64);
    });

    // After generation completes, loading should be false
    expect(result.current.isLoading).toBe(false);
  });

  it('cancels generation when requested', async () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer = createMockAudioBuffer(10000);

    // Start generation
    act(() => {
      result.current.generateSpectrogram(mockBuffer, '/test/audio.mp3', 50, 64);
    });

    // Cancel immediately
    act(() => {
      result.current.cancelGeneration();
    });

    // Should not be loading after cancel
    expect(result.current.isLoading).toBe(false);
  });

  it('cancels previous generation when starting new one', async () => {
    const { result } = renderHook(() => useSpectrogram());
    const mockBuffer1 = createMockAudioBuffer(10000);
    const mockBuffer2 = createMockAudioBuffer(15000);

    // Start first generation
    act(() => {
      result.current.generateSpectrogram(mockBuffer1, '/test/audio1.mp3', 50, 64);
    });

    // Start second generation (should cancel first)
    await act(async () => {
      await result.current.generateSpectrogram(mockBuffer2, '/test/audio2.mp3', 100, 128);
    });

    // Should have second result
    expect(result.current.spectrogramData).toHaveLength(100);
    expect(result.current.isLoading).toBe(false);
  });
});
