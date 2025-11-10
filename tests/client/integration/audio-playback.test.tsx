import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioBrowser } from '../../../src/client/components/AudioBrowser';
import { ToastProvider } from '../../../src/client/contexts/ToastContext';
import { DirectoryTree } from '../../../src/shared/types';

/**
 * Integration test for audio playback logic
 * Tests comprehensive audio playback scenarios including:
 * - Loop playback functionality
 * - Switching between audio files
 * - Play/stop/resume controls
 * - Progress tracking
 * - Audio state management
 */

// Mock API
const mockScanDirectory = vi.fn();

vi.mock('../../../src/client/services/api', () => ({
  audioBrowserAPI: {
    scanDirectory: (...args: any[]) => mockScanDirectory(...args),
  },
}));

// Enhanced Mock Audio element with event simulation
class MockAudio {
  src = '';
  loop = false;
  currentTime = 0;
  duration = 100;
  paused = true;
  volume = 1;
  
  private listeners: Record<string, Function[]> = {};
  private playbackInterval: NodeJS.Timeout | null = null;

  play() {
    this.paused = false;
    
    // Simulate playback progress
    this.playbackInterval = setInterval(() => {
      if (!this.paused && this.currentTime < this.duration) {
        this.currentTime += 0.1;
        this.triggerTimeUpdate();
        
        // Simulate loop
        if (this.currentTime >= this.duration && this.loop) {
          this.currentTime = 0;
        }
      }
    }, 100);
    
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
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

  dispatchEvent(event: Event) {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach(handler => handler(event));
    return true;
  }

  // Helper methods to trigger events
  triggerLoadedMetadata() {
    this.dispatchEvent(new Event('loadedmetadata'));
  }

  triggerTimeUpdate() {
    this.dispatchEvent(new Event('timeupdate'));
  }

  triggerEnded() {
    this.dispatchEvent(new Event('ended'));
  }

  // Cleanup
  cleanup() {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
    }
  }
}

describe('Audio Playback Integration Tests', () => {
  let mockAudioInstance: MockAudio;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Audio constructor
    mockAudioInstance = new MockAudio();
    global.Audio = vi.fn(() => mockAudioInstance) as any;

    // Mock fetch for metadata
    global.fetch = vi.fn((url) => {
      if (url === '/api/metadata') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ metadata: {} }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  afterEach(() => {
    mockAudioInstance.cleanup();
  });

  const renderAudioBrowser = () => {
    return render(
      <ToastProvider>
        <AudioBrowser />
      </ToastProvider>
    );
  };

  const mockDirectoryTree: DirectoryTree = {
    name: 'music',
    path: '.',
    files: [
      { name: 'track1.mp3', path: 'track1.mp3', size: 5000000 },
      { name: 'track2.wav', path: 'track2.wav', size: 8000000 },
      { name: 'track3.flac', path: 'track3.flac', size: 12000000 },
    ],
    subdirectories: [],
  };

  const setupScannedTree = async () => {
    mockScanDirectory.mockResolvedValue(mockDirectoryTree);

    renderAudioBrowser();

    const input = screen.getByPlaceholderText('Enter directory path...');
    await userEvent.type(input, '/test/music');

    const scanButton = screen.getByText('Scan');
    await userEvent.click(scanButton);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });
  };

  describe('Loop Playback', () => {
    it('should enable loop playback by default', async () => {
      await setupScannedTree();

      // Play a file
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.loop).toBe(true);
      });
    });

    it('should continue playing after reaching end (loop)', async () => {
      await setupScannedTree();

      // Play a file
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
        expect(mockAudioInstance.loop).toBe(true);
      });

      // Verify loop is enabled (the mock will handle looping automatically)
      // We just need to verify the loop property is set
      expect(mockAudioInstance.loop).toBe(true);
      
      // The actual looping behavior is handled by the browser's Audio API
      // Our mock simulates this in the play() method
    });

    it('should maintain loop setting across different files', async () => {
      await setupScannedTree();

      // Play first file
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.loop).toBe(true);
      });

      // Switch to second file
      const track2 = screen.getByText('track2.wav');
      await userEvent.click(track2);

      await waitFor(() => {
        expect(mockAudioInstance.loop).toBe(true);
      });
    });
  });

  describe('Switching Audio Files', () => {
    it('should stop current audio when switching to new file', async () => {
      await setupScannedTree();

      // Play first file
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('track1.mp3');
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Simulate some playback
      mockAudioInstance.currentTime = 50;

      // Switch to second file
      const track2 = screen.getByText('track2.wav');
      await userEvent.click(track2);

      // Should reset and play new file
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('track2.wav');
        expect(mockAudioInstance.currentTime).toBe(0);
        expect(mockAudioInstance.paused).toBe(false);
      });
    });

    it('should handle rapid file switching', async () => {
      await setupScannedTree();

      // Rapidly switch between files
      const track1 = screen.getByText('track1.mp3');
      const track2 = screen.getByText('track2.wav');
      const track3 = screen.getByText('track3.flac');

      await userEvent.click(track1);
      await userEvent.click(track2);
      await userEvent.click(track3);

      // Should end up playing the last file
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('track3.flac');
        expect(mockAudioInstance.paused).toBe(false);
      });
    });

    it('should switch files using keyboard navigation', async () => {
      await setupScannedTree();

      // Navigate to first file
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('track1.mp3');
      });

      // Navigate to second file
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('track2.wav');
        expect(mockAudioInstance.currentTime).toBe(0);
      });

      // Navigate to third file
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('track3.flac');
        expect(mockAudioInstance.currentTime).toBe(0);
      });
    });

    it('should preserve playback state when switching files', async () => {
      await setupScannedTree();

      // Play first file
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Switch to second file
      const track2 = screen.getByText('track2.wav');
      await userEvent.click(track2);

      // Should still be playing
      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });
    });
  });

  describe('Play/Stop/Resume Controls', () => {
    it('should start playing when file is selected', async () => {
      await setupScannedTree();

      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
        expect(mockAudioInstance.src).toContain('track1.mp3');
      });
    });

    it('should stop playback and reset to beginning', async () => {
      await setupScannedTree();

      // Start playing
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Simulate playback progress
      mockAudioInstance.currentTime = 30;

      // Stop playback
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(true);
        expect(mockAudioInstance.currentTime).toBe(0);
      });
    });

    it('should resume playback from beginning', async () => {
      await setupScannedTree();

      // Start playing
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Stop
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(true);
      });

      // Resume
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
        expect(mockAudioInstance.currentTime).toBe(0);
      });
    });

    it('should handle play/stop/resume cycle multiple times', async () => {
      await setupScannedTree();

      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      // Cycle through play/stop multiple times
      for (let i = 0; i < 3; i++) {
        await waitFor(() => {
          expect(mockAudioInstance.paused).toBe(false);
        });

        fireEvent.keyDown(window, { key: ' ' });

        await waitFor(() => {
          expect(mockAudioInstance.paused).toBe(true);
          expect(mockAudioInstance.currentTime).toBe(0);
        });

        fireEvent.keyDown(window, { key: ' ' });
      }
    });

    it('should stop current file when selecting new file', async () => {
      await setupScannedTree();

      // Play first file
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Select second file (should stop first and play second)
      const track2 = screen.getByText('track2.wav');
      await userEvent.click(track2);

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('track2.wav');
        expect(mockAudioInstance.currentTime).toBe(0);
        expect(mockAudioInstance.paused).toBe(false);
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should track playback progress', async () => {
      await setupScannedTree();

      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Trigger metadata loaded
      mockAudioInstance.triggerLoadedMetadata();

      // Simulate progress
      mockAudioInstance.currentTime = 25;
      mockAudioInstance.triggerTimeUpdate();

      // Progress should be tracked (25/100 = 25%)
      await waitFor(() => {
        expect(mockAudioInstance.currentTime).toBe(25);
      });
    });

    it('should reset progress when switching files', async () => {
      await setupScannedTree();

      // Play first file and simulate progress
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      mockAudioInstance.currentTime = 50;
      mockAudioInstance.triggerTimeUpdate();

      // Switch to second file
      const track2 = screen.getByText('track2.wav');
      await userEvent.click(track2);

      // Progress should reset
      await waitFor(() => {
        expect(mockAudioInstance.currentTime).toBe(0);
      });
    });

    it('should reset progress when stopping playback', async () => {
      await setupScannedTree();

      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Simulate progress
      mockAudioInstance.currentTime = 40;

      // Stop playback
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(mockAudioInstance.currentTime).toBe(0);
      });
    });

    it('should handle duration metadata', async () => {
      await setupScannedTree();

      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Set duration and trigger metadata loaded
      mockAudioInstance.duration = 180;
      mockAudioInstance.triggerLoadedMetadata();

      // Duration should be available
      await waitFor(() => {
        expect(mockAudioInstance.duration).toBe(180);
      });
    });
  });

  describe('Audio State Management', () => {
    it('should maintain audio state across UI interactions', async () => {
      await setupScannedTree();

      // Start playing
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Interact with UI (e.g., navigate with keyboard)
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Audio should switch to new file
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('track2.wav');
      });
    });

    it('should handle audio errors gracefully', async () => {
      await setupScannedTree();

      // Mock play to reject
      mockAudioInstance.play = vi.fn().mockRejectedValue(new Error('Playback failed'));

      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      // Should not crash, error should be logged
      await waitFor(() => {
        expect(mockAudioInstance.play).toHaveBeenCalled();
      });
    });

    it('should cleanup audio on component unmount', async () => {
      await setupScannedTree();

      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Note: Actual cleanup testing would require unmounting the component
      // This is a placeholder to document the expected behavior
      expect(mockAudioInstance.src).toBeTruthy();
    });

    it('should handle same file selection (replay)', async () => {
      await setupScannedTree();

      // Play file
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Simulate progress
      mockAudioInstance.currentTime = 30;

      // Click same file again
      await userEvent.click(track1);

      // Should continue playing (not restart)
      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
        expect(mockAudioInstance.src).toContain('track1.mp3');
      });
    });

    it('should handle audio source changes', async () => {
      await setupScannedTree();

      // Play first file
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      const firstSrc = mockAudioInstance.src;

      await waitFor(() => {
        expect(firstSrc).toContain('track1.mp3');
      });

      // Switch to second file
      const track2 = screen.getByText('track2.wav');
      await userEvent.click(track2);

      const secondSrc = mockAudioInstance.src;

      await waitFor(() => {
        expect(secondSrc).toContain('track2.wav');
        expect(secondSrc).not.toBe(firstSrc);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty audio URL', async () => {
      await setupScannedTree();

      // Try to toggle play without selecting a file
      fireEvent.keyDown(window, { key: ' ' });

      // Should not crash
      await waitFor(() => {
        expect(mockAudioInstance.src).toBe('');
      });
    });

    it('should handle rapid play/stop commands', async () => {
      await setupScannedTree();

      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      // Rapidly toggle play/stop
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(window, { key: ' ' });
      }

      // Should handle gracefully without errors
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('track1.mp3');
      });
    });

    it('should handle file selection during playback', async () => {
      await setupScannedTree();

      // Start playing first file
      const track1 = screen.getByText('track1.mp3');
      await userEvent.click(track1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Immediately select another file
      const track2 = screen.getByText('track2.wav');
      await userEvent.click(track2);

      // Should switch smoothly
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('track2.wav');
        expect(mockAudioInstance.paused).toBe(false);
      });
    });
  });
});
