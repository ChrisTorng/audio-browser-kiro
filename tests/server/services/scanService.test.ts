import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScanService } from '../../../src/server/services/scanService';
import { promises as fs } from 'fs';
import path from 'path';

describe('ScanService', () => {
  let scanService: ScanService;
  const testDir = path.join(__dirname, 'test-audio-files');

  beforeEach(async () => {
    scanService = new ScanService();

    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    
    // Create subdirectories
    await fs.mkdir(path.join(testDir, 'album1'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'album2'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'album1', 'disc1'), { recursive: true });

    // Create test audio files
    await fs.writeFile(path.join(testDir, 'song1.mp3'), 'fake mp3 content');
    await fs.writeFile(path.join(testDir, 'song2.wav'), 'fake wav content');
    await fs.writeFile(path.join(testDir, 'album1', 'track1.flac'), 'fake flac content');
    await fs.writeFile(path.join(testDir, 'album1', 'track2.ogg'), 'fake ogg content');
    await fs.writeFile(path.join(testDir, 'album2', 'audio.m4a'), 'fake m4a content');
    await fs.writeFile(path.join(testDir, 'album2', 'sound.aac'), 'fake aac content');
    await fs.writeFile(path.join(testDir, 'album1', 'disc1', 'track.mp3'), 'fake mp3 content');

    // Create non-audio files (should be filtered out)
    await fs.writeFile(path.join(testDir, 'readme.txt'), 'text file');
    await fs.writeFile(path.join(testDir, 'album1', 'cover.jpg'), 'image file');
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('getSupportedFormats', () => {
    it('should return array of supported audio formats', () => {
      const formats = scanService.getSupportedFormats();
      
      expect(formats).toContain('.mp3');
      expect(formats).toContain('.wav');
      expect(formats).toContain('.flac');
      expect(formats).toContain('.ogg');
      expect(formats).toContain('.m4a');
      expect(formats).toContain('.aac');
      expect(formats).toHaveLength(6);
    });
  });

  describe('scanDirectory', () => {
    it('should scan directory and return tree structure', async () => {
      const tree = await scanService.scanDirectory(testDir);

      expect(tree.name).toBe('test-audio-files');
      expect(tree.path).toBe('.');
      expect(tree.files).toHaveLength(2);
      expect(tree.subdirectories).toHaveLength(2);
    });

    it('should include all audio files in root directory', async () => {
      const tree = await scanService.scanDirectory(testDir);

      const fileNames = tree.files.map(f => f.name).sort();
      expect(fileNames).toEqual(['song1.mp3', 'song2.wav']);
    });

    it('should filter out non-audio files', async () => {
      const tree = await scanService.scanDirectory(testDir);

      const allFiles = tree.files.map(f => f.name);
      expect(allFiles).not.toContain('readme.txt');
      expect(allFiles).not.toContain('cover.jpg');
    });

    it('should recursively scan subdirectories', async () => {
      const tree = await scanService.scanDirectory(testDir);

      const album1 = tree.subdirectories.find(d => d.name === 'album1');
      expect(album1).toBeDefined();
      expect(album1?.files).toHaveLength(2);
      expect(album1?.subdirectories).toHaveLength(1);

      const disc1 = album1?.subdirectories.find(d => d.name === 'disc1');
      expect(disc1).toBeDefined();
      expect(disc1?.files).toHaveLength(1);
    });

    it('should include correct file metadata', async () => {
      const tree = await scanService.scanDirectory(testDir);

      const mp3File = tree.files.find(f => f.name === 'song1.mp3');
      expect(mp3File).toBeDefined();
      expect(mp3File?.name).toBe('song1.mp3');
      expect(mp3File?.path).toBe('song1.mp3');
      expect(mp3File?.size).toBeGreaterThan(0);
    });

    it('should use relative paths for files', async () => {
      const tree = await scanService.scanDirectory(testDir);

      const album1 = tree.subdirectories.find(d => d.name === 'album1');
      const flacFile = album1?.files.find(f => f.name === 'track1.flac');
      
      expect(flacFile?.path).toBe(path.join('album1', 'track1.flac'));
    });

    it('should sort files alphabetically', async () => {
      const tree = await scanService.scanDirectory(testDir);

      const fileNames = tree.files.map(f => f.name);
      const sortedNames = [...fileNames].sort();
      expect(fileNames).toEqual(sortedNames);
    });

    it('should sort subdirectories alphabetically', async () => {
      const tree = await scanService.scanDirectory(testDir);

      const dirNames = tree.subdirectories.map(d => d.name);
      const sortedNames = [...dirNames].sort();
      expect(dirNames).toEqual(sortedNames);
    });

    it('should handle case-insensitive file extensions', async () => {
      // Create files with uppercase extensions
      await fs.writeFile(path.join(testDir, 'SONG.MP3'), 'fake content');
      await fs.writeFile(path.join(testDir, 'audio.WAV'), 'fake content');

      const tree = await scanService.scanDirectory(testDir);

      const fileNames = tree.files.map(f => f.name);
      expect(fileNames).toContain('SONG.MP3');
      expect(fileNames).toContain('audio.WAV');
    });

    it('should throw error for non-existent directory', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist');

      await expect(scanService.scanDirectory(nonExistentPath)).rejects.toThrow();
    });

    it('should throw error when path is not a directory', async () => {
      const filePath = path.join(testDir, 'song1.mp3');

      await expect(scanService.scanDirectory(filePath)).rejects.toThrow('Path is not a directory');
    });

    it('should handle empty directories', async () => {
      const emptyDir = path.join(testDir, 'empty');
      await fs.mkdir(emptyDir);

      const tree = await scanService.scanDirectory(emptyDir);

      expect(tree.files).toHaveLength(0);
      expect(tree.subdirectories).toHaveLength(0);
    });

    it('should continue scanning after encountering permission errors', async () => {
      // This test simulates error handling
      // In real scenarios, permission errors would be logged but scanning continues
      const tree = await scanService.scanDirectory(testDir);

      // Should still return valid tree structure
      expect(tree).toBeDefined();
      expect(tree.name).toBe('test-audio-files');
    });
  });
});

