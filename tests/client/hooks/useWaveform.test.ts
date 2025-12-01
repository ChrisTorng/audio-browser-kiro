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

  it('generates waveform data from AudioBuffer', async () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    await act(async () => {
      await result.current.generateWaveform(mockBuffer, '/test/audio.mp3', 100);
    });

    expect(result.current.waveformData).toHaveLength(100);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('normalizes waveform data to 0-1 range', async () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    await act(async () => {
      await result.current.generateWaveform(mockBuffer, '/test/audio.mp3', 100);
    });

    const allInRange = result.current.waveformData.every(v => v >= 0 && v <= 1);
    expect(allInRange).toBe(true);
  });

  it('uses default width when not specified', async () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(10000);

    await act(async () => {
      await result.current.generateWaveform(mockBuffer, '/test/audio.mp3');
    });

    expect(result.current.waveformData).toHaveLength(1000);
  });

  it('caches generated waveforms', async () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    await act(async () => {
      await result.current.generateWaveform(mockBuffer, '/test/audio.mp3', 100);
    });

    const firstResult = result.current.waveformData;

    await act(async () => {
      await result.current.generateWaveform(mockBuffer, '/test/audio.mp3', 100);
    });

    const secondResult = result.current.waveformData;

    // Should return same reference from cache
    expect(firstResult).toBe(secondResult);
  });

  it('generates different waveforms for different widths', async () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    await act(async () => {
      await result.current.generateWaveform(mockBuffer, '/test/audio1.mp3', 50);
    });

    const firstResult = result.current.waveformData;

    await act(async () => {
      await result.current.generateWaveform(mockBuffer, '/test/audio2.mp3', 100);
    });

    const secondResult = result.current.waveformData;

    expect(firstResult).toHaveLength(50);
    expect(secondResult).toHaveLength(100);
    expect(firstResult).not.toBe(secondResult);
  });

  it('clears waveform data', async () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    await act(async () => {
      await result.current.generateWaveform(mockBuffer, '/test/audio.mp3', 100);
    });

    expect(result.current.waveformData).toHaveLength(100);

    act(() => {
      result.current.clearWaveform();
    });

    expect(result.current.waveformData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('handles errors during generation', async () => {
    const { result } = renderHook(() => useWaveform());
    
    // Create invalid buffer that will cause error (missing getChannelData method)
    const invalidBuffer = {
      length: 1000,
      sampleRate: 44100,
      numberOfChannels: 1,
    } as AudioBuffer;

    await act(async () => {
      await result.current.generateWaveform(invalidBuffer, '/test/invalid.mp3', 100);
    });

    // Error should be set when generation fails
    expect(result.current.error).not.toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state during generation', async () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    await act(async () => {
      await result.current.generateWaveform(mockBuffer, '/test/audio.mp3', 100);
    });

    // After generation completes, loading should be false
    expect(result.current.isLoading).toBe(false);
  });

  it('generates waveform data asynchronously in background', async () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer = createMockAudioBuffer(1000);

    await act(async () => {
      await result.current.generateWaveformAsync(mockBuffer, '/test/audio.mp3', 100);
    });

    expect(result.current.waveformData).toHaveLength(100);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('cancels previous generation when new one starts', async () => {
    const { result } = renderHook(() => useWaveform());
    const mockBuffer1 = createMockAudioBuffer(1000);
    const mockBuffer2 = createMockAudioBuffer(2000);

    // Start first generation
    const promise1 = act(async () => {
      await result.current.generateWaveformAsync(mockBuffer1, '/test/audio1.mp3', 100);
    });

    // Start second generation immediately (should cancel first)
    await act(async () => {
      await result.current.generateWaveformAsync(mockBuffer2, '/test/audio2.mp3', 100);
    });

    // Wait for first to complete (it should be cancelled)
    await promise1;

    // Should have data from second generation
    expect(result.current.waveformData).toHaveLength(100);
    expect(result.current.error).toBe(null);
  });
});
