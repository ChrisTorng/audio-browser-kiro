import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerScanRoutes } from './routes/scanRoutes.js';
import { registerAudioRoutes } from './routes/audioRoutes.js';
import { registerMetadataRoutes } from './routes/metadataRoutes.js';
import { ConfigService } from './services/configService.js';
import { ScanService } from './services/scanService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV !== 'production';
const isProduction = process.env.NODE_ENV === 'production';

// Create Fastify instance with environment-specific configuration
const fastify = Fastify({
  logger: isDevelopment
    ? {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            colorize: true,
          },
        },
      }
    : {
        level: 'info',
        // Production logging - structured JSON format
      },
  // Request ID generation for tracking
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
});

// Request logging hook - log all incoming requests
fastify.addHook('onRequest', async (request) => {
  request.log.info(
    {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    },
    'Incoming request'
  );
});

// Response logging hook - log all responses
fastify.addHook('onResponse', async (request, reply) => {
  const responseTime = reply.elapsedTime;
  request.log.info(
    {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: responseTime ? `${responseTime.toFixed(2)}ms` : 'N/A',
    },
    'Request completed'
  );
});

// Global error handler hook
fastify.setErrorHandler(async (error: Error & { validation?: unknown; statusCode?: number; code?: string }, request, reply) => {
  // Log the error with context
  request.log.error(
    {
      err: error,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
    },
    'Request error'
  );

  // Handle validation errors from Fastify schema validation
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
        details: isDevelopment ? error.stack : undefined,
      },
    });
  }

  // Handle generic errors
  const statusCode = reply.statusCode >= 400 ? reply.statusCode : 500;
  return reply.code(statusCode).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'An unexpected error occurred' : error.message,
      details: isDevelopment ? error.stack : undefined,
    },
  });
});

// Not found handler for undefined routes
fastify.setNotFoundHandler((request, reply) => {
  request.log.warn(
    {
      method: request.method,
      url: request.url,
    },
    'Route not found'
  );

  // In production, serve index.html for non-API routes (SPA fallback)
  if (isProduction && !request.url.startsWith('/api')) {
    return reply.sendFile('index.html');
  }

  return reply.code(404).send({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      details: `Cannot ${request.method} ${request.url}`,
    },
  });
});

// Configure JSON body parser (built-in with Fastify)
// Fastify automatically parses JSON bodies, but we can configure limits
fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  function (_req, body, done) {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
);

// Initialize services
const configService = new ConfigService();
const scanService = new ScanService();

// Load configuration and initialize scan service
try {
  console.log('🔧 Loading configuration...');
  await configService.loadConfig();
  
  const audioDirectories = configService.getAudioDirectories();
  console.log(`📁 Audio directories configured: ${audioDirectories.length}`);
  audioDirectories.forEach((dir, index) => {
    const absolutePath = path.resolve(dir.path);
    console.log(`   ${index + 1}. ${dir.displayName}: ${absolutePath}`);
  });
  
  console.log('🔍 Initializing scan service...');
  const scanStartTime = Date.now();
  await scanService.initialize(audioDirectories);
  const scanDuration = Date.now() - scanStartTime;
  
  // Get scan statistics
  const tree = scanService.getTree();
  const fileCount = countAudioFiles(tree);
  const dirCount = countDirectories(tree);
  
  console.log('✅ Scan service initialized successfully');
  console.log(`📊 Scan statistics:`);
  console.log(`   - Audio files found: ${fileCount}`);
  console.log(`   - Directories with audio: ${dirCount}`);
  console.log(`   - Scan duration: ${scanDuration}ms`);
  console.log(`   - Supported formats: ${scanService.getSupportedFormats().join(', ')}`);
  
  fastify.log.info({
    audioDirectories: audioDirectories.map(d => ({ 
      displayName: d.displayName, 
      path: d.path,
      absolutePath: path.resolve(d.path)
    })),
    fileCount,
    dirCount,
    scanDuration,
    supportedFormats: scanService.getSupportedFormats(),
  }, 'Application initialized successfully');
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error('❌ Failed to initialize application:', err.message);
  console.error('💡 Please check:');
  console.error('   1. config.json exists in the project root');
  console.error('   2. audioDirectories array in config.json is correctly configured');
  console.error('   3. All audio directory paths exist and are accessible');
  fastify.log.fatal({ err }, 'Application initialization failed');
  process.exit(1);
}

/**
 * Count total number of audio files in directory tree
 */
function countAudioFiles(node: { files: unknown[]; subdirectories: unknown[] }): number {
  let count = node.files.length;
  for (const subNode of node.subdirectories as { files: unknown[]; subdirectories: unknown[] }[]) {
    count += countAudioFiles(subNode);
  }
  return count;
}

/**
 * Count total number of directories in tree
 */
function countDirectories(node: { subdirectories: unknown[] }): number {
  let count = 1; // Count current directory
  for (const subNode of node.subdirectories as { subdirectories: unknown[] }[]) {
    count += countDirectories(subNode);
  }
  return count;
}

// Serve static files in production
if (isProduction) {
  const clientDistPath = path.join(__dirname, '..', 'client');
  
  // Register static file serving
  fastify.register(fastifyStatic, {
    root: clientDistPath,
    prefix: '/',
  });
}

// Register API routes
await registerScanRoutes(fastify, scanService);
await registerAudioRoutes(fastify);
await registerMetadataRoutes(fastify);

// Health check endpoint
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    fastify.log.info(
      {
        port,
        host,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
      },
      'Server started successfully'
    );
    
    // Console output for convenience
    console.log(`\n🚀 Server is running on http://${host}:${port}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔍 Health check: http://${host}:${port}/api/health\n`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    fastify.log.error(error, 'Failed to start server');
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info({ signal }, 'Received shutdown signal');
  console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);
  
  try {
    await fastify.close();
    fastify.log.info('Server closed successfully');
    console.log('✅ Server closed successfully\n');
    process.exit(0);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    fastify.log.error(error, 'Error during shutdown');
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  fastify.log.fatal({ err }, 'Uncaught exception');
  console.error('❌ Uncaught exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  fastify.log.fatal({ reason }, 'Unhandled promise rejection');
  console.error('❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Start the server
start();

export { fastify };
