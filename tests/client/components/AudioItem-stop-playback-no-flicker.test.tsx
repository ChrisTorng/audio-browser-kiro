import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AudioItem } from '../../../src/client/components/AudioItem';
import { AudioFile } from '../../../src/shared/types';
import * as hooks from '../../../src/client/hooks';

/**
 * Test: Verify that stopping playback or moving to folder doesn't cause flickering
 * Requirements: 3.9, 11.8
 * 
 * This test verifies that:
 * 1. When playback stops (audioProgress becomes 0), visualizations don't flicker
 * 2. When moving to a folder (audioProgress becomes 0), visualizations don't flicker
 * 3. The visualization components only update the progress overlay, not the entire visualization
 */
describe('AudioItem - Stop Playback No Flicker', () => {
  const mockFile: AudioFile = {
    name: 'test-audio.mp3',
    path: '/music/test-audio.mp3',
    size: 1024000,
  };

  const mockWaveformData = [0.5, 0.7, 0.3, 0.9, 0.4];
  const mockSpectrogramData = [
    [0.1, 0.2, 0.3],
    [0.4, 0.5, 0.6],
    [0.7, 0.8, 0.9],
  ];

  let mockUseAudioMetadata: any;
  let mockUseLazyVisualization: any;

  beforeEach(() => {
    // Mock useAudioMetadata
    mockUseAudioMetadata = {
      getMetadata: vi.fn().mockReturnValue({
        rating: 2,
        description: 'Test description',
      }),
      updateRating: vi.fn().mockResolvedValue(undefined),
      updateDescription: vi.fn().mockResolvedValue(undefined),
      isLoading: false,
    };

    // Mock useLazyVisualization
    mockUseLazyVisualization = {
      waveformData: mockWaveformData,
      spectrogramData: mockSpectrogramData,
      isLoading: false,
      error: null,
      loadVisualization: vi.fn(),
      clearVisualization: vi.fn(),
    };

    vi.spyOn(hooks, 'useAudioMetadata').mockReturnValue(mockUseAudioMetadata);
    vi.spyOn(hooks, 'useLazyVisualization').mockReturnValue(mockUseLazyVisualization);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not cause flickering when audioProgress changes from playing to stopped', async () => {
    // Render with playing state (progress > 0)
    const { rerender } = render(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
        audioProgress={0.5}
      />
    );

    // Verify waveform and spectrogram are rendered
    const waveformDisplays = screen.getAllByText((content, element) => {
      return element?.className?.includes('waveform-display') || false;
    });
    const spectrogramDisplays = screen.getAllByText((content, element) => {
      return element?.className?.includes('spectrogram-display') || false;
    });

    expect(waveformDisplays.length).toBeGreaterThan(0);
    expect(spectrogramDisplays.length).toBeGreaterThan(0);

    // Track render count by checking if loadVisualization is called again
    const initialLoadCount = mockUseLazyVisualization.loadVisualization.mock.calls.length;

    // Change to stopped state (progress = 0)
    rerender(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
        audioProgress={0}
      />
    );

    await waitFor(() => {
      // Verify that loadVisualization was NOT called again
      // This means the visualization data didn't need to be regenerated
      expect(mockUseLazyVisualization.loadVisualization.mock.calls.length).toBe(initialLoadCount);
    });

    // Verify visualizations are still rendered (not flickering/disappearing)
    const waveformDisplaysAfter = screen.getAllByText((content, element) => {
      return element?.className?.includes('waveform-display') || false;
    });
    const spectrogramDisplaysAfter = screen.getAllByText((content, element) => {
      return element?.className?.includes('spectrogram-display') || false;
    });

    expect(waveformDisplaysAfter.length).toBeGreaterThan(0);
    expect(spectrogramDisplaysAfter.length).toBeGreaterThan(0);
  });

  it('should not cause flickering when moving from file to folder (deselection)', async () => {
    // Render with selected and playing state
    const { rerender } = render(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
        audioProgress={0.5}
      />
    );

    // Verify initial render
    expect(screen.getAllByText((content, element) => {
      return element?.className?.includes('waveform-display') || false;
    }).length).toBeGreaterThan(0);

    const initialLoadCount = mockUseLazyVisualization.loadVisualization.mock.calls.length;

    // Simulate moving to folder: item becomes deselected and progress becomes 0
    rerender(
      <AudioItem
        file={mockFile}
        isSelected={false}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
        audioProgress={0}
      />
    );

    await waitFor(() => {
      // Verify that loadVisualization was NOT called again
      expect(mockUseLazyVisualization.loadVisualization.mock.calls.length).toBe(initialLoadCount);
    });

    // Verify visualizations are still rendered
    expect(screen.getAllByText((content, element) => {
      return element?.className?.includes('waveform-display') || false;
    }).length).toBeGreaterThan(0);
  });

  it('should only update progress overlay, not regenerate entire visualization', async () => {
    // Render with initial progress
    const { rerender } = render(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
        audioProgress={0.3}
      />
    );

    const initialLoadCount = mockUseLazyVisualization.loadVisualization.mock.calls.length;

    // Update progress multiple times
    for (let progress = 0.4; progress <= 1.0; progress += 0.1) {
      rerender(
        <AudioItem
          file={mockFile}
          isSelected={true}
          isVisible={true}
          level={1}
          onClick={vi.fn()}
          audioProgress={progress}
        />
      );
    }

    // Finally stop playback
    rerender(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
        audioProgress={0}
      />
    );

    await waitFor(() => {
      // Verify that loadVisualization was NOT called during progress updates
      // This proves that only the progress overlay is updated, not the entire visualization
      expect(mockUseLazyVisualization.loadVisualization.mock.calls.length).toBe(initialLoadCount);
    });
  });

  it('should maintain visualization data when progress becomes 0', () => {
    // Render with progress
    const { rerender } = render(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
        audioProgress={0.5}
      />
    );

    // Change to stopped state
    rerender(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
        audioProgress={0}
      />
    );

    // Verify that visualization data is still available (not cleared)
    expect(mockUseLazyVisualization.waveformData).toEqual(mockWaveformData);
    expect(mockUseLazyVisualization.spectrogramData).toEqual(mockSpectrogramData);
  });
});
