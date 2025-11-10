import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ScanService } from '../../src/server/services/scanService';
import { audioBrowserAPI } from '../../src/client/services/api';

/**
 * Integration test for the complete scan flow
 * Tests the end-to-end flow from scanning a directory to displaying results
 */
describe('Scan Flow Integration', () => {
  let testDir: string;
  let scanService: ScanService;

  beforeAll(async () => {
    scanService = new ScanService();

    // Create temporary test directory structure
    testDir = path.join(os.tmpdir(), `audio-browser-integration-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create test subdirectories
    const musicDir = path.join(testDir, 'music');
    const albumDir = path.join(musicDir, 'album1');
    await fs.mkdir(musicDir, { recursive: true });
    await fs.mkdir(albumDir, { recursive: true });

    // Create test audio files
    await fs.writeFile(path.join(musicDir, 'song1.mp3'), 'fake audio content');
    await fs.writeFile(path.join(musicDir, 'song2.wav'), 'fake audio content');
    await fs.writeFile(path.join(albumDir, 'track1.flac'), 'fake audio content');

    // Create non-audio file (should be filtered out)
    await fs.writeFile(path.join(musicDir, 'readme.txt'), 'text file');
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Backend Scan Service', () => {
    it('should scan directory and return complete tree structure', async () => {
      const musicDir = path.join(testDir, 'music');
      const tree = await scanService.scanDirectory(musicDir);

      // Verify root directory
      expect(tree.name).toBe('music');
      expect(tree.path).toBe('.');

      // Verify files in root
      expect(tree.files).toHaveLength(2);
      const fileNames = tree.files.map(f => f.name).sort();
      expect(fileNames).toEqual(['song1.mp3', 'song2.wav']);

      // Verify subdirectories
      expect(tree.subdirectories).toHaveLength(1);
      expect(tree.subdirectories[0].name).toBe('album1');

      // Verify files in subdirectory
      expect(tree.subdirectories[0].files).toHaveLength(1);
      expect(tree.subdirectories[0].files[0].name).toBe('track1.flac');
    });

    it('should filter out non-audio files', async () => {
      const musicDir = path.join(testDir, 'music');
      const tree = await scanService.scanDirectory(musicDir);

      // Check that readme.txt is not included
      const allFiles = tree.files.map(f => f.name);
      expect(allFiles).not.toContain('readme.txt');
    });

    it('should include file metadata', async () => {
      const musicDir = path.join(testDir, 'music');
      const tree = await scanService.scanDirectory(musicDir);

      const mp3File = tree.files.find(f => f.name === 'song1.mp3');
      expect(mp3File).toBeDefined();
      expect(mp3File?.name).toBe('song1.mp3');
      expect(mp3File?.path).toBe('song1.mp3');
      expect(mp3File?.size).toBeGreaterThan(0);
    });
  });

  describe('Complete Scan Flow', () => {
    it('should complete full scan flow from request to tree structure', async () => {
      const musicDir = path.join(testDir, 'music');

      // Step 1: Backend scans directory
      const tree = await scanService.scanDirectory(musicDir);

      // Step 2: Verify tree structure is correct
      expect(tree).toBeDefined();
      expect(tree.name).toBe('music');
      expect(tree.files.length).toBeGreaterThan(0);

      // Step 3: Verify tree can be serialized (for API response)
      const serialized = JSON.stringify(tree);
      expect(serialized).toBeTruthy();

      // Step 4: Verify tree can be deserialized (for frontend)
      const deserialized = JSON.parse(serialized);
      expect(deserialized.name).toBe(tree.name);
      expect(deserialized.files.length).toBe(tree.files.length);
    });

    it('should handle hierarchical directory structure', async () => {
      const musicDir = path.join(testDir, 'music');
      const tree = await scanService.scanDirectory(musicDir);

      // Verify hierarchy is preserved
      expect(tree.subdirectories).toHaveLength(1);
      
      const album = tree.subdirectories[0];
      expect(album.name).toBe('album1');
      expect(album.path).toBe('album1');
      expect(album.files).toHaveLength(1);
      
      // Verify relative paths are correct
      const trackFile = album.files[0];
      expect(trackFile.path).toBe(path.join('album1', 'track1.flac'));
    });

    it('should support multiple audio formats', async () => {
      const musicDir = path.join(testDir, 'music');
      const tree = await scanService.scanDirectory(musicDir);

      // Collect all file extensions
      const extensions = new Set<string>();
      
      const collectExtensions = (files: typeof tree.files) => {
        files.forEach(file => {
          const ext = path.extname(file.name).toLowerCase();
          extensions.add(ext);
        });
      };

      collectExtensions(tree.files);
      tree.subdirectories.forEach(subdir => {
        collectExtensions(subdir.files);
      });

      // Verify multiple formats are supported
      expect(extensions.has('.mp3')).toBe(true);
      expect(extensions.has('.wav')).toBe(true);
      expect(extensions.has('.flac')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent directory', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist');

      await expect(scanService.scanDirectory(nonExistentPath)).rejects.toThrow();
    });

    it('should handle file path instead of directory', async () => {
      const filePath = path.join(testDir, 'music', 'song1.mp3');

      await expect(scanService.scanDirectory(filePath)).rejects.toThrow('Path is not a directory');
    });
  });
});
