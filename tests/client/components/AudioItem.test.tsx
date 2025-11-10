import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioItem } from '../../../src/client/components/AudioItem';
import type { AudioFile } from '../../../src/shared/types';

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
    waveformData: null,
    isLoading: false,
    error: null,
  })),
  useSpectrogram: vi.fn(() => ({
    spectrogramData: null,
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
    level: 1,
    filterText: '',
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
});
