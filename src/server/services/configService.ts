import { promises as fs } from 'fs';
import path from 'path';
import JSON5 from 'json5';

/**
 * Audio directory configuration
 */
export interface AudioDirectory {
  path: string;
  displayName: string;
}

/**
 * Configuration interface
 */
export interface Config {
  audioDirectories: AudioDirectory[];
}

/**
 * Service for managing application configuration
 * Loads and validates config.json file
 */
export class ConfigService {
  private config: Config | null = null;
  private readonly configPath: string;

  constructor(configPath = 'config.json') {
    this.configPath = configPath;
  }

  /**
   * Load configuration from config.json
   * @throws Error if config file doesn't exist or is invalid
   * @returns Loaded configuration
   */
  async loadConfig(): Promise<Config> {
    try {
      // Check if config file exists
      await fs.access(this.configPath);
      
      // Read and parse config file with JSON5 to support comments
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON5.parse(configContent);
      
      // Validate config structure
      this.validateConfig(parsedConfig);
      
      // Cache the config
      this.config = parsedConfig;
      
      console.log(`Configuration loaded successfully from ${this.configPath}`);
      return this.config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(
          `Configuration file not found: ${this.configPath}. ` +
          `Please create a config.json file with the required settings.`
        );
      }
      
      if (error instanceof SyntaxError) {
        throw new Error(
          `Invalid JSON format in configuration file: ${this.configPath}. ` +
          `Please check the file syntax.`
        );
      }
      
      throw error;
    }
  }

  /**
   * Validate configuration object
   * @param config - Configuration object to validate
   * @throws Error if configuration is invalid
   */
  private validateConfig(config: unknown): asserts config is Config {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('Configuration must be a valid object');
    }

    const cfg = config as Record<string, unknown>;

    // Check if audioDirectories exists
    if (!('audioDirectories' in cfg)) {
      throw new Error(
        'Configuration must include "audioDirectories" field as an array'
      );
    }

    if (!Array.isArray(cfg.audioDirectories)) {
      throw new Error(
        'Configuration field "audioDirectories" must be an array'
      );
    }

    if (cfg.audioDirectories.length === 0) {
      throw new Error(
        'Configuration field "audioDirectories" cannot be empty'
      );
    }

    // Validate each directory entry
    for (const dir of cfg.audioDirectories) {
      if (!dir || typeof dir !== 'object' || Array.isArray(dir)) {
        throw new Error(
          'Each audio directory entry must be a valid object'
        );
      }

      const dirObj = dir as Record<string, unknown>;

      if (!('path' in dirObj)) {
        throw new Error(
          'Each audio directory entry must include "path" field'
        );
      }

      if (typeof dirObj.path !== 'string') {
        throw new Error(
          'Audio directory "path" field must be a string'
        );
      }

      if (dirObj.path.trim() === '') {
        throw new Error(
          'Audio directory "path" cannot be empty'
        );
      }

      if (!('displayName' in dirObj)) {
        throw new Error(
          'Each audio directory entry must include "displayName" field'
        );
      }

      if (typeof dirObj.displayName !== 'string') {
        throw new Error(
          'Audio directory "displayName" field must be a string'
        );
      }

      if (dirObj.displayName.trim() === '') {
        throw new Error(
          'Audio directory "displayName" cannot be empty'
        );
      }
    }
  }

  /**
   * Get first audio directory path from configuration (for backward compatibility)
   * @throws Error if configuration is not loaded
   * @returns First audio directory path
   */
  getAudioDirectory(): string {
    if (!this.config) {
      throw new Error(
        'Configuration not loaded. Call loadConfig() first.'
      );
    }

    if (this.config.audioDirectories.length === 0) {
      throw new Error('No audio directories configured');
    }

    return this.config.audioDirectories[0].path;
  }

  /**
   * Get all audio directories with display names
   * @throws Error if configuration is not loaded
   * @returns Array of audio directories with paths and display names
   */
  getAudioDirectories(): AudioDirectory[] {
    if (!this.config) {
      throw new Error(
        'Configuration not loaded. Call loadConfig() first.'
      );
    }

    return this.config.audioDirectories;
  }

  /**
   * Get resolved absolute path of audio directory
   * @throws Error if configuration is not loaded
   * @returns Absolute path to audio directory
   * @deprecated Use resolveFilePath() for multi-directory support
   */
  getAudioDirectoryAbsolutePath(): string {
    const audioDir = this.getAudioDirectory();
    return path.resolve(audioDir);
  }

  /**
   * Resolve a file path that includes displayName prefix to absolute path
   * Path format: "displayName/relative/path/to/file.mp3"
   * @param displayNamePath - Path with displayName prefix
   * @throws Error if configuration is not loaded or displayName not found
   * @returns Absolute path to the file
   */
  resolveFilePath(displayNamePath: string): string {
    if (!this.config) {
      throw new Error(
        'Configuration not loaded. Call loadConfig() first.'
      );
    }

    // Extract displayName from path (first segment)
    const firstSlash = displayNamePath.indexOf('/');
    
    if (firstSlash === -1) {
      // No slash - the entire path is the displayName (directory root)
      const audioDir = this.config.audioDirectories.find(
        dir => dir.displayName === displayNamePath
      );
      if (!audioDir) {
        throw new Error(`Audio directory not found: ${displayNamePath}`);
      }
      return path.resolve(audioDir.path);
    }

    const displayName = displayNamePath.substring(0, firstSlash);
    const relativePath = displayNamePath.substring(firstSlash + 1);

    // Find matching audio directory
    const audioDir = this.config.audioDirectories.find(
      dir => dir.displayName === displayName
    );

    if (!audioDir) {
      throw new Error(`Audio directory not found: ${displayName}`);
    }

    // Resolve to absolute path
    return path.resolve(audioDir.path, relativePath);
  }

  /**
   * Check if configuration is loaded
   * @returns true if configuration is loaded
   */
  isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Get current configuration (if loaded)
   * @returns Current configuration or null
   */
  getConfig(): Config | null {
    return this.config;
  }
}
