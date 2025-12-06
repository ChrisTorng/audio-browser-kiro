/**
 * VisualizationService - Generate waveform and spectrogram images using ffmpeg
 * Manages caching of generated images in the cache directory
 */
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { spawn } from 'child_process';

export type VisualizationType = 'waveform' | 'spectrogram' | 'both';

export interface VisualizationResult {
  imagePath: string;
  cached: boolean;
}

/**
 * Service for generating audio visualizations using ffmpeg
 */
export class VisualizationService {
  private cacheDir: string;
  private waveformDir: string;
  private spectrogramDir: string;

  /**
   * Create a new VisualizationService
   * @param cacheDir - Root cache directory (default: ./cache)
   */
  constructor(cacheDir: string = path.join(process.cwd(), 'cache')) {
    this.cacheDir = cacheDir;
    this.waveformDir = path.join(cacheDir, 'waveforms');
    this.spectrogramDir = path.join(cacheDir, 'spectrograms');
  }

  /**
   * Initialize cache directories
   */
  private async ensureCacheDirectories(): Promise<void> {
    await fs.mkdir(this.waveformDir, { recursive: true });
    await fs.mkdir(this.spectrogramDir, { recursive: true });
  }

  /**
   * Get cache path for a given audio file and visualization type
   * @param relativeFilePath - Relative path of audio file
   * @param type - Visualization type
   * @returns Absolute path to cached image
   */
  getCachedPath(relativeFilePath: string, type: Exclude<VisualizationType, 'both'>): string {
    // Convert relative path to cache filename (replace slashes with underscores)
    const cacheFilename = relativeFilePath.replace(/\//g, '_') + '.png';
    
    if (type === 'waveform') {
      return path.join(this.waveformDir, cacheFilename);
    } else {
      return path.join(this.spectrogramDir, cacheFilename);
    }
  }

  /**
   * Generate waveform image using ffmpeg
   * @param audioPath - Absolute path to audio file
   * @param relativeFilePath - Relative path of audio file (for cache key)
   * @returns Visualization result with image path and cached status
   */
  async generateWaveform(audioPath: string, relativeFilePath: string): Promise<VisualizationResult> {
    await this.ensureCacheDirectories();

    const cachePath = this.getCachedPath(relativeFilePath, 'waveform');

    // Check if cached image exists
    if (existsSync(cachePath)) {
      return {
        imagePath: cachePath,
        cached: true,
      };
    }

    // Verify audio file exists
    if (!existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    // Generate waveform using ffmpeg
    // showwavespic filter generates waveform visualization
    await this.runFfmpeg([
      '-i', audioPath,
      '-filter_complex', 'showwavespic=s=800x200:colors=white',
      '-frames:v', '1',
      '-y',
      cachePath
    ]);

    return {
      imagePath: cachePath,
      cached: false,
    };
  }

  /**
   * Generate spectrogram image using ffmpeg
   * @param audioPath - Absolute path to audio file
   * @param relativeFilePath - Relative path of audio file (for cache key)
   * @returns Visualization result with image path and cached status
   */
  async generateSpectrogram(audioPath: string, relativeFilePath: string): Promise<VisualizationResult> {
    await this.ensureCacheDirectories();

    const cachePath = this.getCachedPath(relativeFilePath, 'spectrogram');

    // Check if cached image exists
    if (existsSync(cachePath)) {
      return {
        imagePath: cachePath,
        cached: true,
      };
    }

    // Verify audio file exists
    if (!existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    // Generate spectrogram using ffmpeg
    // showspectrumpic filter generates spectrogram visualization
    // Display frequency range: 20Hz to 20KHz (human hearing range)
    await this.runFfmpeg([
      '-i', audioPath,
      '-filter_complex', 'showspectrumpic=s=800x200:mode=combined:color=fire:scale=log:fscale=log:legend=0',
      '-frames:v', '1',
      '-y',
      cachePath
    ]);

    return {
      imagePath: cachePath,
      cached: false,
    };
  }

  /**
   * Clear cache for a specific file
   * @param relativeFilePath - Relative path of audio file
   * @param type - Visualization type to clear (default: 'both')
   */
  async clearCache(relativeFilePath: string, type: VisualizationType = 'both'): Promise<void> {
    const tasks: Promise<void>[] = [];

    if (type === 'waveform' || type === 'both') {
      const waveformPath = this.getCachedPath(relativeFilePath, 'waveform');
      tasks.push(this.deleteFileIfExists(waveformPath));
    }

    if (type === 'spectrogram' || type === 'both') {
      const spectrogramPath = this.getCachedPath(relativeFilePath, 'spectrogram');
      tasks.push(this.deleteFileIfExists(spectrogramPath));
    }

    await Promise.all(tasks);
  }

  /**
   * Clear all cached visualizations
   */
  async clearAllCache(): Promise<void> {
    await this.deleteDirectoryContents(this.waveformDir);
    await this.deleteDirectoryContents(this.spectrogramDir);
  }

  /**
   * Delete file if it exists
   * @param filePath - Path to file
   */
  private async deleteFileIfExists(filePath: string): Promise<void> {
    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      // Ignore errors (file might not exist)
    }
  }

  /**
   * Delete all files in a directory
   * @param dirPath - Path to directory
   */
  private async deleteDirectoryContents(dirPath: string): Promise<void> {
    try {
      if (existsSync(dirPath)) {
        const files = await fs.readdir(dirPath);
        await Promise.all(
          files.map(file => fs.unlink(path.join(dirPath, file)))
        );
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Run ffmpeg command
   * @param args - ffmpeg arguments
   */
  private async runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`ffmpeg execution failed: ${error.message}`));
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
        }
      });
    });
  }
}
