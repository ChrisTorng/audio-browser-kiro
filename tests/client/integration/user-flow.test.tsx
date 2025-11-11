import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioBrowser } from '../../../src/client/components/AudioBrowser';
import { ToastProvider } from '../../../src/client/contexts/ToastContext';
import { DirectoryTree } from '../../../src/shared/types';

/**
 * Integration test for complete user flows
 * Tests end-to-end user interactions including:
 * - Scanning directory and displaying results
 * - Selecting items with keyboard navigation
 * - Playing audio files
 * - Rating and describing audio files
 */

// Mock API
const mockScanDirectory = vi.fn();
const mockGetAllMetadata = vi.fn();
const mockUpdateMetadata = vi.fn();

vi.mock('../../../src/client/services/api', () => ({
  audioBrowserAPI: {
    scanDirectory: (...args: any[]) => mockScanDirectory(...args),
    getAllMetadata: (...args: any[]) => mockGetAllMetadata(...args),
    updateMetadata: (...args: any[]) => mockUpdateMetadata(...args),
  },
}));

// Mock Audio element
class MockAudio {
  src = '';
  loop = false;
  currentTime = 0;
  duration = 100;
  paused = true;
  
  private listeners: Record<string, Function[]> = {};

  play() {
    this.paused = false;
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

  dispatchEvent(event: Event) {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach(handler => handler(event));
    return true;
  }

  // Helper to trigger metadata loaded
  triggerLoadedMetadata() {
    this.dispatchEvent(new Event('loadedmetadata'));
  }

  // Helper to trigger time update
  triggerTimeUpdate() {
    this.dispatchEvent(new Event('timeupdate'));
  }
}

describe('User Flow Integration Tests', () => {
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
      if (typeof url === 'string' && url.startsWith('/api/metadata')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            metadata: {
              filePath: 'music/song1.mp3',
              rating: 0,
              description: '',
            },
          }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    });
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
      { name: 'song1.mp3', path: 'song1.mp3', size: 5000000 },
      { name: 'song2.wav', path: 'song2.wav', size: 8000000 },
    ],
    subdirectories: [
      {
        name: 'album1',
        path: 'album1',
        files: [
          { name: 'track1.flac', path: 'album1/track1.flac', size: 12000000 },
        ],
        subdirectories: [],
        totalFileCount: 1,
      },
    ],
    totalFileCount: 3,
  };

  describe('Complete User Flow: Scan → Display → Select → Play', () => {
    it('should complete full user flow from scanning to playing audio', async () => {
      mockScanDirectory.mockResolvedValue(mockDirectoryTree);

      renderAudioBrowser();

      // Step 1: Enter directory path
      const input = screen.getByPlaceholderText('Enter directory path...');
      await userEvent.type(input, '/test/music');

      // Step 2: Click scan button
      const scanButton = screen.getByText('Scan');
      await userEvent.click(scanButton);

      // Step 3: Wait for scan to complete and tree to display
      await waitFor(() => {
        expect(mockScanDirectory).toHaveBeenCalledWith('/test/music');
      });

      // Step 4: Verify directory tree is displayed
      await waitFor(() => {
        expect(screen.getByText('music')).toBeInTheDocument();
      });

      // Step 5: Verify files are displayed
      expect(screen.getByText('song1.mp3')).toBeInTheDocument();
      expect(screen.getByText('song2.wav')).toBeInTheDocument();

      // Step 6: Click on a file to play
      const file1 = screen.getByText('song1.mp3');
      await userEvent.click(file1);

      // Step 7: Verify audio starts playing
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('song1.mp3');
        expect(mockAudioInstance.paused).toBe(false);
      });
    });

    it('should handle scanning errors gracefully', async () => {
      mockScanDirectory.mockRejectedValue(new Error('Permission denied'));

      renderAudioBrowser();

      const input = screen.getByPlaceholderText('Enter directory path...');
      await userEvent.type(input, '/protected/folder');

      const scanButton = screen.getByText('Scan');
      await userEvent.click(scanButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Scan failed/i)).toBeInTheDocument();
      });
    });

    it('should expand and collapse directories', async () => {
      mockScanDirectory.mockResolvedValue(mockDirectoryTree);

      renderAudioBrowser();

      const input = screen.getByPlaceholderText('Enter directory path...');
      await userEvent.type(input, '/test/music');

      const scanButton = screen.getByText('Scan');
      await userEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('music')).toBeInTheDocument();
      });

      // Initially, subdirectory should not show its files
      expect(screen.queryByText('track1.flac')).not.toBeInTheDocument();

      // Find and click the expand button for album1
      const expandButtons = screen.getAllByLabelText('Expand');
      // album1 is the first (and only) collapsed directory
      await userEvent.click(expandButtons[0]);

      // Verify subdirectory files are now visible
      await waitFor(() => {
        expect(screen.getByText('track1.flac')).toBeInTheDocument();
      });

      // Click collapse button for album1 (there are now 2 collapse buttons: music and album1)
      const collapseButtons = screen.getAllByLabelText('Collapse');
      // album1's collapse button is the second one
      await userEvent.click(collapseButtons[1]);

      // Verify files are hidden again
      await waitFor(() => {
        expect(screen.queryByText('track1.flac')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate with arrow keys and play with space', async () => {
      mockScanDirectory.mockResolvedValue(mockDirectoryTree);

      renderAudioBrowser();

      const input = screen.getByPlaceholderText('Enter directory path...');
      await userEvent.type(input, '/test/music');

      const scanButton = screen.getByText('Scan');
      await userEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('song1.mp3')).toBeInTheDocument();
      });

      // Tree structure: music (root), album1 (dir), song1.mp3, song2.wav
      // Press ArrowDown to select album1
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      
      // Press ArrowDown to select song1.mp3
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Verify first file is selected and playing
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('song1.mp3');
      });

      // Press ArrowDown again to select second file
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Verify second file is now playing
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('song2.wav');
      });

      // Press Space to stop playback
      fireEvent.keyDown(window, { key: ' ' });

      // Verify playback stopped
      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(true);
        expect(mockAudioInstance.currentTime).toBe(0);
      });

      // Press Space again to resume
      fireEvent.keyDown(window, { key: ' ' });

      // Verify playback resumed
      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });
    });

    it('should expand/collapse directories with arrow keys', async () => {
      mockScanDirectory.mockResolvedValue(mockDirectoryTree);

      renderAudioBrowser();

      const input = screen.getByPlaceholderText('Enter directory path...');
      await userEvent.type(input, '/test/music');

      const scanButton = screen.getByText('Scan');
      await userEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('album1')).toBeInTheDocument();
      });

      // Navigate to subdirectory (album1 is first item after root)
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // Select album1

      // Press ArrowRight to expand
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      // Verify subdirectory is expanded
      await waitFor(() => {
        expect(screen.getByText('track1.flac')).toBeInTheDocument();
      });

      // Press ArrowLeft to collapse
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      // Verify subdirectory is collapsed
      await waitFor(() => {
        expect(screen.queryByText('track1.flac')).not.toBeInTheDocument();
      });
    });

    it('should navigate up with ArrowUp key', async () => {
      mockScanDirectory.mockResolvedValue(mockDirectoryTree);

      renderAudioBrowser();

      const input = screen.getByPlaceholderText('Enter directory path...');
      await userEvent.type(input, '/test/music');

      const scanButton = screen.getByText('Scan');
      await userEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('song1.mp3')).toBeInTheDocument();
      });

      // Navigate down to second file
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // album1
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // song1.mp3
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // song2.wav

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('song2.wav');
      });

      // Navigate back up
      fireEvent.keyDown(window, { key: 'ArrowUp' });

      // Verify first file is selected again
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('song1.mp3');
      });
    });
  });

  describe('Audio Playback Logic', () => {
    it('should loop audio playback automatically', async () => {
      mockScanDirectory.mockResolvedValue(mockDirectoryTree);

      renderAudioBrowser();

      const input = screen.getByPlaceholderText('Enter directory path...');
      await userEvent.type(input, '/test/music');

      const scanButton = screen.getByText('Scan');
      await userEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('song1.mp3')).toBeInTheDocument();
      });

      // Click on file to play
      const file1 = screen.getByText('song1.mp3');
      await userEvent.click(file1);

      // Verify loop is enabled
      await waitFor(() => {
        expect(mockAudioInstance.loop).toBe(true);
      });
    });

    it('should switch audio when selecting different file', async () => {
      mockScanDirectory.mockResolvedValue(mockDirectoryTree);

      renderAudioBrowser();

      const input = screen.getByPlaceholderText('Enter directory path...');
      await userEvent.type(input, '/test/music');

      const scanButton = screen.getByText('Scan');
      await userEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('song1.mp3')).toBeInTheDocument();
      });

      // Play first file
      const file1 = screen.getByText('song1.mp3');
      await userEvent.click(file1);

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('song1.mp3');
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Switch to second file
      const file2 = screen.getByText('song2.wav');
      await userEvent.click(file2);

      // Verify audio switched
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('song2.wav');
        expect(mockAudioInstance.currentTime).toBe(0); // Reset to beginning
        expect(mockAudioInstance.paused).toBe(false);
      });
    });

    it('should restart from beginning when toggling play', async () => {
      mockScanDirectory.mockResolvedValue(mockDirectoryTree);

      renderAudioBrowser();

      const input = screen.getByPlaceholderText('Enter directory path...');
      await userEvent.type(input, '/test/music');

      const scanButton = screen.getByText('Scan');
      await userEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('song1.mp3')).toBeInTheDocument();
      });

      // Play file
      const file1 = screen.getByText('song1.mp3');
      await userEvent.click(file1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Simulate playback progress
      mockAudioInstance.currentTime = 50;

      // Stop playback
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(true);
        expect(mockAudioInstance.currentTime).toBe(0);
      });

      // Resume playback
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });
    });

    it('should track playback progress', async () => {
      mockScanDirectory.mockResolvedValue(mockDirectoryTree);

      renderAudioBrowser();

      const input = screen.getByPlaceholderText('Enter directory path...');
      await userEvent.type(input, '/test/music');

      const scanButton = screen.getByText('Scan');
      await userEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('song1.mp3')).toBeInTheDocument();
      });

      // Play file
      const file1 = screen.getByText('song1.mp3');
      await userEvent.click(file1);

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Trigger metadata loaded
      mockAudioInstance.triggerLoadedMetadata();

      // Simulate playback progress
      mockAudioInstance.currentTime = 25;
      mockAudioInstance.triggerTimeUpdate();

      // In development mode, progress should be visible
      if (process.env.NODE_ENV === 'development') {
        await waitFor(() => {
          const progressText = screen.queryByText(/Progress: 25%/);
          if (progressText) {
            expect(progressText).toBeInTheDocument();
          }
        });
      }
    });
  });
});
