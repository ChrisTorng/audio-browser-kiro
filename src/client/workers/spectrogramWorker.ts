/**
 * Web Worker for background spectrogram generation
 * Processes audio data using FFT without blocking the main thread
 */

interface SpectrogramRequest {
  type: 'generate';
  audioData: Float32Array;
  width: number;
  height: number;
  sampleRate: number;
  requestId: string;
}

interface SpectrogramResponse {
  type: 'success' | 'error';
  requestId: string;
  spectrogramData?: number[][];
  error?: string;
}

// Human hearing range: 20Hz to 20KHz
const MIN_FREQUENCY = 20;
const MAX_FREQUENCY = 20000;

/**
 * Generate spectrogram data from audio samples using FFT
 */
function generateSpectrogram(
  audioData: Float32Array,
  width: number,
  height: number,
  sampleRate: number
): number[][] {
  // Use a larger FFT size for better frequency resolution
  const fftSize = 2048;
  const samples = audioData.length;
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
      slice[j] = audioData[start + j] * window;
    }

    // Perform FFT analysis
    const frequencyData = performFFT(slice, fftSize, sampleRate);

    // Extract frequency bins for 20Hz-20KHz range and resample to height
    const filteredData = extractFrequencyRange(
      frequencyData,
      fftSize,
      sampleRate,
      height
    );

    // Normalize to 0-1 range
    const normalized = normalizeFrequencyData(filteredData);

    spectrogram.push(normalized);
  }

  return spectrogram;
}

/**
 * Perform FFT analysis on audio data slice using a simple DFT implementation
 */
function performFFT(
  audioData: Float32Array,
  fftSize: number,
  sampleRate: number
): number[] {
  const n = Math.min(audioData.length, fftSize);
  const halfSize = Math.floor(fftSize / 2);
  const result: number[] = new Array(halfSize).fill(0);

  if (n === 0) return result;

  // Perform DFT (Discrete Fourier Transform)
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
 */
function extractFrequencyRange(
  fftData: number[],
  fftSize: number,
  sampleRate: number,
  height: number
): number[] {
  const result: number[] = new Array(height).fill(0);

  // Calculate frequency resolution (Hz per bin)
  const frequencyResolution = sampleRate / fftSize;

  // Find FFT bin indices for 20Hz and 20KHz
  const minBin = Math.max(0, Math.floor(MIN_FREQUENCY / frequencyResolution));
  const maxBin = Math.min(
    fftData.length - 1,
    Math.ceil(MAX_FREQUENCY / frequencyResolution)
  );

  const rangeBins = maxBin - minBin + 1;

  if (rangeBins <= 0) {
    return result;
  }

  // Resample the frequency range to fit the desired height
  for (let i = 0; i < height; i++) {
    // Map output bin to input bin range
    const inputPosition = minBin + (i / (height - 1)) * (rangeBins - 1);
    const inputIndex = Math.floor(inputPosition);
    const fraction = inputPosition - inputIndex;

    // Linear interpolation between adjacent bins
    if (inputIndex < fftData.length - 1) {
      result[i] =
        fftData[inputIndex] * (1 - fraction) +
        fftData[inputIndex + 1] * fraction;
    } else {
      result[i] = fftData[inputIndex];
    }
  }

  return result;
}

/**
 * Normalize frequency data to 0-1 range
 */
function normalizeFrequencyData(frequencyData: number[]): number[] {
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
 * Handle messages from main thread
 */
self.onmessage = (event: MessageEvent<SpectrogramRequest>) => {
  const { type, audioData, width, height, sampleRate, requestId } = event.data;

  if (type === 'generate') {
    try {
      // Validate inputs
      if (!audioData || audioData.length === 0) {
        throw new Error('Invalid audio data: empty or null');
      }

      if (width <= 0 || height <= 0) {
        throw new Error('Invalid dimensions: width and height must be greater than 0');
      }

      if (sampleRate <= 0) {
        throw new Error('Invalid sample rate: must be greater than 0');
      }

      // Generate spectrogram
      const spectrogramData = generateSpectrogram(audioData, width, height, sampleRate);

      // Send success response
      const response: SpectrogramResponse = {
        type: 'success',
        requestId,
        spectrogramData,
      };
      self.postMessage(response);
    } catch (error) {
      // Send error response
      const response: SpectrogramResponse = {
        type: 'error',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      self.postMessage(response);
    }
  }
};

// Export empty object to make TypeScript happy
export {};
