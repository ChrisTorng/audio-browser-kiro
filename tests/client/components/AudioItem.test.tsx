import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioItem } from '../../../src/client/components/AudioItem';
import { AudioMetadataProvider } from '../../../src/client/contexts/AudioMetadataContext';
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
    getWaveform: vi.fn(() => Promise.resolve(createMockBlob())),
    getSpectrogram: vi.fn(() => Promise.resolve(createMockBlob())),
  },
}));

// Mock hooks
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
  useWaveform: vi.fn(() => ({
    imageUrl: null,
    isLoading: false,
    error: null,
  })),
  useSpectrogram: vi.fn(() => ({
    imageUrl: null,
    isLoading: false,
    error: null,
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
  });

  // Helper function to render with AudioMetadataProvider
  const renderWithProvider = (ui: React.ReactElement) => {
    return render(<AudioMetadataProvider>{ui}</AudioMetadataProvider>);
  };

  it('renders audio file information', () => {
    renderWithProvider(<AudioItem {...defaultProps} />);

    expect(screen.getByText('test-song.mp3')).toBeInTheDocument();
  });

  it('applies selected class when isSelected is true', () => {
    const { container } = renderWithProvider(<AudioItem {...defaultProps} isSelected={true} />);

    const audioItem = container.querySelector('.audio-item');
    expect(audioItem).toHaveClass('audio-item--selected');
  });

  it('applies correct padding based on level', () => {
    const { container } = renderWithProvider(<AudioItem {...defaultProps} level={2} />);

    const audioItem = container.querySelector('.audio-item');
    expect(audioItem).toHaveStyle({ paddingLeft: '40px' });
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    renderWithProvider(<AudioItem {...defaultProps} onClick={onClick} />);

    const audioItem = screen.getByText('test-song.mp3').closest('.audio-item');
    fireEvent.click(audioItem!);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('highlights filename when filterText matches', () => {
    const { container} = renderWithProvider(<AudioItem {...defaultProps} filterText="test" />);

    const highlight = container.querySelector('.audio-item__filename mark');
    expect(highlight).toBeInTheDocument();
    expect(highlight?.textContent).toBe('test');
  });

  it('renders StarRating component', () => {
    const { container } = renderWithProvider(<AudioItem {...defaultProps} />);

    const starRating = container.querySelector('.star-rating');
    expect(starRating).toBeInTheDocument();
  });

  it('renders WaveformDisplay component', () => {
    const { container } = renderWithProvider(<AudioItem {...defaultProps} />);

    const waveform = container.querySelector('.waveform-display');
    expect(waveform).toBeInTheDocument();
  });

  it('renders SpectrogramDisplay component', () => {
    const { container } = renderWithProvider(<AudioItem {...defaultProps} />);

    const spectrogram = container.querySelector('.spectrogram-display');
    expect(spectrogram).toBeInTheDocument();
  });

  it('renders DescriptionField component', () => {
    const { container } = renderWithProvider(<AudioItem {...defaultProps} />);

    const description = container.querySelector('.description-field');
    expect(description).toBeInTheDocument();
  });

  // Note: Visualization loading tests removed due to architecture change
  // Visualizations are now loaded via server-side API instead of client-side generation
});
