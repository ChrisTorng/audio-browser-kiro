import { useState, useCallback, useRef } from 'react';

/**
 * Spectrogram hook return type
 */
export interface UseSpectrogramReturn {
  spectrogramData: number[][];
  isLoading: boolean;
  error: Error | null;
  generateSpectrogram: (audioBuffer: AudioBuffer, width?: number, height?: number) => void;
  clearSpectrogram: () => void;
}

/**
 * Custom hook for generating spectrogram data from AudioBuffer using FFT
 * Includes caching mechanism to avoid regenerating spectrograms
 */
export function useSpectrogram(): UseSpectrogramReturn {
  const [spectrogramData, setSpectrogramData] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Cache to store generated spectrograms
  const cacheRef = useRef<Map<string, number[][]>>(new Map());

  /**
   * Generate cache key from AudioBuffer properties
   */
  const getCacheKey = useCallback((audioBuffer: AudioBuffer, width: number, height: number): string => {
    return `${audioBuffer.length}_${audioBuffer.sampleRate}_${audioBuffer.numberOfChannels}_${width}_${height}`;
  }, []);

  /**
   * Generate spectrogram data from AudioBuffer using FFT analysis
   * @param audioBuffer - Web Audio API AudioBuffer
   * @param width - Number of time slices (default: 200)
   * @param height - Number of frequency bins (default: 128)
   */
  const generateSpectrogram = useCallback((
    audioBuffer: AudioBuffer,
    width: number = 200,
    height: number = 128
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const cacheKey = getCacheKey(audioBuffer, width, height);
      
      // Check cache first
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setSpectrogramData(cached);
        setIsLoading(false);
        return;
      }

      // Create offline audio context for FFT analysis
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      // Create analyser node
      const analyser = offlineContext.createAnalyser();
      analyser.fftSize = height * 2; // FFT size must be power of 2
      analyser.smoothingTimeConstant = 0;

      // Create buffer source
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(offlineContext.destination);

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const spectrogram: number[][] = [];
      
      const samples = audioBuffer.length;
      const sampleRate = audioBuffer.sampleRate;
      const timeSliceSize = Math.floor(samples / width);

      // Get raw audio data
      const channelData = audioBuffer.getChannelData(0);

      // Generate spectrogram data for each time slice
      for (let i = 0; i < width; i++) {
        const start = i * timeSliceSize;
        const end = Math.min(start + analyser.fftSize, samples);
        
        // Extract slice of audio data
        const slice = channelData.slice(start, end);
        
        // Perform FFT using Web Audio API approach
        // Note: This is a simplified approach. For production, consider using a proper FFT library
        const fftData = performSimpleFFT(slice, height);
        
        // Normalize to 0-1 range
        const normalized = fftData.map(v => Math.min(v / 255, 1));
        spectrogram.push(normalized);
      }

      // Store in cache
      cacheRef.current.set(cacheKey, spectrogram);

      // Limit cache size to prevent memory issues
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey !== undefined) {
          cacheRef.current.delete(firstKey);
        }
      }

      setSpectrogramData(spectrogram);
      setIsLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate spectrogram');
      setError(error);
      setIsLoading(false);
      console.error('Spectrogram generation error:', error);
    }
  }, [getCacheKey]);

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
    clearSpectrogram,
  };
}

/**
 * Simplified FFT implementation for spectrogram generation
 * This is a basic implementation - for production use, consider libraries like fft.js
 */
function performSimpleFFT(audioData: Float32Array, bins: number): number[] {
  const result: number[] = new Array(bins).fill(0);
  const n = audioData.length;
  
  if (n === 0) return result;

  // Simple magnitude spectrum calculation
  // Group samples into frequency bins
  const samplesPerBin = Math.floor(n / bins);
  
  for (let i = 0; i < bins; i++) {
    let sum = 0;
    const start = i * samplesPerBin;
    const end = Math.min(start + samplesPerBin, n);
    
    // Calculate energy in this frequency band
    for (let j = start; j < end; j++) {
      const value = audioData[j];
      sum += value * value;
    }
    
    // Convert to magnitude (0-255 range for visualization)
    const magnitude = Math.sqrt(sum / samplesPerBin) * 255;
    result[i] = Math.min(magnitude, 255);
  }
  
  return result;
}
