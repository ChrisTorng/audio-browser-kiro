import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioService } from '../../../src/server/services/audioService';
import { promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';

describe('AudioService', () => {
  let audioService: AudioService;
  const testDir = path.join(__dirname, 'test-audio-streaming');

  beforeEach(async () => {
    audioService = new AudioService();

    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    // Create test audio files with different sizes
    await fs.writeFile(path.join(testDir, 'test.mp3'), Buffer.alloc(1024, 'a')); // 1KB
    await fs.writeFile(path.join(testDir, 'test.wav'), Buffer.alloc(2048, 'b')); // 2KB
    await fs.writeFile(path.join(testDir, 'test.flac'), Buffer.alloc(512, 'c')); // 512B
    
    // Create subdirectory with file
    await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'subdir', 'audio.ogg'), Buffer.alloc(256, 'd'));
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('getAudioMimeType', () => {
    it('should return correct MIME type for mp3', () => {
      expect(audioService.getAudioMimeType('test.mp3')).toBe('audio/mpeg');
    });

    it('should return correct MIME type for wav', () => {
      expect(audioService.getAudioMimeType('test.wav')).toBe('audio/wav');
    });

    it('should return correct MIME type for flac', () => {
      expect(audioService.getAudioMimeType('test.flac')).toBe('audio/flac');
    });

    it('should return correct MIME type for ogg', () => {
      expect(audioService.getAudioMimeType('test.ogg')).toBe('audio/ogg');
    });

    it('should return correct MIME type for m4a', () => {
      expect(audioService.getAudioMimeType('test.m4a')).toBe('audio/mp4');
    });

    it('should return correct MIME type for aac', () => {
      expect(audioService.getAudioMimeType('test.aac')).toBe('audio/aac');
    });

    it('should handle case-insensitive extensions', () => {
      expect(audioService.getAudioMimeType('TEST.MP3')).toBe('audio/mpeg');
      expect(audioService.getAudioMimeType('Audio.WAV')).toBe('audio/wav');
    });

    it('should return default MIME type for unknown extensions', () => {
      expect(audioService.getAudioMimeType('test.unknown')).toBe('application/octet-stream');
    });
  });

  describe('validateAudioFilePath', () => {
    it('should accept valid relative path', () => {
      expect(() => {
        audioService.validateAudioFilePath('test.mp3', testDir);
      }).not.toThrow();
    });

    it('should accept valid path in subdirectory', () => {
      expect(() => {
        audioService.validateAudioFilePath('subdir/audio.ogg', testDir);
      }).not.toThrow();
    });

    it('should reject path traversal with ..', () => {
      expect(() => {
        audioService.validateAudioFilePath('../../../etc/passwd', testDir);
      }).toThrow('Invalid file path');
    });

    it('should reject path starting with /', () => {
      expect(() => {
        audioService.validateAudioFilePath('/etc/passwd', testDir);
      }).toThrow('Invalid file path');
    });

    it('should reject path trying to escape root directory', () => {
      expect(() => {
        audioService.validateAudioFilePath('subdir/../../outside.mp3', testDir);
      }).toThrow('Invalid file path');
    });

    it('should reject suspicious path patterns', () => {
      expect(() => {
        audioService.validateAudioFilePath('test/../../../secret.mp3', testDir);
      }).toThrow('Invalid file path');
    });
  });

  describe('parseRangeHeader', () => {
    it('should parse valid range header', () => {
      const range = audioService.parseRangeHeader('bytes=0-499', 1000);
      
      expect(range).not.toBeNull();
      expect(range?.start).toBe(0);
      expect(range?.end).toBe(499);
      expect(range?.total).toBe(1000);
    });

    it('should parse range header without end', () => {
      const range = audioService.parseRangeHeader('bytes=500-', 1000);
      
      expect(range).not.toBeNull();
      expect(range?.start).toBe(500);
      expect(range?.end).toBe(999);
      expect(range?.total).toBe(1000);
    });

    it('should parse range header for last bytes', () => {
      const range = audioService.parseRangeHeader('bytes=900-999', 1000);
      
      expect(range).not.toBeNull();
      expect(range?.start).toBe(900);
      expect(range?.end).toBe(999);
      expect(range?.total).toBe(1000);
    });

    it('should return null for invalid format', () => {
      expect(audioService.parseRangeHeader('invalid', 1000)).toBeNull();
      expect(audioService.parseRangeHeader('bytes=', 1000)).toBeNull();
      expect(audioService.parseRangeHeader('bytes=abc-def', 1000)).toBeNull();
    });

    it('should return null for out of range start', () => {
      const range = audioService.parseRangeHeader('bytes=1000-1500', 1000);
      expect(range).toBeNull();
    });

    it('should return null for out of range end', () => {
      const range = audioService.parseRangeHeader('bytes=0-1500', 1000);
      expect(range).toBeNull();
    });

    it('should return null when start > end', () => {
      const range = audioService.parseRangeHeader('bytes=500-100', 1000);
      expect(range).toBeNull();
    });
  });

  describe('streamAudio', () => {
    it('should stream audio file successfully', async () => {
      const result = await audioService.streamAudio('test.mp3', testDir);

      expect(result).toBeDefined();
      expect(result.stream).toBeInstanceOf(Readable);
      expect(result.mimeType).toBe('audio/mpeg');
      expect(result.range).toBeDefined();
      expect(result.range?.start).toBe(0);
      expect(result.range?.end).toBe(1023);
      expect(result.range?.total).toBe(1024);

      // Clean up stream
      result.stream.destroy();
    });

    it('should stream file from subdirectory', async () => {
      const result = await audioService.streamAudio('subdir/audio.ogg', testDir);

      expect(result).toBeDefined();
      expect(result.stream).toBeInstanceOf(Readable);
      expect(result.mimeType).toBe('audio/ogg');
      expect(result.range?.total).toBe(256);

      result.stream.destroy();
    });

    it('should support range requests', async () => {
      const result = await audioService.streamAudio('test.mp3', testDir, 'bytes=0-511');

      expect(result).toBeDefined();
      expect(result.stream).toBeInstanceOf(Readable);
      expect(result.range).toBeDefined();
      expect(result.range?.start).toBe(0);
      expect(result.range?.end).toBe(511);
      expect(result.range?.total).toBe(1024);

      result.stream.destroy();
    });

    it('should support range request without end', async () => {
      const result = await audioService.streamAudio('test.mp3', testDir, 'bytes=512-');

      expect(result).toBeDefined();
      expect(result.range?.start).toBe(512);
      expect(result.range?.end).toBe(1023);
      expect(result.range?.total).toBe(1024);

      result.stream.destroy();
    });

    it('should ignore invalid range header', async () => {
      const result = await audioService.streamAudio('test.mp3', testDir, 'invalid-range');

      expect(result).toBeDefined();
      expect(result.range?.start).toBe(0);
      expect(result.range?.end).toBe(1023);

      result.stream.destroy();
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        audioService.streamAudio('nonexistent.mp3', testDir)
      ).rejects.toThrow('File not found');
    });

    it('should throw error for path traversal attempt', async () => {
      await expect(
        audioService.streamAudio('../../../etc/passwd', testDir)
      ).rejects.toThrow('Invalid file path');
    });

    it('should throw error when path is a directory', async () => {
      await expect(
        audioService.streamAudio('subdir', testDir)
      ).rejects.toThrow('Path is not a file');
    });

    it('should stream complete file content', async () => {
      const result = await audioService.streamAudio('test.flac', testDir);

      // Read stream content
      const chunks: Buffer[] = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks);

      expect(content.length).toBe(512);
      expect(content.toString()).toBe('c'.repeat(512));
    });

    it('should stream partial content with range', async () => {
      const result = await audioService.streamAudio('test.wav', testDir, 'bytes=0-99');

      // Read stream content
      const chunks: Buffer[] = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks);

      expect(content.length).toBe(100);
      expect(content.toString()).toBe('b'.repeat(100));
    });
  });
});
