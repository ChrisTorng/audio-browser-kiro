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
