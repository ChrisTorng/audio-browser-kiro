import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { registerScanRoutes } from '../../../src/server/routes/scanRoutes.js';
import { registerAudioRoutes } from '../../../src/server/routes/audioRoutes.js';
import { registerMetadataRoutes } from '../../../src/server/routes/metadataRoutes.js';
import { AudioDatabase } from '../../../src/server/db/database.js';
import { ScanService } from '../../../src/server/services/scanService.js';

/**
 * Integration tests for Fastify API routes
 * Tests complete request-response flows for all API endpoints
 */
describe('API Routes Integration', () => {
  let server: FastifyInstance;
  let testDir: string;
  let testDbPath: string;
  let database: AudioDatabase;
  let scanService: ScanService;

  beforeAll(async () => {
    // Create temporary test directory structure
    testDir = path.join(os.tmpdir(), `audio-browser-api-integration-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create test subdirectories
    const musicDir = path.join(testDir, 'music');
    const albumDir = path.join(musicDir, 'album1');
    await fs.mkdir(musicDir, { recursive: true });
    await fs.mkdir(albumDir, { recursive: true });

    // Create test audio files with actual content
    const audioContent = Buffer.from('RIFF....WAVEfmt '); // Minimal WAV header
    await fs.writeFile(path.join(musicDir, 'song1.mp3'), audioContent);
    await fs.writeFile(path.join(musicDir, 'song2.wav'), audioContent);
    await fs.writeFile(path.join(albumDir, 'track1.flac'), audioContent);

    // Create non-audio file (should be filtered out)
    await fs.writeFile(path.join(musicDir, 'readme.txt'), 'text file');

    // Create test database
    testDbPath = path.join(testDir, 'test-api.db');
    database = new AudioDatabase(testDbPath);

    // Set AUDIO_ROOT_PATH before registering routes
    process.env.AUDIO_ROOT_PATH = musicDir;

    // Initialize scan service
    scanService = new ScanService();
    await scanService.initialize(musicDir);

    // Create Fastify server instance
    server = Fastify({
      logger: false,
    });

    // Register all routes
    await registerScanRoutes(server, scanService);
    await registerAudioRoutes(server);
    await registerMetadataRoutes(server, database);

    await server.ready();
  });

  afterAll(async () => {
    // Clean up
    await server.close();
    database.close();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Clear database before each test
    try {
      const allMetadata = database.getAllMetadata();
      allMetadata.forEach(meta => database.deleteMetadata(meta.filePath));
    } catch (error) {
      // Database might be closed, ignore error
    }
  });

  describe('GET /api/tree', () => {
    it('should return cached directory tree', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tree',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('tree');
      expect(body.tree.name).toBe('music');
      expect(body.tree.files).toHaveLength(2);
      expect(body.tree.subdirectories).toHaveLength(1);
    });

    it('should return same tree on multiple calls', async () => {
      const response1 = await server.inject({
        method: 'GET',
        url: '/api/tree',
      });

      const response2 = await server.inject({
        method: 'GET',
        url: '/api/tree',
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      
      const body1 = JSON.parse(response1.body);
      const body2 = JSON.parse(response2.body);
      
      expect(body1.tree).toEqual(body2.tree);
    });
  });

  describe('POST /api/scan', () => {
    it('should scan directory and return tree structure', async () => {
      const musicDir = path.join(testDir, 'music');

      const response = await server.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {
          path: musicDir,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('tree');
      expect(body.tree.name).toBe('music');
      expect(body.tree.files).toHaveLength(2);
      expect(body.tree.subdirectories).toHaveLength(1);
    });

    it('should filter out non-audio files', async () => {
      const musicDir = path.join(testDir, 'music');

      const response = await server.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {
          path: musicDir,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      const fileNames = body.tree.files.map((f: any) => f.name);
      expect(fileNames).not.toContain('readme.txt');
    });

    it('should return 400 for missing path', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PATH');
    });

    it('should return 400 for empty path', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {
          path: '   ',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PATH');
    });

    it('should return 404 for non-existent directory', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {
          path: path.join(testDir, 'does-not-exist'),
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('DIRECTORY_NOT_FOUND');
    });

    it('should include file metadata in response', async () => {
      const musicDir = path.join(testDir, 'music');

      const response = await server.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {
          path: musicDir,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      const mp3File = body.tree.files.find((f: any) => f.name === 'song1.mp3');
      expect(mp3File).toBeDefined();
      expect(mp3File.name).toBe('song1.mp3');
      expect(mp3File.path).toBe('song1.mp3');
      expect(mp3File.size).toBeGreaterThan(0);
    });
  });

  describe('GET /api/audio/*', () => {
    it('should stream audio file', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/audio/song1.mp3',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('audio');
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.body).toBeTruthy();
    });

    it('should support Range requests', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/audio/song1.mp3',
        headers: {
          range: 'bytes=0-99',
        },
      });

      expect(response.statusCode).toBe(206);
      expect(response.headers['content-range']).toBeDefined();
      expect(response.headers['content-range']).toMatch(/^bytes \d+-\d+\/\d+$/);
    });

    it('should return 400 for empty file path', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/audio/',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PATH');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/audio/nonexistent.mp3',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should prevent path traversal attacks', async () => {
      // Try to access file outside root using ..
      const response = await server.inject({
        method: 'GET',
        url: '/api/audio/../../etc/passwd',
      });

      // Should return 400 for invalid path
      expect([400, 404]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('GET /api/metadata', () => {
    it('should return empty metadata initially', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/metadata',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.metadata).toEqual({});
    });

    it('should return all metadata records', async () => {
      // Add test metadata via API to ensure proper initialization
      await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'audio/file1.mp3',
          rating: 3,
          description: 'Great track',
        },
      });
      
      await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'audio/file2.mp3',
          rating: 2,
          description: 'Good song',
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/api/metadata',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(Object.keys(body.metadata)).toHaveLength(2);
      expect(body.metadata['audio/file1.mp3'].rating).toBe(3);
      expect(body.metadata['audio/file1.mp3'].description).toBe('Great track');
      expect(body.metadata['audio/file2.mp3'].rating).toBe(2);
    });
  });

  describe('POST /api/metadata', () => {
    it('should create new metadata', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'audio/new.mp3',
          rating: 3,
          description: 'New track',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.metadata.filePath).toBe('audio/new.mp3');
      expect(body.metadata.rating).toBe(3);
      expect(body.metadata.description).toBe('New track');

      // Verify in database
      const metadata = database.getMetadata('audio/new.mp3');
      expect(metadata).toBeDefined();
      expect(metadata?.rating).toBe(3);
    });

    it('should update existing metadata', async () => {
      // Create initial metadata
      database.upsertMetadata({
        filePath: 'audio/existing.mp3',
        rating: 1,
        description: 'Old description',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'audio/existing.mp3',
          rating: 3,
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.metadata.rating).toBe(3);
      expect(body.metadata.description).toBe('Updated description');
    });

    it('should update only rating', async () => {
      database.upsertMetadata({
        filePath: 'audio/test.mp3',
        rating: 1,
        description: 'Keep this',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'audio/test.mp3',
          rating: 3,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.metadata.rating).toBe(3);
      expect(body.metadata.description).toBe('Keep this');
    });

    it('should update only description', async () => {
      database.upsertMetadata({
        filePath: 'audio/test.mp3',
        rating: 2,
        description: 'Old',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'audio/test.mp3',
          description: 'New description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.metadata.rating).toBe(2);
      expect(body.metadata.description).toBe('New description');
    });

    it('should return 400 for missing filePath', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          rating: 3,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for empty filePath', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: '   ',
          rating: 3,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when neither rating nor description provided', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'audio/test.mp3',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for invalid rating', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'audio/test.mp3',
          rating: 5,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/metadata/:filePath', () => {
    it('should delete existing metadata', async () => {
      // Create metadata
      database.upsertMetadata({
        filePath: 'audio/delete-me.mp3',
        rating: 2,
        description: 'To be deleted',
      });

      const encodedPath = encodeURIComponent('audio/delete-me.mp3');
      const response = await server.inject({
        method: 'DELETE',
        url: `/api/metadata/${encodedPath}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify deletion
      const metadata = database.getMetadata('audio/delete-me.mp3');
      expect(metadata).toBeNull();
    });

    it('should return 404 for non-existent metadata', async () => {
      const encodedPath = encodeURIComponent('audio/nonexistent.mp3');
      const response = await server.inject({
        method: 'DELETE',
        url: `/api/metadata/${encodedPath}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('METADATA_NOT_FOUND');
    });

    it('should handle URL-encoded file paths', async () => {
      // Create metadata with special characters
      const filePath = 'audio/song with spaces.mp3';
      database.upsertMetadata({
        filePath,
        rating: 3,
        description: 'Test',
      });

      const encodedPath = encodeURIComponent(filePath);
      const response = await server.inject({
        method: 'DELETE',
        url: `/api/metadata/${encodedPath}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should complete full scan -> stream -> metadata workflow', async () => {
      const musicDir = path.join(testDir, 'music');

      // Step 1: Scan directory
      const scanResponse = await server.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {
          path: musicDir,
        },
      });

      expect(scanResponse.statusCode).toBe(200);
      const scanBody = JSON.parse(scanResponse.body);
      const firstFile = scanBody.tree.files[0];

      // Step 2: Stream audio file
      const streamResponse = await server.inject({
        method: 'GET',
        url: `/api/audio/${firstFile.path}`,
      });

      expect(streamResponse.statusCode).toBe(200);

      // Step 3: Add metadata
      const metadataResponse = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: firstFile.path,
          rating: 3,
          description: 'Great track',
        },
      });

      expect(metadataResponse.statusCode).toBe(200);

      // Step 4: Retrieve all metadata
      const getAllResponse = await server.inject({
        method: 'GET',
        url: '/api/metadata',
      });

      expect(getAllResponse.statusCode).toBe(200);
      const getAllBody = JSON.parse(getAllResponse.body);
      expect(getAllBody.metadata[firstFile.path]).toBeDefined();
      expect(getAllBody.metadata[firstFile.path].rating).toBe(3);
    });

    it('should handle multiple metadata operations', async () => {
      // Create multiple metadata entries
      const files = ['audio/file1.mp3', 'audio/file2.mp3', 'audio/file3.mp3'];
      
      for (let i = 0; i < files.length; i++) {
        const response = await server.inject({
          method: 'POST',
          url: '/api/metadata',
          payload: {
            filePath: files[i],
            rating: i + 1,
            description: `Track ${i + 1}`,
          },
        });
        expect(response.statusCode).toBe(200);
      }

      // Get all metadata
      const getAllResponse = await server.inject({
        method: 'GET',
        url: '/api/metadata',
      });

      expect(getAllResponse.statusCode).toBe(200);
      const body = JSON.parse(getAllResponse.body);
      expect(Object.keys(body.metadata)).toHaveLength(3);

      // Update one
      const updateResponse = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: files[1],
          rating: 3,
        },
      });

      expect(updateResponse.statusCode).toBe(200);

      // Delete one
      const deleteResponse = await server.inject({
        method: 'DELETE',
        url: `/api/metadata/${encodeURIComponent(files[2])}`,
      });

      expect(deleteResponse.statusCode).toBe(200);

      // Verify final state
      const finalResponse = await server.inject({
        method: 'GET',
        url: '/api/metadata',
      });

      const finalBody = JSON.parse(finalResponse.body);
      expect(Object.keys(finalBody.metadata)).toHaveLength(2);
      expect(finalBody.metadata[files[1]].rating).toBe(3);
      expect(finalBody.metadata[files[2]]).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Create a new server with a closed database
      const closedDb = new AudioDatabase(testDbPath + '.closed');
      closedDb.close();

      const testServer = Fastify({ logger: false });
      await registerMetadataRoutes(testServer, closedDb);
      await testServer.ready();

      const response = await testServer.inject({
        method: 'GET',
        url: '/api/metadata',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();

      await testServer.close();
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should handle concurrent requests', async () => {
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          server.inject({
            method: 'POST',
            url: '/api/metadata',
            payload: {
              filePath: `audio/concurrent-${i}.mp3`,
              rating: (i % 3) + 1,
              description: `Concurrent ${i}`,
            },
          })
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });

      // Verify all were created
      const getAllResponse = await server.inject({
        method: 'GET',
        url: '/api/metadata',
      });

      const body = JSON.parse(getAllResponse.body);
      expect(Object.keys(body.metadata)).toHaveLength(10);
    });
  });

  describe('Range Request Support', () => {
    it('should handle multiple range formats', async () => {
      // Test different range formats
      const ranges = [
        'bytes=0-99',
        'bytes=100-199',
        'bytes=0-',
      ];

      for (const range of ranges) {
        const response = await server.inject({
          method: 'GET',
          url: '/api/audio/song1.mp3',
          headers: { range },
        });

        expect(response.statusCode).toBe(206);
        expect(response.headers['content-range']).toBeDefined();
      }
    });

    it('should handle full file request without range', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/audio/song1.mp3',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-length']).toBeDefined();
      expect(response.headers['accept-ranges']).toBe('bytes');
    });
  });
});
