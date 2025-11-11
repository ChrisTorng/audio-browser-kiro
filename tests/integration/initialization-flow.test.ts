import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ConfigService } from '../../src/server/services/configService';
import { ScanService } from '../../src/server/services/scanService';

/**
 * Integration test for application initialization flow
 * Tests the complete flow from backend startup to frontend ready state
 */
describe('Application Initialization Flow', () => {
  let testDir: string;
  let testConfigPath: string;
  let originalCwd: string;

  beforeAll(async () => {
    // Save original working directory
    originalCwd = process.cwd();

    // Create temporary test directory structure
    testDir = path.join(os.tmpdir(), `audio-browser-init-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create test audio directory
    const musicDir = path.join(testDir, 'music');
    const albumDir = path.join(musicDir, 'album1');
    const emptyDir = path.join(musicDir, 'empty');
    
    await fs.mkdir(musicDir, { recursive: true });
    await fs.mkdir(albumDir, { recursive: true });
    await fs.mkdir(emptyDir, { recursive: true });

    // Create test audio files
    await fs.writeFile(path.join(musicDir, 'song1.mp3'), 'fake audio content');
    await fs.writeFile(path.join(musicDir, 'song2.wav'), 'fake audio content');
    await fs.writeFile(path.join(albumDir, 'track1.flac'), 'fake audio content');
    await fs.writeFile(path.join(albumDir, 'track2.ogg'), 'fake audio content');

    // Create test config.json
    testConfigPath = path.join(testDir, 'config.json');
    await fs.writeFile(
      testConfigPath,
      JSON.stringify({ audioDirectory: musicDir }, null, 2)
    );

    // Change to test directory
    process.chdir(testDir);
  });

  afterAll(async () => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Backend Initialization', () => {
    it('should load configuration on startup', async () => {
      const configService = new ConfigService();
      
      // Load config
      await configService.loadConfig();
      
      // Verify config is loaded
      const audioDirectory = configService.getAudioDirectory();
      expect(audioDirectory).toBeDefined();
      expect(audioDirectory).toContain('music');
    });

    it('should scan audio directory on startup', async () => {
      const configService = new ConfigService();
      const scanService = new ScanService();
      
      // Load config
      await configService.loadConfig();
      const audioDirectory = configService.getAudioDirectory();
      
      // Initialize scan service (simulates backend startup)
      await scanService.initialize(audioDirectory);
      
      // Verify scan service is initialized
      expect(scanService.isInitialized()).toBe(true);
      
      // Verify tree is cached
      const tree = scanService.getTree();
      expect(tree).toBeDefined();
      expect(tree.name).toBe('music');
    });

    it('should filter out empty directories during scan', async () => {
      const configService = new ConfigService();
      const scanService = new ScanService();
      
      // Load config and initialize
      await configService.loadConfig();
      const audioDirectory = configService.getAudioDirectory();
      await scanService.initialize(audioDirectory);
      
      // Get tree
      const tree = scanService.getTree();
      
      // Verify empty directory is not included
      const hasEmptyDir = tree.subdirectories.some(dir => dir.name === 'empty');
      expect(hasEmptyDir).toBe(false);
      
      // Verify album1 directory is included (has audio files)
      const hasAlbumDir = tree.subdirectories.some(dir => dir.name === 'album1');
      expect(hasAlbumDir).toBe(true);
    });

    it('should cache scan results for quick access', async () => {
      const configService = new ConfigService();
      const scanService = new ScanService();
      
      // Load config and initialize
      await configService.loadConfig();
      const audioDirectory = configService.getAudioDirectory();
      await scanService.initialize(audioDirectory);
      
      // First access
      const tree1 = scanService.getTree();
      
      // Second access (should be from cache)
      const tree2 = scanService.getTree();
      
      // Verify both return same tree (same reference = cached)
      expect(tree1).toBe(tree2);
      
      // Verify scan service reports as initialized
      expect(scanService.isInitialized()).toBe(true);
    });
  });

  describe('Complete Initialization Flow', () => {
    it('should complete full initialization from config to cached tree', async () => {
      // Step 1: Load configuration (simulates backend startup)
      const configService = new ConfigService();
      await configService.loadConfig();
      const audioDirectory = configService.getAudioDirectory();
      
      expect(audioDirectory).toBeDefined();
      console.log(`✓ Configuration loaded: ${audioDirectory}`);
      
      // Step 2: Initialize scan service (simulates backend startup)
      const scanService = new ScanService();
      const scanStartTime = Date.now();
      await scanService.initialize(audioDirectory);
      const scanDuration = Date.now() - scanStartTime;
      
      expect(scanService.isInitialized()).toBe(true);
      console.log(`✓ Scan completed in ${scanDuration}ms`);
      
      // Step 3: Get cached tree (simulates frontend API call)
      const tree = scanService.getTree();
      
      expect(tree).toBeDefined();
      expect(tree.name).toBe('music');
      expect(tree.files.length).toBe(2); // song1.mp3, song2.wav
      expect(tree.subdirectories.length).toBe(1); // album1 (empty dir filtered out)
      
      console.log(`✓ Tree structure ready:`);
      console.log(`  - Root files: ${tree.files.length}`);
      console.log(`  - Subdirectories: ${tree.subdirectories.length}`);
      
      // Step 4: Verify subdirectory structure
      const album1 = tree.subdirectories[0];
      expect(album1.name).toBe('album1');
      expect(album1.files.length).toBe(2); // track1.flac, track2.ogg
      
      console.log(`  - Album files: ${album1.files.length}`);
      
      // Step 5: Verify all audio files are found
      const totalFiles = tree.files.length + album1.files.length;
      expect(totalFiles).toBe(4);
      
      console.log(`✓ Total audio files found: ${totalFiles}`);
      console.log('✓ Initialization flow completed successfully');
    });

    it('should handle initialization errors gracefully', async () => {
      const configService = new ConfigService();
      const scanService = new ScanService();
      
      // Try to initialize with non-existent directory
      const nonExistentDir = path.join(testDir, 'does-not-exist');
      
      await expect(scanService.initialize(nonExistentDir)).rejects.toThrow();
      
      // Verify scan service is not initialized
      expect(scanService.isInitialized()).toBe(false);
    });

    it('should meet performance requirements', async () => {
      const configService = new ConfigService();
      const scanService = new ScanService();
      
      // Load config
      await configService.loadConfig();
      const audioDirectory = configService.getAudioDirectory();
      
      // Measure scan time
      const startTime = Date.now();
      await scanService.initialize(audioDirectory);
      const scanDuration = Date.now() - startTime;
      
      // Requirement: Should complete scan in < 5 seconds for 1000 files
      // Our test has only 4 files, so it should be much faster
      expect(scanDuration).toBeLessThan(1000); // < 1 second for 4 files
      
      console.log(`✓ Scan performance: ${scanDuration}ms for 4 files`);
    });
  });

  describe('Frontend Integration', () => {
    it('should provide tree structure ready for frontend consumption', async () => {
      const configService = new ConfigService();
      const scanService = new ScanService();
      
      // Backend initialization
      await configService.loadConfig();
      const audioDirectory = configService.getAudioDirectory();
      await scanService.initialize(audioDirectory);
      
      // Frontend fetches tree (simulates API call)
      const tree = scanService.getTree();
      
      // Verify tree structure is suitable for frontend
      expect(tree).toHaveProperty('name');
      expect(tree).toHaveProperty('path');
      expect(tree).toHaveProperty('files');
      expect(tree).toHaveProperty('subdirectories');
      
      // Verify files have required properties
      tree.files.forEach(file => {
        expect(file).toHaveProperty('name');
        expect(file).toHaveProperty('path');
        expect(file).toHaveProperty('size');
      });
      
      // Verify tree can be serialized for API response
      const serialized = JSON.stringify(tree);
      expect(serialized).toBeTruthy();
      
      // Verify tree can be deserialized by frontend
      const deserialized = JSON.parse(serialized);
      expect(deserialized.name).toBe(tree.name);
      expect(deserialized.files.length).toBe(tree.files.length);
    });

    it('should only include directories with audio files', async () => {
      const configService = new ConfigService();
      const scanService = new ScanService();
      
      // Backend initialization
      await configService.loadConfig();
      const audioDirectory = configService.getAudioDirectory();
      await scanService.initialize(audioDirectory);
      
      // Get tree
      const tree = scanService.getTree();
      
      // Verify empty directory is filtered out
      const allDirNames = tree.subdirectories.map(dir => dir.name);
      expect(allDirNames).not.toContain('empty');
      
      // Verify only directories with audio files are included
      expect(allDirNames).toContain('album1');
      expect(tree.subdirectories.length).toBe(1);
    });
  });
});
