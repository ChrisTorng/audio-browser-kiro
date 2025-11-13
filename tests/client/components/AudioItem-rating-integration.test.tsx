import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { AudioItem } from '../../../src/client/components/AudioItem';
import type { AudioFile } from '../../../src/shared/types';

// Create mock blob with arrayBuffer method
const createMockBlob = () => {
  const blob = new Blob(['audio data'], { type: 'audio/mp3' });
  // Add arrayBuffer method if not present (for Node.js environment)
  if (!blob.arrayBuffer) {
    (blob as any).arrayBuffer = () => Promise.resolve(new ArrayBuffer(8));
  }
  return blob;
};

// Mock API
vi.mock('../../../src/client/services/api', () => ({
  audioBrowserAPI: {
    getAudioFile: vi.fn(() => Promise.resolve(createMockBlob())),
  },
}));

// Mock AudioContext
const mockDecodeAudioData = vi.fn(() =>
  Promise.resolve({
    length: 44100,
    sampleRate: 44100,
    numberOfChannels: 2,
    getChannelData: () => new Float32Array(44100),
  })
);

global.AudioContext = vi.fn(() => ({
  decodeAudioData: mockDecodeAudioData,
})) as any;

describe('AudioItem - StarRating Integration', () => {
  const mockFile: AudioFile = {
    name: 'test-song.mp3',
    path: '/music/test-song.mp3',
    size: 5242880,
  };

  const mockUpdateRating = vi.fn();
  const mockGetMetadata = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateRating.mockClear();
    mockGetMetadata.mockClear();

    // Reset mock implementations
    mockGetMetadata.mockReturnValue({
      rating: 0,
      description: '',
    });

    // Mock hooks
    vi.doMock('../../../src/client/hooks', () => ({
      useAudioMetadata: vi.fn(() => ({
        getMetadata: mockGetMetadata,
        updateRating: mockUpdateRating,
        updateDescription: vi.fn(),
      })),
      useAudioPlayer: vi.fn(() => ({
        isPlaying: false,
        progress: 0,
      })),
      useLazyVisualization: vi.fn(() => ({
        waveformData: null,
        spectrogramData: null,
        isLoading: false,
        error: null,
        loadVisualization: vi.fn(),
        clearVisualization: vi.fn(),
      })),
    }));
  });

  it('displays current rating from metadata', () => {
    mockGetMetadata.mockReturnValue({
      rating: 2,
      description: '',
    });

    const { container } = render(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    const filledStars = container.querySelectorAll('.star-rating__star--filled');
    expect(filledStars).toHaveLength(2);
  });

  it('updates rating immediately when star is clicked on selected item', async () => {
    const { container } = render(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    const stars = container.querySelectorAll('.star-rating__star');
    fireEvent.click(stars[0]);

    await waitFor(() => {
      expect(mockUpdateRating).toHaveBeenCalledWith(mockFile.path, 1);
    });
  });

  it('clears rating when clicking the same star again', async () => {
    mockGetMetadata.mockReturnValue({
      rating: 2,
      description: '',
    });

    const { container } = render(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    const stars = container.querySelectorAll('.star-rating__star');
    fireEvent.click(stars[1]); // Click second star (already selected)

    await waitFor(() => {
      expect(mockUpdateRating).toHaveBeenCalledWith(mockFile.path, 0);
    });
  });

  it('updates rating for different stars', async () => {
    const { container } = render(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    const stars = container.querySelectorAll('.star-rating__star');
    
    fireEvent.click(stars[2]);
    await waitFor(() => {
      expect(mockUpdateRating).toHaveBeenCalledWith(mockFile.path, 3);
    });
  });

  it('does not propagate click event when clicking star on selected item', () => {
    const onItemClick = vi.fn();

    const { container } = render(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={onItemClick}
      />
    );

    const stars = container.querySelectorAll('.star-rating__star');
    fireEvent.click(stars[0]);

    // onClick should not be called because event propagation is stopped
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('handles rating update errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateRating.mockRejectedValue(new Error('Network error'));

    const { container } = render(
      <AudioItem
        file={mockFile}
        isSelected={true}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    const stars = container.querySelectorAll('.star-rating__star');
    fireEvent.click(stars[0]);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update rating:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
