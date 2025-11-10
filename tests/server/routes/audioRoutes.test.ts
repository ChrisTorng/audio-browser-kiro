import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerAudioRoutes } from '../../../src/server/routes/audioRoutes.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Audio Routes', () => {
  let fastify: FastifyInstance;
  let testDir: string;
  let testFilePath: string;
  let testFileContent: Buffer;

  beforeAll(async () => {
    // Create Fastify instance
    fastify = Fastify({ logger: false });

    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `audio-routes-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create test audio file with known content
    testFileContent = Buffer.from('This is fake audio content for testing');
    testFilePath = path.join(testDir, 'test-audio.mp3');
    await fs.writeFile(testFilePath, testFileContent);

    // Set environment variable for audio root path
    process.env.AUDIO_ROOT_PATH = testDir;

    // Register audio routes
    await registerAudioRoutes(fastify);
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });

    // Clean up environment variable
    delete process.env.AUDIO_ROOT_PATH;

    // Close Fastify instance
    await fastify.close();
  });

  describe('GET /api/audio/*', () => {
    it('should stream audio file with correct headers', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/audio/test-audio.mp3',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('audio/mpeg');
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['content-length']).toBe(String(testFileContent.length));
      expect(response.rawPayload).toEqual(testFileContent);
    });

    it('should support Range requests with partial content', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/audio/test-audio.mp3',
        headers: {
          range: 'bytes=0-9',
        },
      });

      expect(response.statusCode).toBe(206);
      expect(response.headers['content-type']).toBe('audio/mpeg');
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['content-range']).toBe(`bytes 0-9/${testFileContent.length}`);
      expect(response.headers['content-length']).toBe('10');
      expect(response.rawPayload.length).toBe(10);
      expect(response.rawPayload).toEqual(testFileContent.subarray(0, 10));
    });

    it('should support Range requests with open-ended range', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/audio/test-audio.mp3',
        headers: {
          range: 'bytes=10-',
        },
      });

      expect(response.statusCode).toBe(206);
      expect(response.headers['content-range']).toBe(`bytes 10-${testFileContent.length - 1}/${testFileContent.length}`);
      expect(response.rawPayload).toEqual(testFileContent.subarray(10));
    });

    it('should return correct MIME type for different audio formats', async () => {
      // Create test files with different extensions
      const formats = [
        { ext: 'wav', mime: 'audio/wav' },
        { ext: 'flac', mime: 'audio/flac' },
        { ext: 'ogg', mime: 'audio/ogg' },
        { ext: 'm4a', mime: 'audio/mp4' },
        { ext: 'aac', mime: 'audio/aac' },
      ];

      for (const format of formats) {
        const filePath = path.join(testDir, `test.${format.ext}`);
        await fs.writeFile(filePath, 'test content');

        const response = await fastify.inject({
          method: 'GET',
          url: `/api/audio/test.${format.ext}`,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe(format.mime);

        // Clean up
        await fs.unlink(filePath);
      }
    });

    it('should return 404 for non-existent file', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/audio/non-existent.mp3',
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should return 400 for empty file path', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/audio/',
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('INVALID_PATH');
    });

    it('should handle path traversal attempts', async () => {
      // Note: Fastify may normalize URLs before routing, so we test the service layer
      // The actual path traversal protection is tested in audioService.test.ts
      // Here we just verify that invalid paths result in appropriate error responses
      
      // Test with a path that would traverse outside if not validated
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/audio/test/../../../outside.mp3',
      });

      // Should return either 400 (invalid path) or 404 (file not found after validation)
      // Both are acceptable as long as the file is not served
      expect([400, 404]).toContain(response.statusCode);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });
  });
});
