import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataService } from '../../../src/server/services/metadataService';
import { AudioDatabase } from '../../../src/server/db/database';
import path from 'path';
import { promises as fs } from 'fs';

describe('MetadataService', () => {
  let metadataService: MetadataService;
  let db: AudioDatabase;
  let testDbPath: string;

  beforeEach(() => {
    // Use unique database file for each test to avoid conflicts
    testDbPath = path.join(__dirname, `test-metadata-${Date.now()}-${Math.random()}.db`);
    db = new AudioDatabase(testDbPath);
    metadataService = new MetadataService(db);
  });

  afterEach(async () => {
    db.close();
    // Clean up database files (including WAL and SHM files)
    await fs.unlink(testDbPath).catch(() => {});
    await fs.unlink(`${testDbPath}-wal`).catch(() => {});
    await fs.unlink(`${testDbPath}-shm`).catch(() => {});
  });

  describe('getMetadata', () => {
    it('should return null for non-existent file', () => {
      const result = metadataService.getMetadata('path/to/nonexistent.mp3');
      expect(result).toBeNull();
    });

    it('should return metadata for existing file', () => {
      // Insert test data
      db.upsertMetadata({
        filePath: 'music/song.mp3',
        rating: 2,
        description: 'Great track',
      });

      const result = metadataService.getMetadata('music/song.mp3');
      
      expect(result).not.toBeNull();
      expect(result?.filePath).toBe('music/song.mp3');
      expect(result?.rating).toBe(2);
      expect(result?.description).toBe('Great track');
    });
  });

  describe('getAllMetadata', () => {
    it('should return empty array when no metadata exists', () => {
      const result = metadataService.getAllMetadata();
      expect(result).toEqual([]);
    });

    it('should return all metadata records', () => {
      // Insert test data
      db.upsertMetadata({
        filePath: 'music/song1.mp3',
        rating: 1,
        description: 'First song',
      });
      db.upsertMetadata({
        filePath: 'music/song2.mp3',
        rating: 3,
        description: 'Second song',
      });
      db.upsertMetadata({
        filePath: 'music/album/track.flac',
        rating: 2,
        description: 'Album track',
      });

      const result = metadataService.getAllMetadata();
      
      expect(result).toHaveLength(3);
      expect(result.map(m => m.filePath)).toContain('music/song1.mp3');
      expect(result.map(m => m.filePath)).toContain('music/song2.mp3');
      expect(result.map(m => m.filePath)).toContain('music/album/track.flac');
    });
  });

  describe('updateMetadata', () => {
    it('should insert new metadata', () => {
      const result = metadataService.updateMetadata(
        'music/new-song.mp3',
        2,
        'New track'
      );

      expect(result).not.toBeNull();
      expect(result.filePath).toBe('music/new-song.mp3');
      expect(result.rating).toBe(2);
      expect(result.description).toBe('New track');
      expect(result.id).toBeGreaterThan(0);
    });

    it('should update existing metadata', () => {
      // Insert initial data
      metadataService.updateMetadata('music/song.mp3', 1, 'Initial');

      // Update the same file
      const result = metadataService.updateMetadata(
        'music/song.mp3',
        3,
        'Updated description'
      );

      expect(result.filePath).toBe('music/song.mp3');
      expect(result.rating).toBe(3);
      expect(result.description).toBe('Updated description');

      // Verify only one record exists
      const allMetadata = metadataService.getAllMetadata();
      expect(allMetadata).toHaveLength(1);
    });

    it('should throw error for invalid rating', () => {
      expect(() => {
        metadataService.updateMetadata('music/song.mp3', 5, 'Invalid rating');
      }).toThrow();
    });

    it('should throw error for negative rating', () => {
      expect(() => {
        metadataService.updateMetadata('music/song.mp3', -1, 'Negative rating');
      }).toThrow();
    });

    it('should accept rating of 0 (unrated)', () => {
      const result = metadataService.updateMetadata(
        'music/song.mp3',
        0,
        'Unrated'
      );

      expect(result.rating).toBe(0);
    });

    it('should accept empty description', () => {
      const result = metadataService.updateMetadata('music/song.mp3', 2, '');

      expect(result.description).toBe('');
    });

    it('should update timestamp on update', async () => {
      // Insert initial data
      const initial = metadataService.updateMetadata(
        'music/song.mp3',
        1,
        'Initial'
      );

      // Wait to ensure timestamp difference (SQLite CURRENT_TIMESTAMP has second precision)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Update
      const updated = metadataService.updateMetadata(
        'music/song.mp3',
        2,
        'Updated'
      );

      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        initial.updatedAt.getTime()
      );
    });
  });

  describe('deleteMetadata', () => {
    it('should return false for non-existent file', () => {
      const result = metadataService.deleteMetadata('path/to/nonexistent.mp3');
      expect(result).toBe(false);
    });

    it('should delete existing metadata and return true', () => {
      // Insert test data
      metadataService.updateMetadata('music/song.mp3', 2, 'To be deleted');

      // Delete
      const result = metadataService.deleteMetadata('music/song.mp3');
      expect(result).toBe(true);

      // Verify deletion
      const metadata = metadataService.getMetadata('music/song.mp3');
      expect(metadata).toBeNull();
    });

    it('should only delete specified file', () => {
      // Insert multiple records
      metadataService.updateMetadata('music/song1.mp3', 1, 'First');
      metadataService.updateMetadata('music/song2.mp3', 2, 'Second');
      metadataService.updateMetadata('music/song3.mp3', 3, 'Third');

      // Delete one
      metadataService.deleteMetadata('music/song2.mp3');

      // Verify others still exist
      const allMetadata = metadataService.getAllMetadata();
      expect(allMetadata).toHaveLength(2);
      expect(allMetadata.map(m => m.filePath)).toContain('music/song1.mp3');
      expect(allMetadata.map(m => m.filePath)).toContain('music/song3.mp3');
      expect(allMetadata.map(m => m.filePath)).not.toContain('music/song2.mp3');
    });
  });

  describe('integration with AudioDatabase', () => {
    it('should properly integrate with database operations', () => {
      // Create
      const created = metadataService.updateMetadata(
        'music/integration-test.mp3',
        2,
        'Integration test'
      );
      expect(created.id).toBeGreaterThan(0);

      // Read
      const retrieved = metadataService.getMetadata('music/integration-test.mp3');
      expect(retrieved?.id).toBe(created.id);

      // Update
      const updated = metadataService.updateMetadata(
        'music/integration-test.mp3',
        3,
        'Updated'
      );
      expect(updated.id).toBe(created.id);
      expect(updated.rating).toBe(3);

      // Delete
      const deleted = metadataService.deleteMetadata('music/integration-test.mp3');
      expect(deleted).toBe(true);

      // Verify deletion
      const afterDelete = metadataService.getMetadata('music/integration-test.mp3');
      expect(afterDelete).toBeNull();
    });
  });

  describe('caching', () => {
    it('should cache metadata queries', () => {
      // Insert test data
      metadataService.updateMetadata('music/song.mp3', 2, 'Test');

      // First query
      const first = metadataService.getMetadata('music/song.mp3');
      
      // Second query (should use cache)
      const second = metadataService.getMetadata('music/song.mp3');

      expect(first).toEqual(second);
    });

    it('should cache getAllMetadata results', () => {
      // Insert test data
      metadataService.updateMetadata('music/song1.mp3', 1, 'First');
      metadataService.updateMetadata('music/song2.mp3', 2, 'Second');

      // First query
      const first = metadataService.getAllMetadata();
      
      // Second query (should use cache)
      const second = metadataService.getAllMetadata();

      expect(first).toEqual(second);
      expect(first).toHaveLength(2);
    });

    it('should invalidate cache after update', () => {
      // Insert and cache
      metadataService.updateMetadata('music/song.mp3', 1, 'Initial');
      metadataService.getMetadata('music/song.mp3');

      // Update (should invalidate cache)
      metadataService.updateMetadata('music/song.mp3', 3, 'Updated');

      // Query should return updated data
      const result = metadataService.getMetadata('music/song.mp3');
      expect(result?.rating).toBe(3);
      expect(result?.description).toBe('Updated');
    });

    it('should invalidate cache after delete', () => {
      // Insert and cache
      metadataService.updateMetadata('music/song.mp3', 2, 'Test');
      metadataService.getAllMetadata();

      // Delete (should invalidate cache)
      metadataService.deleteMetadata('music/song.mp3');

      // Query should return null
      const result = metadataService.getMetadata('music/song.mp3');
      expect(result).toBeNull();
    });

    it('should clear cache manually', () => {
      // Insert and cache
      metadataService.updateMetadata('music/song.mp3', 2, 'Test');
      metadataService.getMetadata('music/song.mp3');

      // Clear cache
      metadataService.clearCache();

      // Should still be able to query
      const result = metadataService.getMetadata('music/song.mp3');
      expect(result).not.toBeNull();
    });
  });

  describe('batch operations', () => {
    it('should batch update multiple metadata records', () => {
      const updates = [
        { filePath: 'music/song1.mp3', rating: 3, description: 'First' },
        { filePath: 'music/song2.mp3', rating: 2, description: 'Second' },
        { filePath: 'music/song3.mp3', rating: 1, description: 'Third' },
      ];

      const count = metadataService.batchUpdateMetadata(updates);

      expect(count).toBe(3);
      expect(metadataService.getMetadata('music/song1.mp3')?.rating).toBe(3);
      expect(metadataService.getMetadata('music/song2.mp3')?.rating).toBe(2);
      expect(metadataService.getMetadata('music/song3.mp3')?.rating).toBe(1);
    });

    it('should batch delete multiple metadata records', () => {
      // Insert test data
      metadataService.updateMetadata('music/song1.mp3', 1, 'First');
      metadataService.updateMetadata('music/song2.mp3', 2, 'Second');
      metadataService.updateMetadata('music/song3.mp3', 3, 'Third');

      const count = metadataService.batchDeleteMetadata([
        'music/song1.mp3',
        'music/song2.mp3',
      ]);

      expect(count).toBe(2);
      expect(metadataService.getMetadata('music/song1.mp3')).toBeNull();
      expect(metadataService.getMetadata('music/song2.mp3')).toBeNull();
      expect(metadataService.getMetadata('music/song3.mp3')).not.toBeNull();
    });

    it('should invalidate cache after batch operations', () => {
      // Insert and cache
      metadataService.updateMetadata('music/song1.mp3', 1, 'First');
      metadataService.getAllMetadata();

      // Batch update
      metadataService.batchUpdateMetadata([
        { filePath: 'music/song2.mp3', rating: 2, description: 'Second' },
        { filePath: 'music/song3.mp3', rating: 3, description: 'Third' },
      ]);

      // Should see all records
      const all = metadataService.getAllMetadata();
      expect(all).toHaveLength(3);
    });
  });
});
