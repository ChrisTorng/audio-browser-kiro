import {
  DirectoryTree,
  AudioMetadata,
  ScanDirectoryRequest,
  ScanDirectoryResponse,
  GetMetadataResponse,
  UpdateMetadataRequest,
  UpdateMetadataResponse,
  DeleteMetadataResponse,
  ApiErrorResponse,
} from '../../shared/types';

/**
 * API client for Audio Browser backend
 */
export class AudioBrowserAPI {
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    baseUrl: string = '/api',
    maxRetries: number = 3,
    retryDelay: number = 1000
  ) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Scan directory for audio files
   * @param path - Directory path to scan
   * @returns Directory tree structure
   */
  async scanDirectory(path: string): Promise<DirectoryTree> {
    const request: ScanDirectoryRequest = { path };

    const response = await this.fetchWithRetry<ScanDirectoryResponse>(
      `${this.baseUrl}/scan`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    return response.tree;
  }

  /**
   * Get audio file as Blob
   * @param filePath - Relative path to audio file
   * @returns Audio file as Blob
   */
  async getAudioFile(filePath: string): Promise<Blob> {
    // Encode the file path for URL
    const encodedPath = encodeURIComponent(filePath);

    const response = await this.fetchWithRetry<Response>(
      `${this.baseUrl}/audio/${encodedPath}`,
      {
        method: 'GET',
      },
      false // Don't parse as JSON
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * Get all metadata
   * @returns Record of file paths to metadata
   */
  async getAllMetadata(): Promise<Record<string, AudioMetadata>> {
    const response = await this.fetchWithRetry<GetMetadataResponse>(
      `${this.baseUrl}/metadata`,
      {
        method: 'GET',
      }
    );

    return response.metadata;
  }

  /**
   * Update metadata for an audio file
   * @param filePath - Relative path to audio file
   * @param rating - Rating (0-3)
   * @param description - Description text
   * @returns Updated metadata
   */
  async updateMetadata(
    filePath: string,
    rating?: number,
    description?: string
  ): Promise<AudioMetadata> {
    const request: UpdateMetadataRequest = {
      filePath,
      rating,
      description,
    };

    const response = await this.fetchWithRetry<UpdateMetadataResponse>(
      `${this.baseUrl}/metadata`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    return response.metadata;
  }

  /**
   * Delete metadata for an audio file
   * @param filePath - Relative path to audio file
   * @returns Success status
   */
  async deleteMetadata(filePath: string): Promise<boolean> {
    const encodedPath = encodeURIComponent(filePath);

    const response = await this.fetchWithRetry<DeleteMetadataResponse>(
      `${this.baseUrl}/metadata/${encodedPath}`,
      {
        method: 'DELETE',
      }
    );

    return response.success;
  }

  /**
   * Fetch with retry logic and error handling
   * @param url - URL to fetch
   * @param options - Fetch options
   * @param parseJson - Whether to parse response as JSON
   * @returns Response or parsed JSON
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    parseJson: boolean = true
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // If not parsing JSON, return the response directly
        if (!parseJson) {
          return response as unknown as T;
        }

        // Handle error responses
        if (!response.ok) {
          const errorData = (await response.json()) as ApiErrorResponse;
          throw new Error(
            `API Error: ${errorData.error.message} (${errorData.error.code})`
          );
        }

        // Parse and return JSON response
        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (
          error instanceof Error &&
          error.message.includes('API Error') &&
          !error.message.includes('500')
        ) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Request failed after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Delay helper for retry logic
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const audioBrowserAPI = new AudioBrowserAPI();
