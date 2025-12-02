import { useState, useCallback, useRef, useEffect } from 'react';
import { visualizationCache } from '../utils/visualizationCache';
import { spectrogramGenerator } from '../services/spectrogramGenerator';

/**
 * Spectrogram hook return type
 */
export interface UseSpectrogramReturn {
  spectrogramData: number[][];
  isLoading: boolean;
  error: Error | null;
  generateSpectrogram: (audioBuffer: AudioBuffer, filePath: string, width?: number, height?: number) => Promise<void>;
  loadFromPersistence: (filePath: string, width?: number, height?: number) => Promise<boolean>;
  clearSpectrogram: () => void;
  cancelGeneration: () => void;
}

/**
 * Custom hook for generating spectrogram data from AudioBuffer using FFT
 * Uses Web Workers for background processing and centralized LRU cache
 * Integrates with IndexedDB for persistent storage across page reloads
 */
export function useSpectrogram(): UseSpectrogramReturn {
  const [spectrogramData, setSpectrogramData] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const currentRequestRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancel any pending requests
      if (currentRequestRef.current) {
        spectrogramGenerator.cancelRequest(currentRequestRef.current);
      }
    };
  }, []);

  /**
   * Cancel current generation
   */
  const cancelGeneration = useCallback(() => {
    if (currentRequestRef.current) {
      spectrogramGenerator.cancelRequest(currentRequestRef.current);
      currentRequestRef.current = null;
      setIsLoading(false);
    }
  }, []);

  /**
   * Load spectrogram from persistent storage (IndexedDB)
   * Use this to restore spectrograms after page reload
   * @param filePath - Audio file path
   * @param width - Display width (default: 200)
   * @param height - Display height (default: 128)
   * @returns True if spectrogram was loaded from persistence
   */
  const loadFromPersistence = useCallback(async (
    filePath: string,
    width: number = 200,
    height: number = 128
  ): Promise<boolean> => {
    if (!isMountedRef.current) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First check memory cache
      const cached = visualizationCache.getSpectrogram(filePath, width, height);
      if (cached) {
        if (isMountedRef.current) {
          setSpectrogramData(cached);
          setIsLoading(false);
        }
        return true;
      }

      // Try loading from IndexedDB
      const persisted = await visualizationCache.loadSpectrogramFromPersistence(filePath, width, height);
      if (persisted && isMountedRef.current) {
        setSpectrogramData(persisted);
        setIsLoading(false);
        return true;
      }

      if (isMountedRef.current) {
        setIsLoading(false);
      }
      return false;
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error('Failed to load spectrogram from persistence');
        setError(error);
        setIsLoading(false);
        console.error('Spectrogram persistence load error:', error);
      }
      return false;
    }
  }, []);

  /**
   * Generate spectrogram data from AudioBuffer using FFT analysis (background processing)
   * First tries to load from persistent storage (IndexedDB)
   * @param audioBuffer - Web Audio API AudioBuffer
   * @param filePath - File path for cache key
   * @param width - Number of time slices (default: 200)
   * @param height - Number of frequency bins (default: 128)
   */
  const generateSpectrogram = useCallback(async (
    audioBuffer: AudioBuffer,
    filePath: string,
    width: number = 200,
    height: number = 128
  ): Promise<void> => {
    // Cancel any previous generation
    if (currentRequestRef.current) {
      spectrogramGenerator.cancelRequest(currentRequestRef.current);
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check memory cache first
      const cached = visualizationCache.getSpectrogram(filePath, width, height);
      if (cached) {
        if (isMountedRef.current) {
          setSpectrogramData(cached);
          setIsLoading(false);
        }
        return;
      }

      // Try loading from IndexedDB persistence
      const persisted = await visualizationCache.loadSpectrogramFromPersistence(filePath, width, height);
      if (persisted) {
        if (isMountedRef.current) {
          setSpectrogramData(persisted);
          setIsLoading(false);
        }
        return;
      }

      // Generate unique request ID for tracking
      const requestId = `${filePath}-${width}-${height}-${Date.now()}`;
      currentRequestRef.current = requestId;

      // Generate spectrogram in background using Web Worker
      const spectrogram = await spectrogramGenerator.generateFromAudioBuffer(
        audioBuffer,
        width,
        height
      );

      // Only update state if this is still the current request and component is mounted
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        // Store in centralized cache (also persists to IndexedDB)
        visualizationCache.setSpectrogram(filePath, width, height, spectrogram);

        setSpectrogramData(spectrogram);
        setIsLoading(false);
        currentRequestRef.current = null;
      }
    } catch (err) {
      // Only update error state if component is mounted and this is still the current request
      if (isMountedRef.current && currentRequestRef.current) {
        const error = err instanceof Error ? err : new Error('Failed to generate spectrogram');
        
        // Don't show error for cancelled requests
        if (!error.message.includes('cancelled')) {
          setError(error);
          console.error('Spectrogram generation error:', error);
        }
        
        setIsLoading(false);
        currentRequestRef.current = null;
      }
    }
  }, []);

  /**
   * Clear current spectrogram data
   */
  const clearSpectrogram = useCallback(() => {
    setSpectrogramData([]);
    setError(null);
  }, []);

  return {
    spectrogramData,
    isLoading,
    error,
    generateSpectrogram,
    loadFromPersistence,
    clearSpectrogram,
    cancelGeneration,
  };
}

