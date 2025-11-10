import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerMetadataRoutes } from '../../../src/server/routes/metadataRoutes.js';
import { AudioDatabase } from '../../../src/server/db/database.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Metadata Routes', () => {
  let fastify: FastifyInstance;
  let testDir: string;
  let dbPath: string;
  let db: AudioDatabase;

  beforeAll(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `metadata-routes-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Set database path for testing
    dbPath = path.join(testDir, 'test-metadata.db');
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up database before each test
    try {
      await fs.unlink(dbPath);
    } catch {
      // Ignore if file doesn't exist
    }

    // Create new Fastify instance for each test
    fastify = Fastify({ logger: false });

    // Create new database instance
    db = new AudioDatabase(dbPath);

    // Register metadata routes with shared database
    await registerMetadataRoutes(fastify, db);
  });

  afterEach(async () => {
    // Close database connection
    if (db) {
      db.close();
    }

    // Close Fastify instance
    if (fastify) {
      await fastify.close();
    }
  });

  describe('GET /api/metadata', () => {
    it('should return empty metadata when no records exist', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/metadata',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('metadata');
      expect(body.metadata).toEqual({});
    });

    it('should return all metadata records', async () => {
      // First, create some metadata
      await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/song1.mp3',
          rating: 3,
          description: 'Great song',
        },
      });

      await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/song2.mp3',
          rating: 2,
          description: 'Good song',
        },
      });

      // Get all metadata
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/metadata',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('metadata');
      expect(Object.keys(body.metadata)).toHaveLength(2);
      expect(body.metadata['music/song1.mp3']).toMatchObject({
        rating: 3,
        description: 'Great song',
      });
      expect(body.metadata['music/song2.mp3']).toMatchObject({
        rating: 2,
        description: 'Good song',
      });
    });
  });

  describe('POST /api/metadata', () => {
    it('should create new metadata with rating and description', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          rating: 3,
          description: 'Test description',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('metadata');
      expect(body.metadata).toMatchObject({
        filePath: 'music/test.mp3',
        rating: 3,
        description: 'Test description',
      });
      expect(body.metadata).toHaveProperty('id');
      expect(body.metadata).toHaveProperty('createdAt');
      expect(body.metadata).toHaveProperty('updatedAt');
    });

    it('should create metadata with only rating', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          rating: 2,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.metadata).toMatchObject({
        filePath: 'music/test.mp3',
        rating: 2,
        description: '',
      });
    });

    it('should create metadata with only description', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          description: 'Only description',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.metadata).toMatchObject({
        filePath: 'music/test.mp3',
        rating: 0,
        description: 'Only description',
      });
    });

    it('should update existing metadata (upsert)', async () => {
      // Create initial metadata
      await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          rating: 1,
          description: 'Initial',
        },
      });

      // Update metadata
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          rating: 3,
          description: 'Updated',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.metadata).toMatchObject({
        filePath: 'music/test.mp3',
        rating: 3,
        description: 'Updated',
      });
    });

    it('should update only rating while preserving description', async () => {
      // Create initial metadata
      await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          rating: 1,
          description: 'Keep this',
        },
      });

      // Update only rating
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          rating: 3,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.metadata).toMatchObject({
        filePath: 'music/test.mp3',
        rating: 3,
        description: 'Keep this',
      });
    });

    it('should update only description while preserving rating', async () => {
      // Create initial metadata
      await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          rating: 2,
          description: 'Old description',
        },
      });

      // Update only description
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          description: 'New description',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.metadata).toMatchObject({
        filePath: 'music/test.mp3',
        rating: 2,
        description: 'New description',
      });
    });

    it('should return 400 when filePath is missing', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          rating: 3,
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when filePath is empty', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: '',
          rating: 3,
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when neither rating nor description is provided', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: '/music/test.mp3',
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for invalid rating value', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          rating: 5, // Invalid: should be 0-3
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/metadata/:filePath', () => {
    it('should delete existing metadata', async () => {
      // Create metadata
      await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath: 'music/test.mp3',
          rating: 3,
          description: 'To be deleted',
        },
      });

      // Delete metadata
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/metadata/' + encodeURIComponent('music/test.mp3'),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toEqual({ success: true });

      // Verify deletion
      const getResponse = await fastify.inject({
        method: 'GET',
        url: '/api/metadata',
      });

      const getBody = JSON.parse(getResponse.body);
      expect(getBody.metadata).toEqual({});
    });

    it('should return 404 when deleting non-existent metadata', async () => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/metadata/' + encodeURIComponent('music/non-existent.mp3'),
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('METADATA_NOT_FOUND');
    });

    it('should handle URL-encoded file paths', async () => {
      const filePath = 'music/folder with spaces/song.mp3';

      // Create metadata
      await fastify.inject({
        method: 'POST',
        url: '/api/metadata',
        payload: {
          filePath,
          rating: 2,
        },
      });

      // Delete with URL-encoded path
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/metadata/' + encodeURIComponent(filePath),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toEqual({ success: true });
    });

    it('should return 400 for empty file path', async () => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/metadata/ ',
      });

      // Should return 400 for empty/whitespace path
      expect(response.statusCode).toBe(400);
    });
  });
});
