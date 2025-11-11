import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '../../../src/server/services/configService';
import { promises as fs } from 'fs';
import path from 'path';

describe('ConfigService', () => {
  const testDir = path.join(__dirname, 'test-config');
  const testConfigPath = path.join(testDir, 'config.json');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    it('should load valid configuration file', async () => {
      // Create valid config file
      const validConfig = {
        audioDirectory: '../music-player',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(validConfig, null, 2));

      const configService = new ConfigService(testConfigPath);
      const config = await configService.loadConfig();

      expect(config).toEqual(validConfig);
      expect(config.audioDirectory).toBe('../music-player');
    });

    it('should throw error if config file does not exist', async () => {
      const nonExistentPath = path.join(testDir, 'non-existent.json');
      const configService = new ConfigService(nonExistentPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /Configuration file not found/
      );
    });

    it('should throw error if config file has invalid JSON', async () => {
      // Create invalid JSON file
      await fs.writeFile(testConfigPath, '{ invalid json }');

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /Invalid JSON format/
      );
    });

    it('should throw error if audioDirectory field is missing', async () => {
      // Create config without audioDirectory
      const invalidConfig = {
        someOtherField: 'value',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /must include "audioDirectory" field/
      );
    });

    it('should throw error if audioDirectory is not a string', async () => {
      // Create config with non-string audioDirectory
      const invalidConfig = {
        audioDirectory: 123,
      };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /must include "audioDirectory" field as a string/
      );
    });

    it('should throw error if audioDirectory is empty string', async () => {
      // Create config with empty audioDirectory
      const invalidConfig = {
        audioDirectory: '',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /"audioDirectory" cannot be empty/
      );
    });

    it('should throw error if audioDirectory is whitespace only', async () => {
      // Create config with whitespace-only audioDirectory
      const invalidConfig = {
        audioDirectory: '   ',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /"audioDirectory" cannot be empty/
      );
    });

    it('should throw error if config is not an object', async () => {
      // Create config that is an array
      await fs.writeFile(testConfigPath, JSON.stringify(['not', 'an', 'object']));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /Configuration must be a valid object/
      );
    });

    it('should cache loaded configuration', async () => {
      const validConfig = {
        audioDirectory: '../music-player',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(validConfig));

      const configService = new ConfigService(testConfigPath);
      const config1 = await configService.loadConfig();
      const config2 = await configService.loadConfig();

      expect(config1).toEqual(config2);
      expect(configService.isLoaded()).toBe(true);
    });
  });

  describe('getAudioDirectory', () => {
    it('should return audio directory path after loading config', async () => {
      const validConfig = {
        audioDirectory: '../music-player',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(validConfig));

      const configService = new ConfigService(testConfigPath);
      await configService.loadConfig();

      const audioDir = configService.getAudioDirectory();
      expect(audioDir).toBe('../music-player');
    });

    it('should throw error if config is not loaded', () => {
      const configService = new ConfigService(testConfigPath);

      expect(() => configService.getAudioDirectory()).toThrow(
        /Configuration not loaded/
      );
    });
  });

  describe('getAudioDirectoryAbsolutePath', () => {
    it('should return absolute path of audio directory', async () => {
      const validConfig = {
        audioDirectory: '../music-player',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(validConfig));

      const configService = new ConfigService(testConfigPath);
      await configService.loadConfig();

      const absolutePath = configService.getAudioDirectoryAbsolutePath();
      expect(path.isAbsolute(absolutePath)).toBe(true);
      expect(absolutePath).toContain('music-player');
    });

    it('should throw error if config is not loaded', () => {
      const configService = new ConfigService(testConfigPath);

      expect(() => configService.getAudioDirectoryAbsolutePath()).toThrow(
        /Configuration not loaded/
      );
    });
  });

  describe('isLoaded', () => {
    it('should return false before loading config', () => {
      const configService = new ConfigService(testConfigPath);

      expect(configService.isLoaded()).toBe(false);
    });

    it('should return true after loading config', async () => {
      const validConfig = {
        audioDirectory: '../music-player',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(validConfig));

      const configService = new ConfigService(testConfigPath);
      await configService.loadConfig();

      expect(configService.isLoaded()).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return null before loading config', () => {
      const configService = new ConfigService(testConfigPath);

      expect(configService.getConfig()).toBeNull();
    });

    it('should return config object after loading', async () => {
      const validConfig = {
        audioDirectory: '../music-player',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(validConfig));

      const configService = new ConfigService(testConfigPath);
      await configService.loadConfig();

      const config = configService.getConfig();
      expect(config).toEqual(validConfig);
    });
  });

  describe('default config path', () => {
    it('should use default config.json path when not specified', () => {
      const configService = new ConfigService();

      // Should not throw error when instantiating
      expect(configService).toBeDefined();
      expect(configService.isLoaded()).toBe(false);
    });
  });
});
