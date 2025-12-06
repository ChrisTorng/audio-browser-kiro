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
    it('should load valid configuration file with multiple directories', async () => {
      // Create valid config file
      const validConfig = {
        audioDirectories: [
          { path: '../music-player', displayName: 'Music Library' },
          { path: '../podcasts', displayName: 'Podcasts' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(validConfig, null, 2));

      const configService = new ConfigService(testConfigPath);
      const config = await configService.loadConfig();

      expect(config).toEqual(validConfig);
      expect(config.audioDirectories).toHaveLength(2);
      expect(config.audioDirectories[0].path).toBe('../music-player');
      expect(config.audioDirectories[0].displayName).toBe('Music Library');
    });

    it('should load configuration with single directory', async () => {
      // Create config with single directory
      const validConfig = {
        audioDirectories: [
          { path: '../music-player', displayName: 'Music' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(validConfig, null, 2));

      const configService = new ConfigService(testConfigPath);
      const config = await configService.loadConfig();

      expect(config.audioDirectories).toHaveLength(1);
      expect(config.audioDirectories[0].path).toBe('../music-player');
      expect(config.audioDirectories[0].displayName).toBe('Music');
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

    it('should throw error if audioDirectories field is missing', async () => {
      // Create config without audioDirectories
      const invalidConfig = {
        someOtherField: 'value',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /must include "audioDirectories"/
      );
    });

    it('should throw error if audioDirectories is not an array', async () => {
      // Create config with non-array audioDirectories
      const invalidConfig = {
        audioDirectories: 'not-an-array',
      };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /"audioDirectories" must be an array/
      );
    });

    it('should throw error if audioDirectories is empty array', async () => {
      // Create config with empty audioDirectories
      const invalidConfig = {
        audioDirectories: [],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /"audioDirectories" cannot be empty/
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
        audioDirectories: [
          { path: '../music-player', displayName: 'Music' },
        ],
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
    it('should return first audio directory path after loading config', async () => {
      const validConfig = {
        audioDirectories: [
          { path: '../music-player', displayName: 'Music' },
          { path: '../podcasts', displayName: 'Podcasts' },
        ],
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
    it('should return absolute path of first audio directory', async () => {
      const validConfig = {
        audioDirectories: [
          { path: '../music-player', displayName: 'Music' },
        ],
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
        audioDirectories: [
          { path: '../music-player', displayName: 'Music' },
        ],
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
        audioDirectories: [
          { path: '../music-player', displayName: 'Music' },
        ],
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

  describe('JSON5 support (comments)', () => {
    it('should parse config file with single-line comments', async () => {
      const configWithComments = `{
  // Audio directories configuration
  "audioDirectories": [
    { "path": "../music-player", "displayName": "Music Library" }
  ]
}`;
      await fs.writeFile(testConfigPath, configWithComments);

      const configService = new ConfigService(testConfigPath);
      const config = await configService.loadConfig();

      expect(config.audioDirectories).toHaveLength(1);
      expect(config.audioDirectories[0].path).toBe('../music-player');
    });

    it('should parse config file with multi-line comments', async () => {
      const configWithComments = `{
  /* This is a multi-line comment
     describing the configuration */
  "audioDirectories": [
    { "path": "../music-player", "displayName": "Music Library" }
  ]
}`;
      await fs.writeFile(testConfigPath, configWithComments);

      const configService = new ConfigService(testConfigPath);
      const config = await configService.loadConfig();

      expect(config.audioDirectories).toHaveLength(1);
    });

    it('should parse config file with trailing commas', async () => {
      const configWithTrailingComma = `{
  "audioDirectories": [
    { "path": "../music-player", "displayName": "Music Library" },
  ],
}`;
      await fs.writeFile(testConfigPath, configWithTrailingComma);

      const configService = new ConfigService(testConfigPath);
      const config = await configService.loadConfig();

      expect(config.audioDirectories).toHaveLength(1);
    });
  });

  describe('multiple audio directories', () => {
    it('should load config with multiple audio directories', async () => {
      const multiDirConfig = {
        audioDirectories: [
          { path: '../music-player', displayName: 'Music Library' },
          { path: '../podcasts', displayName: 'Podcasts' },
          { path: '../audiobooks', displayName: 'Audio Books' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(multiDirConfig, null, 2));

      const configService = new ConfigService(testConfigPath);
      const config = await configService.loadConfig();

      expect(config.audioDirectories).toHaveLength(3);
      expect(config.audioDirectories[0].path).toBe('../music-player');
      expect(config.audioDirectories[0].displayName).toBe('Music Library');
      expect(config.audioDirectories[1].path).toBe('../podcasts');
      expect(config.audioDirectories[1].displayName).toBe('Podcasts');
    });

    it('should validate that each directory has path and displayName', async () => {
      const invalidConfig = {
        audioDirectories: [
          { path: '../music-player' }, // Missing displayName
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /must include "displayName"/
      );
    });

    it('should validate that path is not empty', async () => {
      const invalidConfig = {
        audioDirectories: [
          { path: '', displayName: 'Music' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /"path" cannot be empty/
      );
    });

    it('should validate that displayName is not empty', async () => {
      const invalidConfig = {
        audioDirectories: [
          { path: '../music', displayName: '' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const configService = new ConfigService(testConfigPath);

      await expect(configService.loadConfig()).rejects.toThrow(
        /"displayName" cannot be empty/
      );
    });
  });

  describe('getAudioDirectories', () => {
    it('should return all audio directories with display names', async () => {
      const multiDirConfig = {
        audioDirectories: [
          { path: '../music-player', displayName: 'Music Library' },
          { path: '../podcasts', displayName: 'Podcasts' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(multiDirConfig));

      const configService = new ConfigService(testConfigPath);
      await configService.loadConfig();

      const directories = configService.getAudioDirectories();
      expect(directories).toHaveLength(2);
      expect(directories[0]).toEqual({ path: '../music-player', displayName: 'Music Library' });
      expect(directories[1]).toEqual({ path: '../podcasts', displayName: 'Podcasts' });
    });

    it('should throw error if config is not loaded', () => {
      const configService = new ConfigService(testConfigPath);

      expect(() => configService.getAudioDirectories()).toThrow(
        /Configuration not loaded/
      );
    });
  });
});
