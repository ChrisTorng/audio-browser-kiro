import { useState, useCallback, useRef, useEffect } from 'react';
import { visualizationCache } from '../utils/visualizationCache';
import { waveformGenerator } from '../services/waveformGenerator';

/**
 * Waveform hook return type
 */
export interface UseWaveformReturn {
  waveformData: number[];
  isLoading: boolean;
  error: Error | null;
  generateWaveform: (audioBuffer: AudioBuffer, filePath: string, width?: number) => Promise<void>;
  generateWaveformAsync: (audioBuffer: AudioBuffer, filePath: string, width?: number) => Promise<void>;
  clearWaveform: () => void;
}

/**
 * Custom hook for generating waveform data from AudioBuffer
 * Uses centralized LRU cache for efficient memory management
 * Supports both synchronous and asynchronous (background) generation
 */
export function useWaveform(): UseWaveformReturn {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track current generation to support cancellation
  const currentGenerationRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Generate waveform data from AudioBuffer (synchronous, main thread)
   * @param audioBuffer - Web Audio API AudioBuffer
   * @param filePath - File path for cache key
   * @param width - Number of data points (default: 1000)
   */
  const generateWaveform = useCallback(async (audioBuffer: AudioBuffer, filePath: string, width: number = 1000) => {
    // Cancel previous generation
    if (currentGenerationRef.current) {
      currentGenerationRef.current = null;
    }

    const generationId = `${filePath}-${Date.now()}`;
    currentGenerationRef.current = generationId;

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = visualizationCache.getWaveform(filePath, width);
      if (cached) {
        if (isMountedRef.current && currentGenerationRef.current === generationId) {
          setWaveformData(cached);
          setIsLoading(false);
        }
        return;
      }

      // Get raw audio data from first channel
      const rawData = audioBuffer.getChannelData(0);
      const samples = audioBuffer.length;
      const blockSize = Math.floor(samples / width);
      const waveform: number[] = [];

      // Downsample audio data to fit display width
      for (let i = 0; i < width; i++) {
        const start = i * blockSize;
        const end = start + blockSize;
        let sum = 0;

        // Calculate RMS (Root Mean Square) for this block
        for (let j = start; j < end && j < samples; j++) {
          sum += rawData[j] * rawData[j];
        }

        const rms = Math.sqrt(sum / blockSize);
        waveform.push(rms);
      }

      // Normalize waveform data to 0-1 range
      const max = Math.max(...waveform);
      const normalized = max > 0 ? waveform.map(v => v / max) : waveform;

      // Store in centralized cache
      visualizationCache.setWaveform(filePath, width, normalized);

      // Only update state if this generation is still current and component is mounted
      if (isMountedRef.current && currentGenerationRef.current === generationId) {
        setWaveformData(normalized);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current && currentGenerationRef.current === generationId) {
        const error = err instanceof Error ? err : new Error('Failed to generate waveform');
        setError(error);
        setIsLoading(false);
        console.error('Waveform generation error:', error);
      }
    }
  }, []);

  /**
   * Generate waveform data from AudioBuffer in background (asynchronous, Web Worker)
   * @param audioBuffer - Web Audio API AudioBuffer
   * @param filePath - File path for cache key
   * @param width - Number of data points (default: 1000)
   */
  const generateWaveformAsync = useCallback(async (audioBuffer: AudioBuffer, filePath: string, width: number = 1000) => {
    // Cancel previous generation
    if (currentGenerationRef.current) {
      currentGenerationRef.current = null;
    }

    const generationId = `${filePath}-${Date.now()}`;
    currentGenerationRef.current = generationId;

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = visualizationCache.getWaveform(filePath, width);
      if (cached) {
        if (isMountedRef.current && currentGenerationRef.current === generationId) {
          setWaveformData(cached);
          setIsLoading(false);
        }
        return;
      }

      // Generate waveform in background using Web Worker
      const normalized = await waveformGenerator.generateFromAudioBufferAsync(audioBuffer, width);

      // Store in centralized cache
      visualizationCache.setWaveform(filePath, width, normalized);

      // Only update state if this generation is still current and component is mounted
      if (isMountedRef.current && currentGenerationRef.current === generationId) {
        setWaveformData(normalized);
        setIsLoading(false);
      }
    } catch (err) {
      // Ignore cancellation errors
      if (err instanceof Error && err.message.includes('cancelled')) {
        return;
      }

      if (isMountedRef.current && currentGenerationRef.current === generationId) {
        const error = err instanceof Error ? err : new Error('Failed to generate waveform');
        setError(error);
        setIsLoading(false);
        console.error('Waveform generation error:', error);
      }
    }
  }, []);

  /**
   * Clear current waveform data
   */
  const clearWaveform = useCallback(() => {
    // Cancel any ongoing generation
    currentGenerationRef.current = null;
    
    setWaveformData([]);
    setError(null);
  }, []);

  return {
    waveformData,
    isLoading,
    error,
    generateWaveform,
    generateWaveformAsync,
    clearWaveform,
  };
}
