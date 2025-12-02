import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';

/**
 * Range request information
 */
export interface RangeInfo {
  start: number;
  end: number;
  total: number;
}

/**
 * Audio stream result
 */
export interface AudioStreamResult {
  stream: Readable;
  mimeType: string;
  range?: RangeInfo;
  stats: {
    size: number;
    mtime: Date;
  };
}

/**
 * Service for handling audio file streaming and validation
 */
export class AudioService {
  private readonly mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
  };

  /**
   * Validate audio file path to prevent path traversal attacks
   * @param filePath - File path to validate
   * @param rootPath - Root directory path (base path for validation)
   * @throws Error if path is invalid or outside root directory
   */
  validateAudioFilePath(filePath: string, rootPath: string): void {
    // Check if path contains suspicious patterns before normalization
    if (filePath.includes('..') || filePath.startsWith('/')) {
      throw new Error('Invalid file path: Suspicious path pattern detected');
    }

    // Resolve absolute paths
    const resolvedFilePath = path.resolve(rootPath, filePath);
    const resolvedRootPath = path.resolve(rootPath);

    // Check if resolved path is within root directory
    if (!resolvedFilePath.startsWith(resolvedRootPath + path.sep) && resolvedFilePath !== resolvedRootPath) {
      throw new Error('Invalid file path: Path traversal detected');
    }
  }

  /**
   * Get MIME type for audio file based on extension
   * @param filePath - File path
   * @returns MIME type string
   */
  getAudioMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return this.mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Parse Range header and calculate byte range
   * @param rangeHeader - Range header value (e.g., "bytes=0-1023")
   * @param fileSize - Total file size in bytes
   * @returns RangeInfo object or null if invalid
   */
  parseRangeHeader(rangeHeader: string, fileSize: number): RangeInfo | null {
    // Parse "bytes=start-end" format
    const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
    if (!match) {
      return null;
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    // Validate range
    if (start >= fileSize || end >= fileSize || start > end) {
      return null;
    }

    return {
      start,
      end,
      total: fileSize,
    };
  }

  /**
   * Stream audio file with optional Range request support
   * @param filePath - Relative file path
   * @param rootPath - Root directory path
   * @param rangeHeader - Optional Range header value
   * @returns AudioStreamResult with stream and metadata
   * @throws Error if file is invalid or inaccessible
   */
  async streamAudio(
    filePath: string,
    rootPath: string,
    rangeHeader?: string
  ): Promise<AudioStreamResult> {
    // Validate path to prevent path traversal
    this.validateAudioFilePath(filePath, rootPath);

    // Resolve full file path
    const fullPath = path.resolve(rootPath, filePath);

    // Check if file exists and is accessible
    try {
      const stats = await fs.stat(fullPath);
      
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      const fileSize = stats.size;
      const mimeType = this.getAudioMimeType(filePath);

      // Handle Range request if provided
      if (rangeHeader) {
        const range = this.parseRangeHeader(rangeHeader, fileSize);
        
        if (range) {
          // Create stream with range
          const stream = createReadStream(fullPath, {
            start: range.start,
            end: range.end,
          });

          return {
            stream,
            mimeType,
            range,
            stats: {
              size: fileSize,
              mtime: stats.mtime,
            },
          };
        }
      }

      // Create full file stream
      const stream = createReadStream(fullPath);

      return {
        stream,
        mimeType,
        range: {
          start: 0,
          end: fileSize - 1,
          total: fileSize,
        },
        stats: {
          size: fileSize,
          mtime: stats.mtime,
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error(`Permission denied: ${filePath}`);
      }
      throw error;
    }
  }
}
