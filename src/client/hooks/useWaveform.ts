import { useState, useCallback, useRef } from 'react';

/**
 * Waveform hook return type
 */
export interface UseWaveformReturn {
  waveformData: number[];
  isLoading: boolean;
  error: Error | null;
  generateWaveform: (audioBuffer: AudioBuffer, width?: number) => void;
  clearWaveform: () => void;
}

/**
 * Custom hook for generating waveform data from AudioBuffer
 * Includes caching mechanism to avoid regenerating waveforms
 */
export function useWaveform(): UseWaveformReturn {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Cache to store generated waveforms
  const cacheRef = useRef<Map<string, number[]>>(new Map());

  /**
   * Generate cache key from AudioBuffer properties
   */
  const getCacheKey = useCallback((audioBuffer: AudioBuffer, width: number): string => {
    return `${audioBuffer.length}_${audioBuffer.sampleRate}_${audioBuffer.numberOfChannels}_${width}`;
  }, []);

  /**
   * Generate waveform data from AudioBuffer
   * @param audioBuffer - Web Audio API AudioBuffer
   * @param width - Number of data points (default: 1000)
   */
  const generateWaveform = useCallback((audioBuffer: AudioBuffer, width: number = 1000) => {
    setIsLoading(true);
    setError(null);

    try {
      const cacheKey = getCacheKey(audioBuffer, width);
      
      // Check cache first
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setWaveformData(cached);
        setIsLoading(false);
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

      // Store in cache
      cacheRef.current.set(cacheKey, normalized);

      // Limit cache size to prevent memory issues (LRU-like behavior)
      if (cacheRef.current.size > 100) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey !== undefined) {
          cacheRef.current.delete(firstKey);
        }
      }

      setWaveformData(normalized);
      setIsLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate waveform');
      setError(error);
      setIsLoading(false);
      console.error('Waveform generation error:', error);
    }
  }, [getCacheKey]);

  /**
   * Clear current waveform data
   */
  const clearWaveform = useCallback(() => {
    setWaveformData([]);
    setError(null);
  }, []);

  return {
    waveformData,
    isLoading,
    error,
    generateWaveform,
    clearWaveform,
  };
}
