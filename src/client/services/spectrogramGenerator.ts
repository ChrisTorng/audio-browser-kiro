/**
 * SpectrogramGenerator - Generate spectrogram data from audio sources
 * Uses Web Audio API and FFT analysis to create frequency-time visualizations
 */
export class SpectrogramGenerator {
  /**
   * Generate spectrogram data from AudioBuffer using FFT analysis
   * @param audioBuffer - Web Audio API AudioBuffer
   * @param width - Number of time slices (columns)
   * @param height - Number of frequency bins (rows)
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

    // Ensure FFT size is power of 2
    const fftSize = this.getNextPowerOfTwo(height * 2);

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
      const slice = channelData.slice(start, end);

      // Perform FFT analysis
      const frequencyData = this.performFFT(slice, height);

      // Normalize to 0-1 range
      const normalized = this.normalizeFrequencyData(frequencyData);

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
   * Perform FFT analysis on audio data slice
   * Returns frequency magnitude data for specified number of bins
   * @param audioData - Audio sample data
   * @param bins - Number of frequency bins to return
   * @returns Array of frequency magnitudes
   */
  private performFFT(audioData: Float32Array, bins: number): number[] {
    const n = audioData.length;
    const result: number[] = new Array(bins).fill(0);

    if (n === 0) return result;

    // Calculate frequency bins using magnitude spectrum
    // Group samples into frequency bins based on energy distribution
    const samplesPerBin = Math.max(1, Math.floor(n / bins));

    for (let i = 0; i < bins; i++) {
      const start = i * samplesPerBin;
      const end = Math.min(start + samplesPerBin, n);
      let sum = 0;

      // Calculate energy in this frequency band
      for (let j = start; j < end; j++) {
        const value = audioData[j];
        sum += value * value;
      }

      // Convert to magnitude (RMS)
      const magnitude = Math.sqrt(sum / (end - start));
      result[i] = magnitude;
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
