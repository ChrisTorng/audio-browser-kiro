/**
 * SpectrogramGenerator - Generate spectrogram data from audio sources
 * Uses Web Audio API and FFT analysis to create frequency-time visualizations
 * Displays frequency range from 20Hz to 20KHz
 */
export class SpectrogramGenerator {
  // Human hearing range: 20Hz to 20KHz
  private readonly MIN_FREQUENCY = 20;
  private readonly MAX_FREQUENCY = 20000;

  /**
   * Generate spectrogram data from AudioBuffer using FFT analysis
   * @param audioBuffer - Web Audio API AudioBuffer
   * @param width - Number of time slices (columns)
   * @param height - Number of frequency bins (rows) - represents 20Hz to 20KHz range
   * @returns 2D array of normalized frequency values (0-1)
   */
  generateFromAudioBuffer(
    audioBuffer: AudioBuffer,
    width: number,
    height: number
  ): number[][] {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Invalid AudioBuffer: buffer is empty or null');
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Invalid dimensions: width and height must be greater than 0');
    }

    // Use a larger FFT size for better frequency resolution
    // 2048 gives us good frequency resolution for 20Hz-20KHz range
    const fftSize = 2048;
    const sampleRate = audioBuffer.sampleRate;

    // Get raw audio data from first channel
    const channelData = audioBuffer.getChannelData(0);
    const samples = audioBuffer.length;
    const timeSliceSize = Math.floor(samples / width);

    const spectrogram: number[][] = [];

    // Generate spectrogram data for each time slice
    for (let i = 0; i < width; i++) {
      const start = i * timeSliceSize;
      const end = Math.min(start + fftSize, samples);

      // Extract slice of audio data
      const sliceLength = end - start;
      const slice = new Float32Array(fftSize);
      
      // Copy data and apply windowing
      for (let j = 0; j < sliceLength; j++) {
        // Hann window to reduce spectral leakage
        const window = 0.5 * (1 - Math.cos((2 * Math.PI * j) / sliceLength));
        slice[j] = channelData[start + j] * window;
      }

      // Perform FFT analysis
      const frequencyData = this.performFFT(slice, fftSize, sampleRate);

      // Extract frequency bins for 20Hz-20KHz range and resample to height
      const filteredData = this.extractFrequencyRange(
        frequencyData,
        fftSize,
        sampleRate,
        height
      );

      // Normalize to 0-1 range
      const normalized = this.normalizeFrequencyData(filteredData);

      spectrogram.push(normalized);
    }

    return spectrogram;
  }

  /**
   * Generate spectrogram data from Blob
   * @param audioBlob - Audio file as Blob
   * @param width - Number of time slices (columns)
   * @param height - Number of frequency bins (rows)
   * @returns Promise resolving to 2D array of normalized frequency values (0-1)
   */
  async generateFromBlob(
    audioBlob: Blob,
    width: number,
    height: number
  ): Promise<number[][]> {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Invalid Blob: blob is empty or null');
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Invalid dimensions: width and height must be greater than 0');
    }

    // Create AudioContext
    const audioContext = new AudioContext();

    try {
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await this.blobToArrayBuffer(audioBlob);

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Generate spectrogram from AudioBuffer
      return this.generateFromAudioBuffer(audioBuffer, width, height);
    } catch (error) {
      throw new Error(
        `Failed to generate spectrogram from Blob: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      // Clean up AudioContext
      if (typeof audioContext.close === 'function') {
        await audioContext.close();
      }
    }
  }

  /**
   * Perform FFT analysis on audio data slice using a simple DFT implementation
   * Returns frequency magnitude data for all FFT bins
   * @param audioData - Audio sample data (should be windowed)
   * @param fftSize - FFT size (power of 2)
   * @param sampleRate - Sample rate of the audio
   * @returns Array of frequency magnitudes for each FFT bin
   */
  private performFFT(
    audioData: Float32Array,
    fftSize: number,
    sampleRate: number
  ): number[] {
    const n = Math.min(audioData.length, fftSize);
    const halfSize = Math.floor(fftSize / 2);
    const result: number[] = new Array(halfSize).fill(0);

    if (n === 0) return result;

    // Perform DFT (Discrete Fourier Transform)
    // For each frequency bin, calculate the magnitude
    for (let k = 0; k < halfSize; k++) {
      let real = 0;
      let imag = 0;

      // Calculate DFT for this frequency bin
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / fftSize;
        real += audioData[t] * Math.cos(angle);
        imag -= audioData[t] * Math.sin(angle);
      }

      // Calculate magnitude
      const magnitude = Math.sqrt(real * real + imag * imag) / n;
      result[k] = magnitude;
    }

    return result;
  }

  /**
   * Extract frequency range (20Hz-20KHz) from FFT data and resample to desired height
   * @param fftData - Full FFT magnitude data
   * @param fftSize - FFT size used
   * @param sampleRate - Sample rate of the audio
   * @param height - Desired number of frequency bins in output
   * @returns Array of frequency magnitudes for 20Hz-20KHz range
   */
  private extractFrequencyRange(
    fftData: number[],
    fftSize: number,
    sampleRate: number,
    height: number
  ): number[] {
    const result: number[] = new Array(height).fill(0);
    
    // Calculate frequency resolution (Hz per bin)
    const frequencyResolution = sampleRate / fftSize;
    
    // Find FFT bin indices for 20Hz and 20KHz
    const minBin = Math.max(0, Math.floor(this.MIN_FREQUENCY / frequencyResolution));
    const maxBin = Math.min(
      fftData.length - 1,
      Math.ceil(this.MAX_FREQUENCY / frequencyResolution)
    );
    
    const rangeBins = maxBin - minBin + 1;
    
    if (rangeBins <= 0) {
      return result;
    }

    // Resample the frequency range to fit the desired height
    // Use linear interpolation for smooth resampling
    for (let i = 0; i < height; i++) {
      // Map output bin to input bin range
      const inputPosition = minBin + (i / (height - 1)) * (rangeBins - 1);
      const inputIndex = Math.floor(inputPosition);
      const fraction = inputPosition - inputIndex;
      
      // Linear interpolation between adjacent bins
      if (inputIndex < fftData.length - 1) {
        result[i] = fftData[inputIndex] * (1 - fraction) + fftData[inputIndex + 1] * fraction;
      } else {
        result[i] = fftData[inputIndex];
      }
    }

    return result;
  }

  /**
   * Normalize frequency data to 0-1 range
   * @param frequencyData - Raw frequency magnitude data
   * @returns Normalized frequency data (0-1)
   */
  private normalizeFrequencyData(frequencyData: number[]): number[] {
    if (frequencyData.length === 0) return [];

    // Find max value for normalization
    const max = Math.max(...frequencyData);

    if (max === 0) {
      return frequencyData.map(() => 0);
    }

    // Normalize to 0-1 range
    return frequencyData.map(value => value / max);
  }

  /**
   * Apply color mapping to normalized frequency data
   * Converts normalized values (0-1) to color intensity values
   * @param normalizedValue - Normalized frequency value (0-1)
   * @param colorMap - Color mapping function (optional)
   * @returns RGB color values [r, g, b] (0-255)
   */
  applyColorMap(
    normalizedValue: number,
    colorMap: 'viridis' | 'hot' | 'grayscale' = 'hot'
  ): [number, number, number] {
    // Clamp value to 0-1 range
    const value = Math.max(0, Math.min(1, normalizedValue));

    switch (colorMap) {
      case 'hot':
        return this.hotColorMap(value);
      case 'viridis':
        return this.viridisColorMap(value);
      case 'grayscale':
        return this.grayscaleColorMap(value);
      default:
        return this.hotColorMap(value);
    }
  }

  /**
   * Hot color map (black -> red -> yellow -> white)
   * @param value - Normalized value (0-1)
   * @returns RGB color [r, g, b]
   */
  private hotColorMap(value: number): [number, number, number] {
    if (value < 0.33) {
      // Black to red
      const t = value / 0.33;
      return [Math.floor(t * 255), 0, 0];
    } else if (value < 0.66) {
      // Red to yellow
      const t = (value - 0.33) / 0.33;
      return [255, Math.floor(t * 255), 0];
    } else {
      // Yellow to white
      const t = (value - 0.66) / 0.34;
      return [255, 255, Math.floor(t * 255)];
    }
  }

  /**
   * Viridis color map (perceptually uniform)
   * Simplified approximation of the viridis color scheme
   * @param value - Normalized value (0-1)
   * @returns RGB color [r, g, b]
   */
  private viridisColorMap(value: number): [number, number, number] {
    // Simplified viridis approximation
    const r = Math.floor(68 + value * (253 - 68));
    const g = Math.floor(1 + value * (231 - 1));
    const b = Math.floor(84 + value * (37 - 84));
    return [r, g, b];
  }

  /**
   * Grayscale color map
   * @param value - Normalized value (0-1)
   * @returns RGB color [r, g, b]
   */
  private grayscaleColorMap(value: number): [number, number, number] {
    const intensity = Math.floor(value * 255);
    return [intensity, intensity, intensity];
  }

  /**
   * Get next power of two for FFT size
   * @param n - Input number
   * @returns Next power of two >= n
   */
  private getNextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  /**
   * Convert Blob to ArrayBuffer
   * Uses Blob.arrayBuffer() if available, otherwise falls back to FileReader
   * @param blob - Blob to convert
   * @returns Promise resolving to ArrayBuffer
   */
  private async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    // Try modern API first
    if (typeof blob.arrayBuffer === 'function') {
      return await blob.arrayBuffer();
    }

    // Fallback to FileReader for older environments
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read Blob as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }
}

// Export singleton instance
export const spectrogramGenerator = new SpectrogramGenerator();
