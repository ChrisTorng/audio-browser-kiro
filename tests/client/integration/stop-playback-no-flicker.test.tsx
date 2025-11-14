import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioBrowser } from '../../../src/client/components/AudioBrowser';
import { audioBrowserAPI } from '../../../src/client/services/api';
import { DirectoryTree } from '../../../src/shared/types';
import { ToastProvider } from '../../../src/client/contexts/ToastContext';

/**
 * Integration Test: Verify no flickering when stopping playback or moving to folders
 * Requirements: 3.9, 11.8, 4.12
 * 
 * This test verifies the complete user flow:
 * 1. Press space to stop playback - visualizations should not flicker
 * 2. Move from file to folder - visualizations should not flicker
 * 3. Only progress overlay updates, not entire visualization
 */
describe('Stop Playback No Flicker - Integration', () => {
  const mockTree: DirectoryTree = {
    name: 'music',
    path: '/music',
    files: [
      {
        name: 'song1.mp3',
        path: '/music/song1.mp3',
        size: 1024000,
      },
    ],
    subdirectories: [
      {
        name: 'album',
        path: '/music/album',
        files: [
          {
            name: 'track1.mp3',
            path: '/music/album/track1.mp3',
            size: 2048000,
          },
        ],
        subdirectories: [],
        totalFileCount: 1,
      },
    ],
    totalFileCount: 2,
  };

  beforeEach(() => {
    // Mock API calls
    vi.spyOn(audioBrowserAPI, 'getTree').mockResolvedValue(mockTree);
    vi.spyOn(audioBrowserAPI, 'getAllMetadata').mockResolvedValue({});
    vi.spyOn(audioBrowserAPI, 'updateMetadata').mockResolvedValue({
      rating: 0,
      description: '',
      updatedAt: new Date().toISOString(),
    });

    // Mock Audio API
    global.Audio = vi.fn().mockImplementation(() => ({
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      currentTime: 0,
      duration: 100,
      loop: false,
      src: '',
    })) as any;

    // Mock canvas for visualization
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not flicker when pressing space to stop playback', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <AudioBrowser />
      </ToastProvider>
    );

    // Wait for tree to load
    await waitFor(() => {
      expect(screen.queryByText('Loading audio directory...')).not.toBeInTheDocument();
    });

    // Find and click on a file to start playing
    const fileItem = await screen.findByText('song1.mp3');
    await user.click(fileItem);

    // Wait for playback to start
    await waitFor(() => {
      // Verify file is selected (has selected class)
      const audioItem = fileItem.closest('.audio-item');
      expect(audioItem).toHaveClass('audio-item--selected');
    });

    // Track canvas operations before stopping
    const canvasContext = HTMLCanvasElement.prototype.getContext('2d');
    const clearRectCallsBefore = (canvasContext?.clearRect as any).mock.calls.length;

    // Press space to stop playback
    await user.keyboard(' ');

    // Wait a bit to ensure any re-renders would have happened
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that clearRect was called (to clear progress overlay)
    // but not excessively (which would indicate flickering)
    const clearRectCallsAfter = (canvasContext?.clearRect as any).mock.calls.length;
    const clearRectDiff = clearRectCallsAfter - clearRectCallsBefore;

    // Should have cleared progress overlay (2 canvases: waveform + spectrogram)
    // but not regenerated entire visualization
    expect(clearRectDiff).toBeLessThanOrEqual(4); // Allow some tolerance
  });

  it('should not flicker when moving from file to folder', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <AudioBrowser />
      </ToastProvider>
    );

    // Wait for tree to load
    await waitFor(() => {
      expect(screen.queryByText('Loading audio directory...')).not.toBeInTheDocument();
    });

    // Expand the album folder first
    const albumFolder = await screen.findByText('album');
    await user.click(albumFolder);

    // Wait for folder to expand
    await waitFor(() => {
      expect(screen.getByText('track1.mp3')).toBeInTheDocument();
    });

    // Click on the track to start playing
    const trackItem = screen.getByText('track1.mp3');
    await user.click(trackItem);

    // Wait for playback to start
    await waitFor(() => {
      const audioItem = trackItem.closest('.audio-item');
      expect(audioItem).toHaveClass('audio-item--selected');
    });

    // Track canvas operations before moving to folder
    const canvasContext = HTMLCanvasElement.prototype.getContext('2d');
    const clearRectCallsBefore = (canvasContext?.clearRect as any).mock.calls.length;

    // Press up arrow to move to folder
    await user.keyboard('{ArrowUp}');

    // Wait a bit to ensure any re-renders would have happened
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that clearRect was called to clear progress overlay
    // but not excessively (which would indicate flickering)
    const clearRectCallsAfter = (canvasContext?.clearRect as any).mock.calls.length;
    const clearRectDiff = clearRectCallsAfter - clearRectCallsBefore;

    // Should have cleared progress overlay but not regenerated visualization
    expect(clearRectDiff).toBeLessThanOrEqual(4); // Allow some tolerance
  });

  it('should maintain visualization data after stopping playback', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <AudioBrowser />
      </ToastProvider>
    );

    // Wait for tree to load
    await waitFor(() => {
      expect(screen.queryByText('Loading audio directory...')).not.toBeInTheDocument();
    });

    // Click on a file to start playing
    const fileItem = await screen.findByText('song1.mp3');
    await user.click(fileItem);

    // Wait for playback to start
    await waitFor(() => {
      const audioItem = fileItem.closest('.audio-item');
      expect(audioItem).toHaveClass('audio-item--selected');
    });

    // Verify visualizations are present
    const waveformDisplays = screen.getAllByText((content, element) => {
      return element?.className?.includes('waveform-display') || false;
    });
    expect(waveformDisplays.length).toBeGreaterThan(0);

    // Press space to stop playback
    await user.keyboard(' ');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify visualizations are still present (not removed)
    const waveformDisplaysAfter = screen.getAllByText((content, element) => {
      return element?.className?.includes('waveform-display') || false;
    });
    expect(waveformDisplaysAfter.length).toBeGreaterThan(0);
  });

  it('should stop playback when moving from file to folder with arrow keys', async () => {
    const user = userEvent.setup();

    // Create a mock audio element to track play/pause calls
    const mockAudioElement = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      currentTime: 0,
      duration: 100,
      loop: false,
      src: '',
    };

    global.Audio = vi.fn().mockImplementation(() => mockAudioElement) as any;

    render(
      <ToastProvider>
        <AudioBrowser />
      </ToastProvider>
    );

    // Wait for tree to load
    await waitFor(() => {
      expect(screen.queryByText('Loading audio directory...')).not.toBeInTheDocument();
    });

    // Click on a file to start playing
    const fileItem = await screen.findByText('song1.mp3');
    await user.click(fileItem);

    // Wait for playback to start
    await waitFor(() => {
      expect(mockAudioElement.play).toHaveBeenCalled();
    });

    // Reset mock to track subsequent calls
    mockAudioElement.pause.mockClear();

    // Press up arrow to move to folder (root folder)
    await user.keyboard('{ArrowUp}');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that pause was called (playback stopped)
    await waitFor(() => {
      expect(mockAudioElement.pause).toHaveBeenCalled();
    });
  });
});
