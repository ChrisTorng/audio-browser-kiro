import { useState, useCallback, useEffect, useRef } from 'react';
import { visualizationCache } from '../utils/visualizationCache';
import { waveformGenerator } from '../services/waveformGenerator';
import { spectrogramGenerator } from '../services/spectrogramGenerator';

/**
 * Lazy visualization hook return type
 */
export interface UseLazyVisualizationReturn {
  waveformData: number[] | null;
  spectrogramData: number[][] | null;
  isLoading: boolean;
  error: Error | null;
  loadVisualization: (filePath: string, audioUrl: string) => Promise<void>;
  clearVisualization: () => void;
}

/**
 * Options for lazy visualization
 */
export interface LazyVisualizationOptions {
  waveformWidth?: number;
  spectrogramWidth?: number;
  spectrogramHeight?: number;
  autoLoad?: boolean;
  priority?: 'waveform' | 'spectrogram' | 'both';
}

/**
 * Custom hook for lazy loading and on-demand generation of visualizations
 * Optimizes performance by loading only when needed and using cached data
 */
export function useLazyVisualization(
  options: LazyVisualizationOptions = {}
): UseLazyVisualizationReturn {
  const {
    waveformWidth = 200,
    spectrogramWidth = 200,
    spectrogramHeight = 40,
    priority = 'both',
  } = options;

  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [spectrogramData, setSpectrogramData] = useState<number[][] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track current file path to avoid duplicate loads
  const currentFilePathRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load visualization data for a file
   * Checks cache first, then generates if needed
   */
  const loadVisualization = useCallback(
    async (filePath: string, audioUrl: string) => {
      // Abort any ongoing load
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Skip if already loading this file
      if (currentFilePathRef.current === filePath) {
        // Check if we already have the data
        const cachedWaveform = visualizationCache.getWaveform(filePath, waveformWidth);
        const cachedSpectrogram = visualizationCache.getSpectrogram(
          filePath,
          spectrogramWidth,
          spectrogramHeight
        );
        
        if (cachedWaveform && cachedSpectrogram) {
          return;
        }
      }

      currentFilePathRef.current = filePath;
      setIsLoading(true);
      setError(null);

      try {
        // Check cache first
        const cachedWaveform = visualizationCache.getWaveform(filePath, waveformWidth);
        const cachedSpectrogram = visualizationCache.getSpectrogram(
          filePath,
          spectrogramWidth,
          spectrogramHeight
        );

        // If both are cached, use them
        if (cachedWaveform && cachedSpectrogram) {
          if (!abortController.signal.aborted) {
            setWaveformData(cachedWaveform);
            setSpectrogramData(cachedSpectrogram);
            setIsLoading(false);
          }
          return;
        }

        // Check if audio buffer is cached
        let audioBuffer = visualizationCache.getAudioBuffer(filePath);

        // If not cached, fetch and decode audio
        if (!audioBuffer) {
          const response = await fetch(audioUrl, { signal: abortController.signal });
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          if (abortController.signal.aborted) return;

          const audioContext = new AudioContext();
          audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Cache the audio buffer
          visualizationCache.setAudioBuffer(filePath, audioBuffer);
          
          // Close audio context
          await audioContext.close();
        }

        if (abortController.signal.aborted) return;

        // Generate visualizations based on priority
        if (priority === 'waveform' || priority === 'both') {
          if (!cachedWaveform) {
            // Use async background generation to avoid blocking main thread
            const waveform = await waveformGenerator.generateFromAudioBufferAsync(audioBuffer, waveformWidth);
            visualizationCache.setWaveform(filePath, waveformWidth, waveform);
            if (!abortController.signal.aborted) {
              setWaveformData(waveform);
            }
          } else {
            setWaveformData(cachedWaveform);
          }
        }

        if (priority === 'spectrogram' || priority === 'both') {
          if (!cachedSpectrogram) {
            const spectrogram = spectrogramGenerator.generateFromAudioBuffer(
              audioBuffer,
              spectrogramWidth,
              spectrogramHeight
            );
            visualizationCache.setSpectrogram(filePath, spectrogramWidth, spectrogramHeight, spectrogram);
            if (!abortController.signal.aborted) {
              setSpectrogramData(spectrogram);
            }
          } else {
            setSpectrogramData(cachedSpectrogram);
          }
        }

        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      } catch (err) {
        if (abortController.signal.aborted) {
          // Ignore abort errors
          return;
        }

        const error = err instanceof Error ? err : new Error('Failed to load visualization');
        setError(error);
        setIsLoading(false);
        console.error('Visualization load error:', error);
      }
    },
    [waveformWidth, spectrogramWidth, spectrogramHeight, priority]
  );

  /**
   * Clear current visualization data
   */
  const clearVisualization = useCallback(() => {
    // Abort any ongoing load
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    currentFilePathRef.current = null;
    setWaveformData(null);
    setSpectrogramData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    waveformData,
    spectrogramData,
    isLoading,
    error,
    loadVisualization,
    clearVisualization,
  };
}
