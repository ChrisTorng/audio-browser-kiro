/**
 * WaveformGenerator - Generate waveform data from audio sources
 * Supports generating from AudioBuffer and Blob with downsampling
 */
export class WaveformGenerator {
  /**
   * Generate waveform data from AudioBuffer
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
