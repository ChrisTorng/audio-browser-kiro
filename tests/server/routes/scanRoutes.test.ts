import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerScanRoutes } from '../../../src/server/routes/scanRoutes.js';
import { ScanService } from '../../../src/server/services/scanService.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Scan Routes', () => {
  let fastify: FastifyInstance;
  let scanService: ScanService;
  let testDir: string;

  beforeAll(async () => {
    // Create Fastify instance
    fastify = Fastify({ logger: false });
    
    // Create temporary test directory structure
    testDir = path.join(os.tmpdir(), `audio-browser-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    // Create test subdirectory
    const subDir = path.join(testDir, 'subdir');
    await fs.mkdir(subDir, { recursive: true });
    
    // Create test audio files
    await fs.writeFile(path.join(testDir, 'test1.mp3'), 'fake audio content');
    await fs.writeFile(path.join(testDir, 'test2.wav'), 'fake audio content');
    await fs.writeFile(path.join(subDir, 'test3.flac'), 'fake audio content');
    
    // Create non-audio file (should be ignored)
    await fs.writeFile(path.join(testDir, 'readme.txt'), 'text file');
    
    // Initialize scan service with test directory
    scanService = new ScanService();
    await scanService.initialize(testDir);
    
    // Register scan routes with initialized scan service
    await registerScanRoutes(fastify, scanService);
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
    
    // Close Fastify instance
    await fastify.close();
  });

  describe('POST /api/scan', () => {
    it('should scan directory and return tree structure', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {
          path: testDir,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('tree');
      expect(body.tree).toHaveProperty('name');
      expect(body.tree).toHaveProperty('path');
      expect(body.tree).toHaveProperty('files');
      expect(body.tree).toHaveProperty('subdirectories');
      
      // Should have 2 audio files in root
      expect(body.tree.files).toHaveLength(2);
      expect(body.tree.files[0].name).toMatch(/\.(mp3|wav)$/);
      
      // Should have 1 subdirectory
      expect(body.tree.subdirectories).toHaveLength(1);
      expect(body.tree.subdirectories[0].files).toHaveLength(1);
    });

    it('should return 400 for missing path', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('INVALID_PATH');
    });

    it('should return 400 for empty path', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {
          path: '',
        },
      });

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('INVALID_PATH');
      expect(body.error.message).toBe('Invalid directory path');
    });

    it('should return 404 for non-existent directory', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {
          path: '/non/existent/directory',
        },
      });

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('DIRECTORY_NOT_FOUND');
    });

    it('should filter only supported audio formats', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/scan',
        payload: {
          path: testDir,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      
      // Check that non-audio files are not included
      const allFiles = body.tree.files.map((f: { name: string }) => f.name);
      expect(allFiles).not.toContain('readme.txt');
      
      // Check that only audio files are included
      allFiles.forEach((fileName: string) => {
        expect(fileName).toMatch(/\.(mp3|wav|flac|ogg|m4a|aac)$/i);
      });
    });
  });

  describe('GET /api/tree', () => {
    it('should return cached directory tree', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/tree',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('tree');
      expect(body.tree).toHaveProperty('name');
      expect(body.tree).toHaveProperty('path');
      expect(body.tree).toHaveProperty('files');
      expect(body.tree).toHaveProperty('subdirectories');
      
      // Should have 2 audio files in root (from initialization)
      expect(body.tree.files).toHaveLength(2);
      
      // Should have 1 subdirectory
      expect(body.tree.subdirectories).toHaveLength(1);
      expect(body.tree.subdirectories[0].files).toHaveLength(1);
    });

    it('should return same tree on multiple calls (cached)', async () => {
      const response1 = await fastify.inject({
        method: 'GET',
        url: '/api/tree',
      });

      const response2 = await fastify.inject({
        method: 'GET',
        url: '/api/tree',
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      
      const body1 = JSON.parse(response1.body);
      const body2 = JSON.parse(response2.body);
      
      // Trees should be identical
      expect(body1.tree).toEqual(body2.tree);
    });

    it('should return error if scan service not initialized', async () => {
      // Create a new Fastify instance with uninitialized scan service
      const testFastify = Fastify({ logger: false });
      const uninitializedScanService = new ScanService();
      
      await registerScanRoutes(testFastify, uninitializedScanService);
      
      const response = await testFastify.inject({
        method: 'GET',
        url: '/api/tree',
      });

      expect(response.statusCode).toBe(500);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('SERVICE_NOT_INITIALIZED');
      expect(body.error.message).toBe('Scan service not initialized');
      
      await testFastify.close();
    });
  });
});
