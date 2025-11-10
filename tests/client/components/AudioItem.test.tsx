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

// Mock hooks
const mockLoadVisualization = vi.fn();
const mockClearVisualization = vi.fn();

vi.mock('../../../src/client/hooks', () => ({
  useAudioMetadata: vi.fn(() => ({
    getMetadata: vi.fn(() => ({ rating: 2, description: 'Test description' })),
    updateRating: vi.fn(),
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
    loadVisualization: mockLoadVisualization,
    clearVisualization: mockClearVisualization,
  })),
}));

describe('AudioItem', () => {
  const mockFile: AudioFile = {
    name: 'test-song.mp3',
    path: '/music/test-song.mp3',
    size: 5242880,
  };

  const defaultProps = {
    file: mockFile,
    isSelected: false,
    isVisible: true,
    level: 1,
    filterText: '',
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadVisualization.mockClear();
    mockClearVisualization.mockClear();
    mockDecodeAudioData.mockClear();
  });

  it('renders audio file information', () => {
    render(<AudioItem {...defaultProps} />);

    expect(screen.getByText('test-song.mp3')).toBeInTheDocument();
  });

  it('applies selected class when isSelected is true', () => {
    const { container } = render(<AudioItem {...defaultProps} isSelected={true} />);

    const audioItem = container.querySelector('.audio-item');
    expect(audioItem).toHaveClass('audio-item--selected');
  });

  it('applies correct padding based on level', () => {
    const { container } = render(<AudioItem {...defaultProps} level={2} />);

    const audioItem = container.querySelector('.audio-item');
    expect(audioItem).toHaveStyle({ paddingLeft: '40px' });
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<AudioItem {...defaultProps} onClick={onClick} />);

    const audioItem = screen.getByText('test-song.mp3').closest('.audio-item');
    fireEvent.click(audioItem!);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('highlights filename when filterText matches', () => {
    const { container } = render(<AudioItem {...defaultProps} filterText="test" />);

    const highlight = container.querySelector('.audio-item__filename mark');
    expect(highlight).toBeInTheDocument();
    expect(highlight?.textContent).toBe('test');
  });

  it('renders StarRating component', () => {
    const { container } = render(<AudioItem {...defaultProps} />);

    const starRating = container.querySelector('.star-rating');
    expect(starRating).toBeInTheDocument();
  });

  it('renders WaveformDisplay component', () => {
    const { container } = render(<AudioItem {...defaultProps} />);

    const waveform = container.querySelector('.waveform-display');
    expect(waveform).toBeInTheDocument();
  });

  it('renders SpectrogramDisplay component', () => {
    const { container } = render(<AudioItem {...defaultProps} />);

    const spectrogram = container.querySelector('.spectrogram-display');
    expect(spectrogram).toBeInTheDocument();
  });

  it('renders DescriptionField component', () => {
    const { container } = render(<AudioItem {...defaultProps} />);

    const description = container.querySelector('.description-field');
    expect(description).toBeInTheDocument();
  });

  it('loads audio and generates visualizations when visible', async () => {
    const { rerender } = render(<AudioItem {...defaultProps} isVisible={false} />);

    // Initially not visible, should not load
    expect(mockLoadVisualization).not.toHaveBeenCalled();

    // Make item visible
    rerender(<AudioItem {...defaultProps} isVisible={true} />);

    // Wait for async operations
    await waitFor(() => {
      expect(mockLoadVisualization).toHaveBeenCalledTimes(1);
    });

    // Verify correct parameters (filePath and audioUrl)
    expect(mockLoadVisualization).toHaveBeenCalledWith(
      mockFile.path,
      `/api/audio/${encodeURIComponent(mockFile.path)}`
    );
  });

  it('clears visualization when not visible', async () => {
    const { rerender } = render(<AudioItem {...defaultProps} isVisible={true} />);

    await waitFor(() => {
      expect(mockLoadVisualization).toHaveBeenCalledTimes(1);
    });

    // Make item not visible
    rerender(<AudioItem {...defaultProps} isVisible={false} />);

    // Should clear visualization
    await waitFor(() => {
      expect(mockClearVisualization).toHaveBeenCalled();
    });
  });

  it('resets loaded state when file changes', async () => {
    const { rerender } = render(<AudioItem {...defaultProps} isVisible={true} />);

    await waitFor(() => {
      expect(mockLoadVisualization).toHaveBeenCalledTimes(1);
    });

    // Change file and make not visible first
    const newFile: AudioFile = {
      name: 'new-song.mp3',
      path: '/music/new-song.mp3',
      size: 3145728,
    };

    rerender(<AudioItem {...defaultProps} file={newFile} isVisible={false} />);

    // Make visible to trigger load
    rerender(<AudioItem {...defaultProps} file={newFile} isVisible={true} />);

    // Should load new file
    await waitFor(() => {
      expect(mockLoadVisualization).toHaveBeenCalledTimes(2);
    });

    // Verify it loaded the new file
    expect(mockLoadVisualization).toHaveBeenLastCalledWith(
      newFile.path,
      `/api/audio/${encodeURIComponent(newFile.path)}`
    );
  });
});
