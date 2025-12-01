/**
 * Web Worker for background waveform generation
 * Processes audio data without blocking the main thread
 */

interface WaveformRequest {
  type: 'generate';
  audioData: Float32Array;
  width: number;
  requestId: string;
}

interface WaveformResponse {
  type: 'success' | 'error';
  requestId: string;
  waveformData?: number[];
  error?: string;
}

/**
 * Generate waveform data from audio samples
 */
function generateWaveform(audioData: Float32Array, width: number): number[] {
  const samples = audioData.length;
  const blockSize = Math.floor(samples / width);
  const waveform: number[] = [];

  // Downsample audio data to fit display width
  for (let i = 0; i < width; i++) {
    const start = i * blockSize;
    const end = start + blockSize;
    let sum = 0;

    // Calculate RMS (Root Mean Square) for this block
    for (let j = start; j < end && j < samples; j++) {
      sum += audioData[j] * audioData[j];
    }

    const rms = Math.sqrt(sum / blockSize);
    waveform.push(rms);
  }

  // Normalize waveform data to 0-1 range
  const max = Math.max(...waveform);
  const normalized = max > 0 ? waveform.map(v => v / max) : waveform;

  return normalized;
}

/**
 * Handle messages from main thread
 */
self.onmessage = (event: MessageEvent<WaveformRequest>) => {
  const { type, audioData, width, requestId } = event.data;

  if (type === 'generate') {
    try {
      // Validate inputs
      if (!audioData || audioData.length === 0) {
        throw new Error('Invalid audio data: empty or null');
      }

      if (width <= 0) {
        throw new Error('Invalid width: must be greater than 0');
      }

      // Generate waveform
      const waveformData = generateWaveform(audioData, width);

      // Send success response
      const response: WaveformResponse = {
        type: 'success',
        requestId,
        waveformData,
      };
      self.postMessage(response);
    } catch (error) {
      // Send error response
      const response: WaveformResponse = {
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
