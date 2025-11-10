import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Configure JSON body parser (built-in with Fastify)
// Fastify automatically parses JSON bodies, but we can configure limits
fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  function (req, body, done) {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '..', 'client');
  
  // Register static file serving
  fastify.register(fastifyStatic, {
    root: clientDistPath,
    prefix: '/',
  });
  
  // Serve index.html for all non-API routes (SPA fallback)
  fastify.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api')) {
      reply.sendFile('index.html');
    } else {
      reply.code(404).send({ error: 'Not Found' });
    }
  });
}

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log(`Server is running on http://${host}:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...');
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
start();

export { fastify };
