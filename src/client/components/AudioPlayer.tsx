import { useEffect } from 'react';
import { useAudioPlayer, UseAudioPlayerReturn } from '../hooks/useAudioPlayer';

/**
 * AudioPlayer component props
 */
export interface AudioPlayerProps {
  /**
   * Audio URL to play (when changed, switches to new audio)
   */
  audioUrl?: string;
  
  /**
   * Whether to auto-play when audioUrl changes
   */
  autoPlay?: boolean;
  
  /**
   * Callback when playback state changes
   */
  onPlaybackChange?: (player: UseAudioPlayerReturn) => void;
}

/**
 * AudioPlayer component (headless - no UI)
 * Manages audio playback control logic, loop playback, and playback state
 * Integrates useAudioPlayer hook and provides callbacks for state updates
 * 
 * Requirements: 1.5 (Audio playback with loop functionality)
 */
export function AudioPlayer({
  audioUrl,
  autoPlay = true,
  onPlaybackChange,
}: AudioPlayerProps) {
  const player = useAudioPlayer();

  // Auto-play when audioUrl changes
  useEffect(() => {
    if (audioUrl && autoPlay) {
      player.play(audioUrl);
    }
  }, [audioUrl, autoPlay, player]);

  // Notify parent of playback state changes
  useEffect(() => {
    if (onPlaybackChange) {
      onPlaybackChange(player);
    }
  }, [player.isPlaying, onPlaybackChange, player]);

  // This is a headless component - no UI rendering
  return null;
}
