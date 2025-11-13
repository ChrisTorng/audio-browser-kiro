import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('AudioItem - DescriptionField Integration', () => {
  const mockFile: AudioFile = {
    name: 'test-song.mp3',
    path: '/music/test-song.mp3',
    size: 5242880,
  };

  const mockUpdateDescription = vi.fn();
  const mockGetMetadata = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateDescription.mockClear();
    mockGetMetadata.mockClear();

    // Reset mock implementations
    mockGetMetadata.mockReturnValue({
      rating: 2,
      description: 'Original description',
    });

    // Mock hooks
    vi.doMock('../../../src/client/hooks', () => ({
      useAudioMetadata: vi.fn(() => ({
        getMetadata: mockGetMetadata,
        updateRating: vi.fn(),
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

  it('displays description from metadata', () => {
    render(
      <AudioItem
        file={mockFile}
        isSelected={false}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Original description')).toBeInTheDocument();
  });

  it('displays placeholder when description is empty', () => {
    mockGetMetadata.mockReturnValue({
      rating: 2,
      description: '',
    });

    render(
      <AudioItem
        file={mockFile}
        isSelected={false}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Add description...')).toBeInTheDocument();
  });

  it('enters edit mode when description is clicked', async () => {
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
      .getByText('Original description')
      .closest('.description-field');
    fireEvent.click(descriptionField!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Original description')).toBeInTheDocument();
    });
  });

  it('saves description changes on Enter key', async () => {
    mockUpdateDescription.mockResolvedValue(undefined);

    render(
      <AudioItem
        file={mockFile}
        isSelected={false}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    // Click to enter edit mode
    const descriptionField = screen
      .getByText('Original description')
      .closest('.description-field');
    fireEvent.click(descriptionField!);

    // Wait for input to appear
    const input = await screen.findByDisplayValue('Original description');

    // Change value
    fireEvent.change(input, { target: { value: 'Updated description' } });

    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });

    // Verify updateDescription was called
    await waitFor(() => {
      expect(mockUpdateDescription).toHaveBeenCalledWith(
        mockFile.path,
        'Updated description'
      );
    });
  });

  it('cancels description edit on Escape key', async () => {
    render(
      <AudioItem
        file={mockFile}
        isSelected={false}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    // Click to enter edit mode
    const descriptionField = screen
      .getByText('Original description')
      .closest('.description-field');
    fireEvent.click(descriptionField!);

    // Wait for input to appear
    const input = await screen.findByDisplayValue('Original description');

    // Change value
    fireEvent.change(input, { target: { value: 'Updated description' } });

    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape' });

    // Verify updateDescription was NOT called
    await waitFor(() => {
      expect(mockUpdateDescription).not.toHaveBeenCalled();
    });

    // Verify original description is still displayed
    expect(screen.getByText('Original description')).toBeInTheDocument();
  });

  it('saves description changes on blur', async () => {
    mockUpdateDescription.mockResolvedValue(undefined);

    render(
      <AudioItem
        file={mockFile}
        isSelected={false}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    // Click to enter edit mode
    const descriptionField = screen
      .getByText('Original description')
      .closest('.description-field');
    fireEvent.click(descriptionField!);

    // Wait for input to appear
    const input = await screen.findByDisplayValue('Original description');

    // Change value
    fireEvent.change(input, { target: { value: 'Updated description' } });

    // Blur input
    fireEvent.blur(input);

    // Verify updateDescription was called
    await waitFor(() => {
      expect(mockUpdateDescription).toHaveBeenCalledWith(
        mockFile.path,
        'Updated description'
      );
    });
  });

  it('does not save description if value unchanged', async () => {
    render(
      <AudioItem
        file={mockFile}
        isSelected={false}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    // Click to enter edit mode
    const descriptionField = screen
      .getByText('Original description')
      .closest('.description-field');
    fireEvent.click(descriptionField!);

    // Wait for input to appear
    const input = await screen.findByDisplayValue('Original description');

    // Blur without changing value
    fireEvent.blur(input);

    // Verify updateDescription was NOT called
    await waitFor(() => {
      expect(mockUpdateDescription).not.toHaveBeenCalled();
    });
  });

  it('highlights description text matching filter', () => {
    const { container } = render(
      <AudioItem
        file={mockFile}
        isSelected={false}
        isVisible={true}
        level={1}
        filterText="Original"
        onClick={vi.fn()}
      />
    );

    const highlight = container.querySelector('.description-field__highlight');
    expect(highlight).toBeInTheDocument();
    expect(highlight?.textContent).toBe('Original');
  });

  it('does not propagate click event when clicking description', () => {
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
      .getByText('Original description')
      .closest('.description-field');
    fireEvent.click(descriptionField!);

    // onClick should not be called because event propagation is stopped
    expect(onClick).not.toHaveBeenCalled();
  });

  it('handles description update errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateDescription.mockRejectedValue(new Error('Network error'));

    render(
      <AudioItem
        file={mockFile}
        isSelected={false}
        isVisible={true}
        level={1}
        onClick={vi.fn()}
      />
    );

    // Click to enter edit mode
    const descriptionField = screen
      .getByText('Original description')
      .closest('.description-field');
    fireEvent.click(descriptionField!);

    // Wait for input to appear
    const input = await screen.findByDisplayValue('Original description');

    // Change value
    fireEvent.change(input, { target: { value: 'Updated description' } });

    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });

    // Verify error was logged
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to update description:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });
});
