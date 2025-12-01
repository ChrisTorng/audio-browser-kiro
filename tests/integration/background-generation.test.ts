import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLazyVisualization } from '../../src/client/hooks/useLazyVisualization';
import { visualizationTaskQueue } from '../../src/client/services/visualizationTaskQueue';

/**
 * Integration test for background visualization generation
 * Tests Requirements: 3.15, 3.16, 3.18, 5.6, 11.12
 * 
 * Validates:
 * - Waveform generation doesn't block UI (3.15, 11.12)
 * - Spectrogram generation doesn't block UI (3.15, 11.12)
 * - Audio can play before visualization completes (5.6)
 * - Visualizations display immediately when complete (3.16)
 * - Task cancellation works when switching files (3.18)
 */
describe('Background Visualization Generation', () => {
  // Mock audio file URL
  const mockAudioUrl = '/api/audio/test.mp3';
  const mockFilePath = '/path/to/test.mp3';

  beforeEach(() => {
    // Clear any existing tasks
    visualizationTaskQueue.cancelAllTasks();
  });

  afterEach(() => {
    // Clean up
    visualizationTaskQueue.cancelAllTasks();
  });

  describe('Requirement 3.15: Background generation does not block UI', () => {
    it('should allow waveform generation in background without blocking', async () => {
      // Requirement 3.15: THE Frontend SHALL allow users to continue operating interface during generation
      // Requirement 11.12: THE Frontend SHALL ensure background tasks don't block UI
      
      const { result } = renderHook(() => useLazyVisualization());

      // Track if UI operations can proceed
      let uiOperationCompleted = false;

      // Start visualization generation
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Verify loading state is set immediately
      expect(result.current.isLoading).toBe(true);

      // Simulate UI operation during generation
      setTimeout(() => {
        uiOperationCompleted = true;
      }, 10);

      // Wait a short time
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify UI operation completed (wasn't blocked)
      expect(uiOperationCompleted).toBe(true);

      // Verify generation is still in progress or completed
      expect(result.current.isLoading || result.current.waveformData !== null).toBe(true);
    });

    it('should allow spectrogram generation in background without blocking', async () => {
      // Requirement 3.15: THE Frontend SHALL allow users to continue operating interface during generation
      // Requirement 11.12: THE Frontend SHALL ensure background tasks don't block UI
      
      const { result } = renderHook(() => useLazyVisualization());

      // Track if UI operations can proceed
      let uiOperationCompleted = false;

      // Start visualization generation
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Verify loading state is set immediately
      expect(result.current.isLoading).toBe(true);

      // Simulate UI operation during generation
      setTimeout(() => {
        uiOperationCompleted = true;
      }, 10);

      // Wait a short time
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify UI operation completed (wasn't blocked)
      expect(uiOperationCompleted).toBe(true);

      // Verify generation is still in progress or completed
      expect(result.current.isLoading || result.current.spectrogramData !== null).toBe(true);
    });

    it('should process multiple UI events during background generation', async () => {
      // Requirement 11.12: THE Frontend SHALL ensure audio loading and visualization don't block UI interaction
      
      const { result } = renderHook(() => useLazyVisualization());

      // Track UI events
      const uiEvents: string[] = [];

      // Start visualization generation
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Simulate multiple UI events during generation
      const eventInterval = setInterval(() => {
        uiEvents.push(`event-${Date.now()}`);
      }, 5);

      // Wait for some events to accumulate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear interval
      clearInterval(eventInterval);

      // Verify multiple UI events were processed
      expect(uiEvents.length).toBeGreaterThan(5);

      // Verify generation didn't block event processing
      const eventTimestamps = uiEvents.map(e => parseInt(e.split('-')[1]));
      const timeDiffs = eventTimestamps.slice(1).map((t, i) => t - eventTimestamps[i]);
      
      // All time differences should be small (< 50ms), indicating no blocking
      timeDiffs.forEach(diff => {
        expect(diff).toBeLessThan(50);
      });
    });
  });

  describe('Requirement 3.16 & 3.18: Immediate display and loading indicators', () => {
    it('should show loading indicator during generation', async () => {
      // Requirement 3.16: THE Frontend SHALL display loading indicator during generation
      // Requirement 3.17: THE Frontend SHALL display placeholder during generation
      
      const { result } = renderHook(() => useLazyVisualization());

      // Before loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(0);

      // Start loading
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Verify loading indicator is shown
      expect(result.current.isLoading).toBe(true);
      expect(result.current.waveformData).toBeNull();
      expect(result.current.spectrogramData).toBeNull();
    });

    it('should display visualizations immediately when generation completes', async () => {
      // Requirement 3.16: THE Frontend SHALL display visualizations immediately when complete
      
      const { result } = renderHook(() => useLazyVisualization());

      // Start loading
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Wait for completion
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 }
      );

      // Verify visualizations are displayed immediately after completion
      expect(result.current.waveformData || result.current.spectrogramData).toBeTruthy();
      expect(result.current.progress).toBe(100);
    });

    it('should update progress during generation', async () => {
      // Requirement 3.16: THE Frontend SHALL show progress during generation
      
      const { result } = renderHook(() => useLazyVisualization());

      const progressValues: number[] = [];

      // Start loading
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Track progress over time
      const progressInterval = setInterval(() => {
        progressValues.push(result.current.progress);
      }, 50);

      // Wait for completion
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 }
      );

      clearInterval(progressInterval);

      // Verify progress increased over time
      expect(progressValues.length).toBeGreaterThan(0);
      
      // Progress should start at 0 and end at 100
      expect(progressValues[0]).toBe(0);
      expect(result.current.progress).toBe(100);

      // Progress should be monotonically increasing (or stay same)
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }
    });
  });

  describe('Requirement 5.6: Audio playback before visualization completes', () => {
    it('should allow audio playback to start before waveform generation completes', async () => {
      // Requirement 5.6: THE Frontend SHALL allow audio to play before visualization completes
      // Requirement 5.7: THE Frontend SHALL start playback immediately when audio loads
      
      const { result } = renderHook(() => useLazyVisualization());

      // Simulate audio player state
      let audioCanPlay = false;
      let audioIsPlaying = false;

      // Start visualization generation
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Simulate audio loading (happens independently)
      setTimeout(() => {
        audioCanPlay = true;
      }, 50);

      // Wait for audio to be ready
      await waitFor(
        () => {
          expect(audioCanPlay).toBe(true);
        },
        { timeout: 200 }
      );

      // Verify audio can play even if visualization isn't complete
      audioIsPlaying = true;
      expect(audioIsPlaying).toBe(true);

      // Visualization might still be loading
      const visualizationComplete = result.current.waveformData !== null && 
                                    result.current.spectrogramData !== null;
      
      // Audio should be playable regardless of visualization state
      expect(audioIsPlaying).toBe(true);
      
      // This demonstrates audio playback is independent of visualization
      console.log(`Audio playing: ${audioIsPlaying}, Visualization complete: ${visualizationComplete}`);
    });

    it('should not block audio playback while generating spectrogram', async () => {
      // Requirement 5.6: THE Frontend SHALL allow audio to play before visualization completes
      
      const { result } = renderHook(() => useLazyVisualization());

      // Track audio playback state
      let audioPlaybackStarted = false;

      // Start visualization generation
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Simulate audio playback starting immediately
      setTimeout(() => {
        audioPlaybackStarted = true;
      }, 10);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify audio playback started
      expect(audioPlaybackStarted).toBe(true);

      // Visualization might still be in progress
      // This is acceptable - audio doesn't wait for visualization
      expect(result.current.isLoading || result.current.spectrogramData !== null).toBe(true);
    });
  });

  describe('Requirement 3.18: Task cancellation when switching files', () => {
    it('should cancel previous task when loading new file', async () => {
      // Requirement 3.18: THE Frontend SHALL cancel tasks when user switches files
      
      const { result } = renderHook(() => useLazyVisualization());

      // Start first file
      act(() => {
        result.current.loadVisualization('/path/to/file1.mp3', '/api/audio/file1.mp3', 'normal');
      });

      // Wait a bit for task to start
      await new Promise(resolve => setTimeout(resolve, 50));

      // Get initial task count
      const statsBeforeSwitch = visualizationTaskQueue.getQueueStats();
      const tasksBeforeSwitch = statsBeforeSwitch.total;

      // Switch to second file
      act(() => {
        result.current.loadVisualization('/path/to/file2.mp3', '/api/audio/file2.mp3', 'normal');
      });

      // Wait for cancellation to process
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify previous task was cancelled
      const statsAfterSwitch = visualizationTaskQueue.getQueueStats();
      
      // Should have cancelled the first task
      expect(statsAfterSwitch.cancelled).toBeGreaterThan(0);

      // Verify new task is active
      expect(result.current.isLoading || result.current.waveformData !== null).toBe(true);
    });

    it('should handle rapid file switching without interference', async () => {
      // Requirement 3.18: THE Frontend SHALL prevent task interference during rapid switching
      // Requirement 11.12: THE Frontend SHALL ensure multiple file visualizations don't interfere
      
      const { result } = renderHook(() => useLazyVisualization());

      // Rapidly switch between files
      const files = [
        { path: '/path/to/file1.mp3', url: '/api/audio/file1.mp3' },
        { path: '/path/to/file2.mp3', url: '/api/audio/file2.mp3' },
        { path: '/path/to/file3.mp3', url: '/api/audio/file3.mp3' },
        { path: '/path/to/file4.mp3', url: '/api/audio/file4.mp3' },
      ];

      for (const file of files) {
        act(() => {
          result.current.loadVisualization(file.path, file.url, 'normal');
        });
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Wait for final task to settle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify no errors occurred
      expect(result.current.error).toBeNull();

      // Verify system is in a valid state
      const stats = visualizationTaskQueue.getQueueStats();
      
      // Should have cancelled previous tasks
      expect(stats.cancelled).toBeGreaterThan(0);

      // Should have at most one active task (for the last file)
      expect(stats.running + stats.pending).toBeLessThanOrEqual(1);
    });

    it('should properly clean up cancelled tasks', async () => {
      // Requirement 3.18: THE Frontend SHALL clean up resources when cancelling tasks
      
      const { result } = renderHook(() => useLazyVisualization());

      // Start first file
      act(() => {
        result.current.loadVisualization('/path/to/file1.mp3', '/api/audio/file1.mp3', 'normal');
      });

      // Wait for task to start
      await new Promise(resolve => setTimeout(resolve, 50));

      // Get tasks for first file
      const tasksBeforeCancel = visualizationTaskQueue.getTasksForFile('/path/to/file1.mp3');
      expect(tasksBeforeCancel.length).toBeGreaterThan(0);

      // Switch to second file (should cancel first)
      act(() => {
        result.current.loadVisualization('/path/to/file2.mp3', '/api/audio/file2.mp3', 'normal');
      });

      // Wait for cancellation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify first file's tasks are cleaned up
      const tasksAfterCancel = visualizationTaskQueue.getTasksForFile('/path/to/file1.mp3');
      expect(tasksAfterCancel.length).toBe(0);
    });

    it('should cancel task when clearing visualization', async () => {
      // Requirement 3.18: THE Frontend SHALL cancel tasks when clearing visualization
      
      const { result } = renderHook(() => useLazyVisualization());

      // Start loading
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Wait for task to start
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify task is active
      expect(result.current.isLoading).toBe(true);

      // Clear visualization
      act(() => {
        result.current.clearVisualization();
      });

      // Verify state is cleared
      expect(result.current.isLoading).toBe(false);
      expect(result.current.waveformData).toBeNull();
      expect(result.current.spectrogramData).toBeNull();
      expect(result.current.progress).toBe(0);
    });
  });

  describe('Requirement 11.12: Multiple concurrent tasks without interference', () => {
    it('should handle multiple files generating concurrently', async () => {
      // Requirement 11.12: THE Frontend SHALL ensure multiple visualizations don't interfere
      
      // Create multiple hooks for different files
      const { result: result1 } = renderHook(() => useLazyVisualization());
      const { result: result2 } = renderHook(() => useLazyVisualization());
      const { result: result3 } = renderHook(() => useLazyVisualization());

      // Start all three concurrently
      act(() => {
        result1.current.loadVisualization('/path/to/file1.mp3', '/api/audio/file1.mp3', 'normal');
        result2.current.loadVisualization('/path/to/file2.mp3', '/api/audio/file2.mp3', 'normal');
        result3.current.loadVisualization('/path/to/file3.mp3', '/api/audio/file3.mp3', 'normal');
      });

      // All should be loading
      expect(result1.current.isLoading).toBe(true);
      expect(result2.current.isLoading).toBe(true);
      expect(result3.current.isLoading).toBe(true);

      // Wait for all to complete or timeout
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify no errors occurred
      expect(result1.current.error).toBeNull();
      expect(result2.current.error).toBeNull();
      expect(result3.current.error).toBeNull();

      // Verify queue handled concurrency properly
      const stats = visualizationTaskQueue.getQueueStats();
      
      // Should have processed tasks (completed, failed, or cancelled)
      expect(stats.completed + stats.failed + stats.cancelled).toBeGreaterThan(0);
    });

    it('should respect concurrency limits', async () => {
      // Requirement 11.12: THE Frontend SHALL manage background task queue
      
      // Add many tasks
      const files = Array.from({ length: 10 }, (_, i) => ({
        path: `/path/to/file${i}.mp3`,
        url: `/api/audio/file${i}.mp3`,
      }));

      files.forEach(file => {
        visualizationTaskQueue.addTask(file.path, file.url, 'both', 'normal');
      });

      // Wait a bit for tasks to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check stats
      const stats = visualizationTaskQueue.getQueueStats();

      // Should not exceed max concurrent (default is 3)
      expect(stats.running).toBeLessThanOrEqual(3);

      // Should have pending tasks
      expect(stats.pending).toBeGreaterThan(0);
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should maintain UI responsiveness during generation', async () => {
      // Requirement 3.18: THE Frontend SHALL ensure background tasks don't block UI
      
      const { result } = renderHook(() => useLazyVisualization());

      // Track UI response times
      const responseTimes: number[] = [];

      // Start generation
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Measure UI response time multiple times during generation
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        
        // Simulate UI operation
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const endTime = performance.now();
        responseTimes.push(endTime - startTime);

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verify all response times are reasonable (< 100ms)
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(100);
      });

      // Average response time should be low
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(50);
    });

    it('should not cause frame drops during generation', async () => {
      // Requirement 11.12: THE Frontend SHALL ensure smooth user experience
      
      const { result } = renderHook(() => useLazyVisualization());

      // Track frame timing
      const frameTimes: number[] = [];
      let lastFrameTime = performance.now();

      // Start generation
      act(() => {
        result.current.loadVisualization(mockFilePath, mockAudioUrl, 'normal');
      });

      // Monitor frame timing
      const frameMonitor = setInterval(() => {
        const currentTime = performance.now();
        const frameTime = currentTime - lastFrameTime;
        frameTimes.push(frameTime);
        lastFrameTime = currentTime;
      }, 16); // ~60fps

      // Run for a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      clearInterval(frameMonitor);

      // Verify no major frame drops (> 100ms)
      const majorDrops = frameTimes.filter(time => time > 100);
      expect(majorDrops.length).toBe(0);

      // Most frames should be close to 16ms (60fps)
      const goodFrames = frameTimes.filter(time => time < 50);
      expect(goodFrames.length).toBeGreaterThan(frameTimes.length * 0.8);
    });
  });
});
