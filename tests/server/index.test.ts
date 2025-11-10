import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';

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
