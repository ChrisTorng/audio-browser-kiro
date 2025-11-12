import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioPlayer } from '../../../src/client/hooks/useAudioPlayer';

// Mock HTMLAudioElement
class MockAudioElement {
  src = '';
  currentTime = 0;
  duration = 100;
  loop = false;
  paused = true;
  shouldRejectPlay = false;
  playRejectionError: Error | null = null;
  
  private listeners: Record<string, Function[]> = {};

  play() {
    this.paused = false;
    if (this.shouldRejectPlay && this.playRejectionError) {
      return Promise.reject(this.playRejectionError);
    }
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  addEventListener(event: string, handler: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  removeEventListener(event: string, handler: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }

  dispatchEvent(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(handler => handler());
    }
  }

  triggerLoadedMetadata() {
    this.dispatchEvent('loadedmetadata');
  }

  triggerTimeUpdate() {
    this.dispatchEvent('timeupdate');
  }
}

describe('useAudioPlayer', () => {
  let mockAudio: MockAudioElement;

  beforeEach(() => {
    mockAudio = new MockAudioElement();
    global.Audio = vi.fn(() => mockAudio as any) as any;
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
  });

  it('plays audio from URL', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      result.current.play('test.mp3');
    });

    expect(mockAudio.src).toBe('test.mp3');
    expect(mockAudio.paused).toBe(false);
    expect(result.current.isPlaying).toBe(true);
  });

  it('stops audio playback', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      result.current.play('test.mp3');
    });

    act(() => {
      result.current.stop();
    });

    expect(mockAudio.paused).toBe(true);
    expect(mockAudio.currentTime).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('toggles playback state', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      result.current.play('test.mp3');
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('enables loop playback', () => {
    renderHook(() => useAudioPlayer());

    expect(mockAudio.loop).toBe(true);
  });

  it('updates progress during playback', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      result.current.play('test.mp3');
    });

    act(() => {
      mockAudio.currentTime = 50;
      mockAudio.triggerTimeUpdate();
    });

    expect(result.current.currentTime).toBe(50);
    expect(result.current.progress).toBe(0.5);
  });

  it('updates duration on metadata load', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      result.current.play('test.mp3');
    });

    act(() => {
      mockAudio.duration = 200;
      mockAudio.triggerLoadedMetadata();
    });

    expect(result.current.duration).toBe(200);
  });

  it('switches to new audio file when playing different URL', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      result.current.play('test1.mp3');
    });

    expect(mockAudio.src).toBe('test1.mp3');

    await act(async () => {
      result.current.play('test2.mp3');
    });

    expect(mockAudio.src).toBe('test2.mp3');
    expect(mockAudio.currentTime).toBe(0);
  });

  it('handles AbortError silently when switching files quickly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAudioPlayer());

    // Create an AbortError
    const abortError = new DOMException('The play() request was interrupted', 'AbortError');
    mockAudio.shouldRejectPlay = true;
    mockAudio.playRejectionError = abortError;

    await act(async () => {
      result.current.play('test1.mp3');
      // Wait for promise to settle
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // AbortError should not be logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  it('logs non-AbortError errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAudioPlayer());

    // Create a different error
    const networkError = new Error('Network error');
    mockAudio.shouldRejectPlay = true;
    mockAudio.playRejectionError = networkError;

    await act(async () => {
      result.current.play('test1.mp3');
      // Wait for promise to settle
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Non-AbortError should be logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to play audio:', networkError);
    expect(result.current.isPlaying).toBe(false);
    
    consoleErrorSpy.mockRestore();
  });

  it('cleans up resources on stop', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      result.current.play('test.mp3');
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(mockAudio.paused).toBe(true);
    expect(mockAudio.currentTime).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it('ensures only one audio file plays at a time', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    // Start playing first file
    await act(async () => {
      result.current.play('test1.mp3');
    });

    expect(mockAudio.src).toBe('test1.mp3');
    expect(mockAudio.paused).toBe(false);
    expect(result.current.isPlaying).toBe(true);

    // Switch to second file - should stop first and play second
    await act(async () => {
      result.current.play('test2.mp3');
    });

    expect(mockAudio.src).toBe('test2.mp3');
    expect(mockAudio.currentTime).toBe(0); // Reset to beginning
    expect(mockAudio.paused).toBe(false);
    expect(result.current.isPlaying).toBe(true);

    // Switch to third file - should stop second and play third
    await act(async () => {
      result.current.play('test3.mp3');
    });

    expect(mockAudio.src).toBe('test3.mp3');
    expect(mockAudio.currentTime).toBe(0); // Reset to beginning
    expect(mockAudio.paused).toBe(false);
    expect(result.current.isPlaying).toBe(true);
  });

  it('cancels previous playback request when switching files', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    // Create a spy to track abort calls
    let abortCallCount = 0;
    const originalAbortController = global.AbortController;
    
    global.AbortController = class MockAbortController {
      signal = {};
      abort() {
        abortCallCount++;
      }
    } as any;

    // Start playing first file
    await act(async () => {
      result.current.play('test1.mp3');
    });

    expect(abortCallCount).toBe(0); // No abort on first play

    // Switch to second file - should abort first request
    await act(async () => {
      result.current.play('test2.mp3');
    });

    expect(abortCallCount).toBe(1); // First request aborted

    // Switch to third file - should abort second request
    await act(async () => {
      result.current.play('test3.mp3');
    });

    expect(abortCallCount).toBe(2); // Second request aborted

    // Restore original AbortController
    global.AbortController = originalAbortController;
  });
});
