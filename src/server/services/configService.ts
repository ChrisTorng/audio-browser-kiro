import { promises as fs } from 'fs';
import path from 'path';

/**
 * Configuration interface
 */
export interface Config {
  audioDirectory: string;
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
      
      // Read and parse config file
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configContent);
      
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

    if (!('audioDirectory' in cfg)) {
      throw new Error(
        'Configuration must include "audioDirectory" field as a string'
      );
    }

    if (typeof cfg.audioDirectory !== 'string') {
      throw new Error(
        'Configuration must include "audioDirectory" field as a string'
      );
    }

    if (cfg.audioDirectory.trim() === '') {
      throw new Error('Configuration field "audioDirectory" cannot be empty');
    }
  }

  /**
   * Get audio directory path from configuration
   * @throws Error if configuration is not loaded
   * @returns Audio directory path
   */
  getAudioDirectory(): string {
    if (!this.config) {
      throw new Error(
        'Configuration not loaded. Call loadConfig() first.'
      );
    }

    return this.config.audioDirectory;
  }

  /**
   * Get resolved absolute path of audio directory
   * @throws Error if configuration is not loaded
   * @returns Absolute path to audio directory
   */
  getAudioDirectoryAbsolutePath(): string {
    const audioDir = this.getAudioDirectory();
    return path.resolve(audioDir);
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
