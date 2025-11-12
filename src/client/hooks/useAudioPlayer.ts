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
 * Check if error is an AbortError that should be silently ignored
 * AbortError occurs when switching audio files quickly
 */
function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return false;
}

/**
 * Custom hook for audio playback with loop functionality
 * Manages audio playback state, progress tracking, and loop playback
 * Handles AbortError when switching audio files quickly (Requirement 12.1, 12.2, 12.4)
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true; // Enable loop playback
    audioRef.current = audio;

    // Cleanup on unmount
    return () => {
      // Cancel any pending playback
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
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
   * Ensures only one audio file plays at a time (Requirement 12.3)
   * Properly handles AbortError when switching files quickly (Requirement 12.1, 12.2, 12.4)
   */
  const play = useCallback((audioUrl: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Cancel previous playback request if exists (Requirement 12.1, 12.3)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this playback
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // If playing a different file, reset and load new file (Requirement 12.3)
    // This ensures only one audio file plays at a time by pausing the current one
    if (currentUrlRef.current !== audioUrl) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = audioUrl;
      currentUrlRef.current = audioUrl;
      setProgress(0);
      setCurrentTime(0);
    }

    // Start playback and handle errors
    audio.play().catch((error) => {
      // Don't show error message for AbortError (Requirement 12.2)
      if (isAbortError(error)) {
        // Silently ignore AbortError - this is expected when switching files quickly
        return;
      }
      
      // Log other errors
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
    });
    
    setIsPlaying(true);
  }, []);

  /**
   * Stop audio playback and reset to beginning
   * Cleans up resources and cancels pending playback (Requirement 12.4)
   */
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Cancel any pending playback request (Requirement 12.4)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

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
