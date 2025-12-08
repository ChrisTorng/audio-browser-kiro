/**
 * VisualizationService - Generate waveform and spectrogram images using gen_visuals.py
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
 * Service for generating audio visualizations using the Python generator script
 */
export class VisualizationService {
  private cacheDir: string;
  private waveformDir: string;
  private spectrogramDir: string;
  private placeholderDir: string;
  private errorWaveformPath: string;
  private errorSpectrogramPath: string;
  private generatorScriptPath: string;
  private pythonCommand: string;

  /**
   * Create a new VisualizationService
   * @param cacheDir - Root cache directory (default: ./cache)
   */
  constructor(cacheDir: string = path.join(process.cwd(), 'cache')) {
    this.cacheDir = cacheDir;
    this.waveformDir = path.join(cacheDir, 'waveforms');
    this.spectrogramDir = path.join(cacheDir, 'spectrograms');
    this.placeholderDir = path.join(cacheDir, 'placeholders');
    this.errorWaveformPath = path.join(this.placeholderDir, 'error-waveform.png');
    this.errorSpectrogramPath = path.join(this.placeholderDir, 'error-spectrogram.png');
    this.generatorScriptPath = path.join(process.cwd(), 'scripts', 'gen_visuals.py');

    const venvPython = process.platform === 'win32'
      ? path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')
      : path.join(process.cwd(), '.venv', 'bin', 'python');

    if (process.env.PYTHON_PATH) {
      this.pythonCommand = process.env.PYTHON_PATH;
    } else if (existsSync(venvPython)) {
      this.pythonCommand = venvPython;
    } else {
      this.pythonCommand = 'python3';
    }
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
   * Generate waveform image using the Python generator script
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

    try {
      // Generate waveform using the Python helper script
      await this.runGenVisuals({
        audioPath,
        outputPath: cachePath,
        type: 'waveform',
      });

      // Verify that the output file was actually created and is not empty
      if (!existsSync(cachePath)) {
        throw new Error('visual generation completed but output file was not created');
      }

      const stats = await fs.stat(cachePath);
      if (stats.size === 0) {
        // Remove empty file
        await fs.unlink(cachePath);
        throw new Error('visual generation created an empty output file');
      }

      return {
        imagePath: cachePath,
        cached: false,
      };
    } catch (error) {
      // On error, create hard link to error placeholder
      await this.createErrorPlaceholder(cachePath, 'waveform');
      return {
        imagePath: cachePath,
        cached: false,
      };
    }
  }

  /**
   * Generate spectrogram image using the Python generator script
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

    try {
      // Generate spectrogram using the Python helper script
      await this.runGenVisuals({
        audioPath,
        outputPath: cachePath,
        type: 'spectrogram',
      });

      // Verify that the output file was actually created and is not empty
      if (!existsSync(cachePath)) {
        throw new Error('visual generation completed but output file was not created');
      }

      const stats = await fs.stat(cachePath);
      if (stats.size === 0) {
        // Remove empty file
        await fs.unlink(cachePath);
        throw new Error('visual generation created an empty output file');
      }

      return {
        imagePath: cachePath,
        cached: false,
      };
    } catch (error) {
      // On error, create hard link to error placeholder
      await this.createErrorPlaceholder(cachePath, 'spectrogram');
      return {
        imagePath: cachePath,
        cached: false,
      };
    }
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
   * Create hard link to error placeholder image
   * @param targetPath - Target path for the hard link
   * @param type - Visualization type
   */
  private async createErrorPlaceholder(targetPath: string, type: 'waveform' | 'spectrogram'): Promise<void> {
    const placeholderPath = type === 'waveform' ? this.errorWaveformPath : this.errorSpectrogramPath;
    
    try {
      // Check if placeholder exists
      if (!existsSync(placeholderPath)) {
        throw new Error(`Error placeholder not found: ${placeholderPath}`);
      }

      // Create hard link (if target already exists, remove it first)
      if (existsSync(targetPath)) {
        await fs.unlink(targetPath);
      }
      
      await fs.link(placeholderPath, targetPath);
    } catch (error) {
      // If hard link fails (e.g., cross-device), fall back to copy
      try {
        await fs.copyFile(placeholderPath, targetPath);
      } catch (copyError) {
        throw new Error(`Failed to create error placeholder: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Run gen_visuals.py to generate a visualization image
   * @param options - Generation options
   */
  private async runGenVisuals(options: {
    audioPath: string;
    outputPath: string;
    type: Exclude<VisualizationType, 'both'>;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!existsSync(this.generatorScriptPath)) {
        reject(new Error(`gen_visuals.py not found at ${this.generatorScriptPath}`));
        return;
      }

      const args = [
        this.generatorScriptPath,
        '--file',
        options.audioPath,
        '--type',
        options.type,
      ];

      if (options.type === 'waveform') {
        args.push('--waveform-output', options.outputPath);
      } else {
        args.push('--spectrogram-output', options.outputPath);
      }

      args.push('--force');

      const generator = spawn(this.pythonCommand, args);
      let stderr = '';

      if (generator.stderr) {
        generator.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      generator.on('error', (error) => {
        reject(new Error(`gen_visuals.py execution failed: ${error.message}`));
      });

      generator.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`gen_visuals.py exited with code ${code}: ${stderr}`));
        }
      });
    });
  }
}
