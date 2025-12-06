/**
 * Visualization Routes Tests
 * Tests for /api/waveform and /api/spectrogram endpoints
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerVisualizationRoutes } from '../../../src/server/routes/visualizationRoutes.js';
import path from 'path';
import { existsSync } from 'fs';

describe('Visualization Routes', () => {
  let fastify: FastifyInstance;
  const testAudioRoot = path.join(process.cwd(), 'tests', 'audio');
  const testAudioFile = 'Echo/Samples/Noise1.wav';

  beforeAll(async () => {
    // Create Fastify instance
    fastify = Fastify({ logger: false });
    
    // Set AUDIO_ROOT_PATH for testing
    process.env.AUDIO_ROOT_PATH = testAudioRoot;
    
    // Register routes
    await registerVisualizationRoutes(fastify);
    
    // Start server
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('GET /api/waveform/*', () => {
    it('should generate and return waveform image', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/waveform/${testAudioFile}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
      expect(response.rawPayload.length).toBeGreaterThan(0);

      // Verify PNG signature
      const buffer = response.rawPayload;
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    }, 15000);

    it('should return cached waveform on second request', async () => {
      // First request
      const response1 = await fastify.inject({
        method: 'GET',
        url: `/api/waveform/${testAudioFile}`,
      });
      expect(response1.statusCode).toBe(200);

      // Second request should be faster (cached)
      const response2 = await fastify.inject({
        method: 'GET',
        url: `/api/waveform/${testAudioFile}`,
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.rawPayload).toEqual(response1.rawPayload);
    }, 15000);

    it('should return 404 for non-existent file', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/waveform/nonexistent.wav',
      });

      expect(response.statusCode).toBe(404);
      const json = response.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe('FILE_NOT_FOUND');
    }, 10000);

    it('should return 400 for invalid path', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/waveform/',
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe('INVALID_PATH');
    }, 10000);
  });

  describe('GET /api/spectrogram/*', () => {
    it('should generate and return spectrogram image', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/spectrogram/${testAudioFile}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
      expect(response.rawPayload.length).toBeGreaterThan(0);

      // Verify PNG signature
      const buffer = response.rawPayload;
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    }, 15000);

    it('should return cached spectrogram on second request', async () => {
      // First request
      const response1 = await fastify.inject({
        method: 'GET',
        url: `/api/spectrogram/${testAudioFile}`,
      });
      expect(response1.statusCode).toBe(200);

      // Second request should be faster (cached)
      const response2 = await fastify.inject({
        method: 'GET',
        url: `/api/spectrogram/${testAudioFile}`,
      });
      expect(response2.statusCode).toBe(200);
      expect(response2.rawPayload).toEqual(response1.rawPayload);
    }, 15000);

    it('should return 404 for non-existent file', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/spectrogram/nonexistent.wav',
      });

      expect(response.statusCode).toBe(404);
      const json = response.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe('FILE_NOT_FOUND');
    }, 10000);

    it('should return 400 for invalid path', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/spectrogram/',
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe('INVALID_PATH');
    }, 10000);
  });
});
