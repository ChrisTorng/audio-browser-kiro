import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('AudioItem - Selection Interaction', () => {
  const mockFile: AudioFile = {
    name: 'test-song.mp3',
    path: '/music/test-song.mp3',
    size: 5242880,
  };

  const mockUpdateRating = vi.fn();
  const mockUpdateDescription = vi.fn();
  const mockGetMetadata = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateRating.mockClear();
    mockUpdateDescription.mockClear();
    mockGetMetadata.mockClear();

    // Reset mock implementations
    mockGetMetadata.mockReturnValue({
      rating: 2,
      description: 'Test description',
    });

    // Mock hooks
    vi.doMock('../../../src/client/hooks', () => ({
      useAudioMetadata: vi.fn(() => ({
        getMetadata: mockGetMetadata,
        updateRating: mockUpdateRating,
        updateDescription: mockUpdateDescription,
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

  describe('when item is selected', () => {
    it('allows rating change when clicking star', () => {
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
      fireEvent.click(stars[2]); // Click third star

      expect(mockUpdateRating).toHaveBeenCalledWith(mockFile.path, 3);
    });

    it('allows description edit when clicking description field', async () => {
      render(
        <AudioItem
          file={mockFile}
          isSelected={true}
          isVisible={true}
          level={1}
          onClick={vi.fn()}
        />
      );

      const descriptionField = screen
        .getByText('Test description')
        .closest('.description-field');
      fireEvent.click(descriptionField!);

      // Should enter edit mode
      const input = await screen.findByDisplayValue('Test description');
      expect(input).toBeInTheDocument();
    });

    it('does not propagate click event when clicking star', () => {
      const onClick = vi.fn();
      const { container } = render(
        <AudioItem
          file={mockFile}
          isSelected={true}
          isVisible={true}
          level={1}
          onClick={onClick}
        />
      );

      const stars = container.querySelectorAll('.star-rating__star');
      fireEvent.click(stars[0]);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not propagate click event when clicking description', () => {
      const onClick = vi.fn();
      render(
        <AudioItem
          file={mockFile}
          isSelected={true}
          isVisible={true}
          level={1}
          onClick={onClick}
        />
      );

      const descriptionField = screen
        .getByText('Test description')
        .closest('.description-field');
      fireEvent.click(descriptionField!);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('when item is not selected', () => {
    it('does not allow rating change when clicking star', () => {
      const { container } = render(
        <AudioItem
          file={mockFile}
          isSelected={false}
          isVisible={true}
          level={1}
          onClick={vi.fn()}
        />
      );

      const stars = container.querySelectorAll('.star-rating__star');
      fireEvent.click(stars[2]); // Click third star

      expect(mockUpdateRating).not.toHaveBeenCalled();
    });

    it('does not allow description edit when clicking description field', () => {
      render(
        <AudioItem
          file={mockFile}
          isSelected={false}
          isVisible={true}
          level={1}
          onClick={vi.fn()}
        />
      );

      const descriptionField = screen
        .getByText('Test description')
        .closest('.description-field');
      fireEvent.click(descriptionField!);

      // Should not enter edit mode
      expect(screen.queryByDisplayValue('Test description')).not.toBeInTheDocument();
    });

    it('propagates click event to parent when clicking star', () => {
      const onClick = vi.fn();
      const { container } = render(
        <AudioItem
          file={mockFile}
          isSelected={false}
          isVisible={true}
          level={1}
          onClick={onClick}
        />
      );

      const stars = container.querySelectorAll('.star-rating__star');
      fireEvent.click(stars[0]);

      expect(onClick).toHaveBeenCalled();
    });

    it('propagates click event to parent when clicking description', () => {
      const onClick = vi.fn();
      render(
        <AudioItem
          file={mockFile}
          isSelected={false}
          isVisible={true}
          level={1}
          onClick={onClick}
        />
      );

      const descriptionField = screen
        .getByText('Test description')
        .closest('.description-field');
      fireEvent.click(descriptionField!);

      expect(onClick).toHaveBeenCalled();
    });

    it('applies disabled class to star rating', () => {
      const { container } = render(
        <AudioItem
          file={mockFile}
          isSelected={false}
          isVisible={true}
          level={1}
          onClick={vi.fn()}
        />
      );

      const starRating = container.querySelector('.star-rating');
      expect(starRating).toHaveClass('star-rating--disabled');
    });

    it('applies disabled class to description field', () => {
      const { container } = render(
        <AudioItem
          file={mockFile}
          isSelected={false}
          isVisible={true}
          level={1}
          onClick={vi.fn()}
        />
      );

      const descriptionField = container.querySelector('.description-field');
      expect(descriptionField).toHaveClass('description-field--disabled');
    });
  });
});
