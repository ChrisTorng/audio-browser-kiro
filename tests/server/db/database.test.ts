import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioDatabase } from '../../../src/server/db/database';
import fs from 'fs';
import path from 'path';

describe('AudioDatabase', () => {
  let db: AudioDatabase;
  const testDbPath = path.join(__dirname, 'test-audio-metadata.db');

  beforeEach(() => {
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new AudioDatabase(testDbPath);
  });

  afterEach(() => {
    db.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('initialize', () => {
    it('should create audio_metadata table', () => {
      // Table should be created in constructor
      const result = db.getAllMetadata();
      expect(result).toEqual([]);
    });
  });

  describe('upsertMetadata', () => {
    it('should insert new metadata', () => {
      const metadata = db.upsertMetadata({
        filePath: '/music/song.mp3',
        rating: 3,
        description: 'Great track',
      });

      expect(metadata.filePath).toBe('/music/song.mp3');
      expect(metadata.rating).toBe(3);
      expect(metadata.description).toBe('Great track');
      expect(metadata.id).toBeGreaterThan(0);
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.updatedAt).toBeInstanceOf(Date);
    });

    it('should update existing metadata', () => {
      // Insert initial metadata
      const initial = db.upsertMetadata({
        filePath: '/music/song.mp3',
        rating: 2,
        description: 'Good',
      });

      // Update metadata
      const updated = db.upsertMetadata({
        filePath: '/music/song.mp3',
        rating: 3,
        description: 'Great track',
      });

      expect(updated.id).toBe(initial.id);
      expect(updated.rating).toBe(3);
      expect(updated.description).toBe('Great track');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        initial.updatedAt.getTime()
      );
    });

    it('should enforce rating range constraint', () => {
      expect(() => {
        db.upsertMetadata({
          filePath: '/music/song.mp3',
          rating: 4,
          description: 'Test',
        });
      }).toThrow();

      expect(() => {
        db.upsertMetadata({
          filePath: '/music/song.mp3',
          rating: -1,
          description: 'Test',
        });
      }).toThrow();
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for existing file', () => {
      db.upsertMetadata({
        filePath: '/music/song.mp3',
        rating: 3,
        description: 'Great track',
      });

      const metadata = db.getMetadata('/music/song.mp3');

      expect(metadata).not.toBeNull();
      expect(metadata?.filePath).toBe('/music/song.mp3');
      expect(metadata?.rating).toBe(3);
      expect(metadata?.description).toBe('Great track');
    });

    it('should return null for non-existent file', () => {
      const metadata = db.getMetadata('/music/nonexistent.mp3');
      expect(metadata).toBeNull();
    });
  });

  describe('getAllMetadata', () => {
    it('should return empty array when no metadata exists', () => {
      const result = db.getAllMetadata();
      expect(result).toEqual([]);
    });

    it('should return all metadata records', () => {
      db.upsertMetadata({
        filePath: '/music/song1.mp3',
        rating: 3,
        description: 'First',
      });

      db.upsertMetadata({
        filePath: '/music/song2.mp3',
        rating: 2,
        description: 'Second',
      });

      db.upsertMetadata({
        filePath: '/music/album/song3.mp3',
        rating: 1,
        description: 'Third',
      });

      const result = db.getAllMetadata();

      expect(result).toHaveLength(3);
      expect(result[0].filePath).toBe('/music/album/song3.mp3');
      expect(result[1].filePath).toBe('/music/song1.mp3');
      expect(result[2].filePath).toBe('/music/song2.mp3');
    });
  });

  describe('deleteMetadata', () => {
    it('should delete existing metadata', () => {
      db.upsertMetadata({
        filePath: '/music/song.mp3',
        rating: 3,
        description: 'Great track',
      });

      const deleted = db.deleteMetadata('/music/song.mp3');
      expect(deleted).toBe(true);

      const metadata = db.getMetadata('/music/song.mp3');
      expect(metadata).toBeNull();
    });

    it('should return false when deleting non-existent metadata', () => {
      const deleted = db.deleteMetadata('/music/nonexistent.mp3');
      expect(deleted).toBe(false);
    });
  });

  describe('indexes', () => {
    it('should create file_path index', () => {
      // Insert multiple records
      for (let i = 0; i < 100; i++) {
        db.upsertMetadata({
          filePath: `/music/song${i}.mp3`,
          rating: i % 4,
          description: `Song ${i}`,
        });
      }

      // Query should be fast with index
      const start = Date.now();
      const metadata = db.getMetadata('/music/song50.mp3');
      const duration = Date.now() - start;

      expect(metadata).not.toBeNull();
      expect(duration).toBeLessThan(10); // Should be very fast with index
    });
  });
});
