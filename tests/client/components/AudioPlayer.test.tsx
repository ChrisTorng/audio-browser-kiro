import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { AudioPlayer } from '../../../src/client/components/AudioPlayer';
import * as useAudioPlayerModule from '../../../src/client/hooks/useAudioPlayer';
import type { UseAudioPlayerReturn } from '../../../src/client/hooks/useAudioPlayer';

// Mock the useAudioPlayer hook
vi.mock('../../../src/client/hooks/useAudioPlayer');

describe('AudioPlayer', () => {
  let mockPlayer: UseAudioPlayerReturn;

  beforeEach(() => {
    mockPlayer = {
      play: vi.fn(),
      stop: vi.fn(),
      toggle: vi.fn(),
      isPlaying: false,
    };

    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(mockPlayer);
  });

  it('renders without UI (headless component)', () => {
    const { container } = render(<AudioPlayer />);
    expect(container.firstChild).toBeNull();
  });

  it('auto-plays when audioUrl is provided', () => {
    render(<AudioPlayer audioUrl="/test/audio.mp3" autoPlay={true} />);
    
    expect(mockPlayer.play).toHaveBeenCalledWith('/test/audio.mp3');
  });

  it('does not auto-play when autoPlay is false', () => {
    render(<AudioPlayer audioUrl="/test/audio.mp3" autoPlay={false} />);
    
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('calls onPlaybackChange when playback state changes', () => {
    const onPlaybackChange = vi.fn();
    
    const { rerender } = render(
      <AudioPlayer onPlaybackChange={onPlaybackChange} />
    );

    expect(onPlaybackChange).toHaveBeenCalledWith(mockPlayer);

    // Update playing state
    mockPlayer.isPlaying = true;
    rerender(<AudioPlayer onPlaybackChange={onPlaybackChange} />);

    expect(onPlaybackChange).toHaveBeenCalledWith(
      expect.objectContaining({ isPlaying: true })
    );
  });



  it('switches audio when audioUrl changes', () => {
    const { rerender } = render(
      <AudioPlayer audioUrl="/test/audio1.mp3" autoPlay={true} />
    );

    expect(mockPlayer.play).toHaveBeenCalledWith('/test/audio1.mp3');

    // Change audio URL
    rerender(<AudioPlayer audioUrl="/test/audio2.mp3" autoPlay={true} />);

    expect(mockPlayer.play).toHaveBeenCalledWith('/test/audio2.mp3');
  });

  it('integrates useAudioPlayer hook correctly', () => {
    render(<AudioPlayer audioUrl="/test/audio.mp3" />);

    expect(useAudioPlayerModule.useAudioPlayer).toHaveBeenCalled();
  });

  it('manages loop playback through useAudioPlayer', () => {
    // Loop playback is managed by the useAudioPlayer hook
    // This test verifies the component uses the hook
    render(<AudioPlayer audioUrl="/test/audio.mp3" />);

    expect(mockPlayer.play).toHaveBeenCalled();
    // The actual loop logic is in useAudioPlayer hook
  });

  it('tracks playback state through useAudioPlayer', () => {
    mockPlayer.isPlaying = true;

    const onPlaybackChange = vi.fn();

    render(
      <AudioPlayer
        audioUrl="/test/audio.mp3"
        onPlaybackChange={onPlaybackChange}
      />
    );

    expect(onPlaybackChange).toHaveBeenCalledWith(
      expect.objectContaining({
        isPlaying: true,
      })
    );
  });
});
