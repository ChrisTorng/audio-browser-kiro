import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Audio player hook return type
 */
export interface UseAudioPlayerReturn {
  play: (audioUrl: string) => void;
  stop: () => void;
  toggle: () => void;
  isPlaying: boolean;
  progress: number; // 0-1
  currentTime: number;
  duration: number;
}

/**
 * Custom hook for audio playback with loop functionality
 * Manages audio playback state, progress tracking, and loop playback
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string>('');

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true; // Enable loop playback
    audioRef.current = audio;

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Update progress during playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      // Loop is handled by audio.loop = true
      // This event won't fire when loop is enabled
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  /**
   * Play audio from URL
   * If a different URL is provided, stops current playback and starts new one
   */
  const play = useCallback((audioUrl: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    // If playing a different file, reset and load new file
    if (currentUrlRef.current !== audioUrl) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = audioUrl;
      currentUrlRef.current = audioUrl;
      setProgress(0);
      setCurrentTime(0);
    }

    audio.play().catch((error) => {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
    });
    
    setIsPlaying(true);
  }, []);

  /**
   * Stop audio playback and reset to beginning
   */
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, []);

  /**
   * Toggle play/pause state
   * If stopped, plays from beginning
   */
  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      stop();
    } else {
      if (currentUrlRef.current) {
        play(currentUrlRef.current);
      }
    }
  }, [isPlaying, play, stop]);

  return {
    play,
    stop,
    toggle,
    isPlaying,
    progress,
    currentTime,
    duration,
  };
}
