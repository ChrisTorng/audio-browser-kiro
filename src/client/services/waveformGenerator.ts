/**
 * WaveformGenerator - Generate waveform data from audio sources
 * Supports generating from AudioBuffer and Blob with downsampling
 * Uses Web Workers for background processing to avoid blocking the main thread
 */
export class WaveformGenerator {
  private worker: Worker | null = null;
  private requestCounter = 0;
  private pendingRequests = new Map<string, {
    resolve: (data: number[]) => void;
    reject: (error: Error) => void;
  }>();

  /**
   * Initialize Web Worker for background processing
   */
  private initWorker(): void {
    if (this.worker) return;

    try {
      // Create worker from inline code to avoid bundling issues
      const workerCode = `
        function generateWaveform(audioData, width) {
          const samples = audioData.length;
          const blockSize = Math.floor(samples / width);
          const waveform = [];

          for (let i = 0; i < width; i++) {
            const start = i * blockSize;
            const end = start + blockSize;
            let sum = 0;

            for (let j = start; j < end && j < samples; j++) {
              sum += audioData[j] * audioData[j];
            }

            const rms = Math.sqrt(sum / blockSize);
            waveform.push(rms);
          }

          const max = Math.max(...waveform);
          const normalized = max > 0 ? waveform.map(v => v / max) : waveform;

          return normalized;
        }

        self.onmessage = (event) => {
          const { type, audioData, width, requestId } = event.data;

          if (type === 'generate') {
            try {
              if (!audioData || audioData.length === 0) {
                throw new Error('Invalid audio data: empty or null');
              }

              if (width <= 0) {
                throw new Error('Invalid width: must be greater than 0');
              }

              const waveformData = generateWaveform(audioData, width);

              self.postMessage({
                type: 'success',
                requestId,
                waveformData,
              });
            } catch (error) {
              self.postMessage({
                type: 'error',
                requestId,
                error: error.message || 'Unknown error',
              });
            }
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      // Handle worker messages
      this.worker.onmessage = (event) => {
        const { type, requestId, waveformData, error } = event.data;
        const request = this.pendingRequests.get(requestId);

        if (!request) return;

        this.pendingRequests.delete(requestId);

        if (type === 'success') {
          request.resolve(waveformData);
        } else if (type === 'error') {
          request.reject(new Error(error));
        }
      };

      // Handle worker errors
      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        // Reject all pending requests
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Worker error'));
        });
        this.pendingRequests.clear();
      };
    } catch (error) {
      console.warn('Failed to initialize Web Worker, falling back to main thread:', error);
      this.worker = null;
    }
  }

  /**
   * Generate waveform data from AudioBuffer (synchronous, main thread)
   * @param audioBuffer - Web Audio API AudioBuffer
   * @param width - Number of data points for display width
   * @returns Array of normalized waveform values (0-1)
   */
  generateFromAudioBuffer(audioBuffer: AudioBuffer, width: number): number[] {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Invalid AudioBuffer: buffer is empty or null');
    }

    if (width <= 0) {
      throw new Error('Invalid width: must be greater than 0');
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

    return normalized;
  }

  /**
   * Generate waveform data from AudioBuffer in background (asynchronous, Web Worker)
   * @param audioBuffer - Web Audio API AudioBuffer
   * @param width - Number of data points for display width
   * @returns Promise resolving to array of normalized waveform values (0-1)
   */
  async generateFromAudioBufferAsync(audioBuffer: AudioBuffer, width: number): Promise<number[]> {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Invalid AudioBuffer: buffer is empty or null');
    }

    if (width <= 0) {
      throw new Error('Invalid width: must be greater than 0');
    }

    // Initialize worker if needed
    this.initWorker();

    // If worker is not available, fall back to synchronous generation
    if (!this.worker) {
      return this.generateFromAudioBuffer(audioBuffer, width);
    }

    // Generate unique request ID
    const requestId = `waveform-${++this.requestCounter}`;

    // Create promise for this request
    const promise = new Promise<number[]>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
    });

    // Get audio data from first channel
    const audioData = audioBuffer.getChannelData(0);

    // Send request to worker
    this.worker.postMessage({
      type: 'generate',
      audioData,
      width,
      requestId,
    });

    return promise;
  }

  /**
   * Cancel a pending waveform generation request
   * @param requestId - Request ID to cancel
   */
  cancelRequest(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      this.pendingRequests.delete(requestId);
      request.reject(new Error('Request cancelled'));
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('All requests cancelled'));
    });
    this.pendingRequests.clear();
  }

  /**
   * Terminate the Web Worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.cancelAllRequests();
  }

  /**
   * Generate waveform data from Blob
   * @param audioBlob - Audio file as Blob
   * @param width - Number of data points for display width
   * @returns Promise resolving to array of normalized waveform values (0-1)
   */
  async generateFromBlob(audioBlob: Blob, width: number): Promise<number[]> {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Invalid Blob: blob is empty or null');
    }

    if (width <= 0) {
      throw new Error('Invalid width: must be greater than 0');
    }

    // Create AudioContext
    const audioContext = new AudioContext();

    try {
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await this.blobToArrayBuffer(audioBlob);

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Generate waveform from AudioBuffer
      return this.generateFromAudioBuffer(audioBuffer, width);
    } catch (error) {
      throw new Error(
        `Failed to generate waveform from Blob: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      // Clean up AudioContext (if close method exists)
      if (typeof audioContext.close === 'function') {
        await audioContext.close();
      }
    }
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
export const waveformGenerator = new WaveformGenerator();
