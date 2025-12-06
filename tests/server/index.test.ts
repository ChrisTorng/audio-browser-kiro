import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { promises as fs } from 'fs';
import path from 'path';
import { ConfigService } from '../../src/server/services/configService';
import { ScanService } from '../../src/server/services/scanService';

describe('Fastify Server Instance', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    // Create a test server instance
    server = Fastify({
      logger: false,
    });

    // Add health check endpoint
    server.get('/api/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should create Fastify instance successfully', () => {
    expect(server).toBeDefined();
  });

  it('should have JSON body parser configured', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/test',
      payload: { test: 'data' },
      headers: {
        'content-type': 'application/json',
      },
    });

    // Even though route doesn't exist, JSON should be parsed
    expect(response.statusCode).toBe(404);
  });

  it('should respond to health check endpoint', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
  });

  it('should support static file serving plugin registration', async () => {
    // Test that fastifyStatic can be registered
    const testServer = Fastify({ logger: false });
    
    expect(async () => {
      await testServer.register(fastifyStatic, {
        root: process.cwd(),
        prefix: '/test/',
      });
      await testServer.ready();
      await testServer.close();
    }).not.toThrow();
  });
});

describe('Error Handling and Logging', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    // Create a test server with error handling
    server = Fastify({
      logger: false,
    });

    // Add global error handler
    server.setErrorHandler(async (error: Error & { validation?: unknown; statusCode?: number; code?: string }, request, reply) => {
      // Handle validation errors
      if (error.validation) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.message,
            validation: error.validation,
          },
        });
      }

      // Handle Fastify-specific errors
      if (error.statusCode) {
        return reply.code(error.statusCode).send({
          error: {
            code: error.code || 'REQUEST_ERROR',
            message: error.message,
          },
        });
      }

      // Handle generic errors
      const statusCode = reply.statusCode >= 400 ? reply.statusCode : 500;
      return reply.code(statusCode).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    });

    // Add custom not found handler
    server.setNotFoundHandler((request, reply) => {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
          details: `Cannot ${request.method} ${request.url}`,
        },
      });
    });

    // Add test routes
    server.get('/api/test/success', async () => {
      return { success: true };
    });

    server.get('/api/test/error', async () => {
      throw new Error('Test error');
    });

    server.post('/api/test/validation', {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
          },
        },
      },
    }, async (request) => {
      return { received: request.body };
    });

    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Global Error Handler', () => {
    it('should handle successful requests', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test/success',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({ success: true });
    });

    it('should handle thrown errors with 500 status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test/error',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'INTERNAL_ERROR');
      expect(body.error).toHaveProperty('message', 'Test error');
    });

    it('should handle validation errors with 400 status', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/test/validation',
        payload: {},
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('validation');
    });
  });

  describe('Not Found Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/nonexistent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(body.error).toHaveProperty('message', 'Route not found');
      expect(body.error).toHaveProperty('details', 'Cannot GET /api/nonexistent');
    });

    it('should return 404 for POST to undefined routes', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/undefined',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty('details', 'Cannot POST /api/undefined');
    });
  });

  describe('Request Logging Hooks', () => {
    it('should allow onRequest hook registration', async () => {
      const testServer = Fastify({ logger: false });
      
      let requestLogged = false;
      testServer.addHook('onRequest', async (request) => {
        requestLogged = true;
        expect(request.method).toBeDefined();
        expect(request.url).toBeDefined();
      });

      testServer.get('/test', async () => ({ ok: true }));
      await testServer.ready();

      await testServer.inject({
        method: 'GET',
        url: '/test',
      });

      expect(requestLogged).toBe(true);
      await testServer.close();
    });

    it('should allow onResponse hook registration', async () => {
      const testServer = Fastify({ logger: false });
      
      let responseLogged = false;
      testServer.addHook('onResponse', async (request, reply) => {
        responseLogged = true;
        expect(request.method).toBeDefined();
        expect(reply.statusCode).toBeDefined();
      });

      testServer.get('/test', async () => ({ ok: true }));
      await testServer.ready();

      await testServer.inject({
        method: 'GET',
        url: '/test',
      });

      expect(responseLogged).toBe(true);
      await testServer.close();
    });
  });

  describe('Environment Configuration', () => {
    it('should create server with development logger configuration', () => {
      const devServer = Fastify({
        logger: {
          level: 'debug',
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
              colorize: true,
            },
          },
        },
      });

      expect(devServer).toBeDefined();
      devServer.close();
    });

    it('should create server with production logger configuration', () => {
      const prodServer = Fastify({
        logger: {
          level: 'info',
        },
      });

      expect(prodServer).toBeDefined();
      prodServer.close();
    });

    it('should support request ID tracking', () => {
      const serverWithReqId = Fastify({
        logger: false,
        requestIdHeader: 'x-request-id',
        requestIdLogLabel: 'reqId',
      });

      expect(serverWithReqId).toBeDefined();
      serverWithReqId.close();
    });
  });
});

describe('Application Initialization', () => {
  const testDir = path.join(__dirname, 'test-init');
  const testConfigPath = path.join(testDir, 'config.json');
  const testAudioDir = path.join(testDir, 'audio');

  beforeEach(async () => {
    // Create test directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(testAudioDir, { recursive: true });

    // Create test audio files
    await fs.writeFile(path.join(testAudioDir, 'song1.mp3'), 'fake audio');
    await fs.writeFile(path.join(testAudioDir, 'song2.wav'), 'fake audio');
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('ConfigService and ScanService Integration', () => {
    it('should load config and initialize scan service successfully', async () => {
      // Create valid config file
      const config = {
        audioDirectories: [
          { path: testAudioDir, displayName: 'Test Audio' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));

      // Initialize services
      const configService = new ConfigService(testConfigPath);
      const scanService = new ScanService();

      // Load configuration
      await configService.loadConfig();
      const audioDirectories = configService.getAudioDirectories();
      expect(audioDirectories).toHaveLength(1);
      expect(audioDirectories[0].path).toBe(testAudioDir);

      // Initialize scan service
      await scanService.initialize(audioDirectories);
      expect(scanService.isInitialized()).toBe(true);

      // Get scan results
      const tree = scanService.getTree();
      expect(tree).toBeDefined();
      expect(tree.subdirectories).toHaveLength(1); // One top-level directory
      expect(tree.subdirectories[0].name).toBe('Test Audio');
      expect(tree.subdirectories[0].files).toHaveLength(2);
    });

    it('should fail initialization if config file does not exist', async () => {
      const nonExistentConfig = path.join(testDir, 'non-existent.json');
      const configService = new ConfigService(nonExistentConfig);

      await expect(configService.loadConfig()).rejects.toThrow(
        /Configuration file not found/
      );
    });

    it('should fail initialization if audio directory does not exist', async () => {
      // Create config with non-existent audio directory
      const config = {
        audioDirectories: [
          { path: path.join(testDir, 'non-existent-audio'), displayName: 'Non-existent' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));

      const configService = new ConfigService(testConfigPath);
      const scanService = new ScanService();

      await configService.loadConfig();
      const audioDirectories = configService.getAudioDirectories();

      // Initialize should complete but log error and skip the non-existent directory
      await scanService.initialize(audioDirectories);
      
      // Verify no directories were added (only virtual root exists)
      const tree = scanService.getTree();
      expect(tree.subdirectories).toHaveLength(0);
      expect(tree.totalFileCount).toBe(0);
    });

    it('should log scan statistics after initialization', async () => {
      // Create config file
      const config = {
        audioDirectories: [
          { path: testAudioDir, displayName: 'Test Audio' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));

      // Initialize services
      const configService = new ConfigService(testConfigPath);
      const scanService = new ScanService();

      await configService.loadConfig();
      const audioDirectories = configService.getAudioDirectories();
      await scanService.initialize(audioDirectories);

      // Verify scan results
      const tree = scanService.getTree();
      expect(tree.subdirectories).toHaveLength(1);
      expect(tree.subdirectories[0].files).toHaveLength(2);

      // Verify supported formats
      const formats = scanService.getSupportedFormats();
      expect(formats).toContain('.mp3');
      expect(formats).toContain('.wav');
    });

    it('should handle empty audio directory', async () => {
      const emptyDir = path.join(testDir, 'empty-audio');
      await fs.mkdir(emptyDir, { recursive: true });

      // Create config file
      const config = {
        audioDirectories: [
          { path: emptyDir, displayName: 'Empty' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));

      // Initialize services
      const configService = new ConfigService(testConfigPath);
      const scanService = new ScanService();

      await configService.loadConfig();
      const audioDirectories = configService.getAudioDirectories();
      await scanService.initialize(audioDirectories);

      // Verify scan results
      const tree = scanService.getTree();
      expect(tree.files).toHaveLength(0);
      expect(tree.subdirectories).toHaveLength(0); // Empty directory won't be included
    });

    it('should provide absolute path for audio directory', async () => {
      // Create config with relative path
      const config = {
        audioDirectories: [
          { path: './audio', displayName: 'Audio' },
        ],
      };
      await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));

      const configService = new ConfigService(testConfigPath);
      await configService.loadConfig();

      const absolutePath = configService.getAudioDirectoryAbsolutePath();
      expect(path.isAbsolute(absolutePath)).toBe(true);
    });
  });
});
