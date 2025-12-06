import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AudioService } from '../services/audioService.js';
import { ConfigService } from '../services/configService.js';
import { ApiErrorResponse } from '../../shared/types/api.js';
import path from 'path';

/**
 * Register audio streaming routes
 * @param fastify - Fastify instance
 */
export async function registerAudioRoutes(fastify: FastifyInstance) {
  const audioService = new AudioService();
  
  // Load configuration for path resolution
  // Use AUDIO_ROOT_PATH for testing (single directory mode)
  // Otherwise use ConfigService for multi-directory support
  const useEnvPath = !!process.env.AUDIO_ROOT_PATH;
  const configService = new ConfigService();
  
  if (!useEnvPath) {
    await configService.loadConfig();
  }

  /**
   * Resolve file path to absolute path
   * Supports both testing mode (AUDIO_ROOT_PATH) and production (multi-directory)
   */
  const resolveToAbsolutePath = (filePath: string): string => {
    if (useEnvPath) {
      // Testing mode: use AUDIO_ROOT_PATH
      return path.resolve(process.env.AUDIO_ROOT_PATH!, filePath);
    } else {
      // Production mode: use ConfigService to resolve displayName-prefixed path
      return configService.resolveFilePath(filePath);
    }
  };

  /**
   * GET /api/audio/*
   * Stream audio file with Range request support
   */
  fastify.get<{
    Params: { '*': string };
    Reply: ApiErrorResponse;
  }>(
    '/api/audio/*',
    async (request: FastifyRequest<{ Params: { '*': string } }>, reply: FastifyReply) => {
      try {
        // Extract file path from wildcard parameter
        const filePath = request.params['*'];

        if (!filePath || filePath.trim().length === 0) {
          return reply.code(400).send({
            error: {
              code: 'INVALID_PATH',
              message: 'Invalid file path',
              details: 'File path is required',
            },
          });
        }

        // Resolve to absolute path
        const absolutePath = resolveToAbsolutePath(filePath);
        const audioRootPath = path.dirname(absolutePath);
        const fileName = path.basename(absolutePath);

        // Get Range header if present
        const rangeHeader = request.headers.range;

        // Stream the audio file
        const result = await audioService.streamAudio(
          fileName,
          audioRootPath,
          rangeHeader
        );

        // Generate ETag and Last-Modified
        const lastModified = result.stats.mtime.toUTCString();
        const etag = `W/"${result.stats.size.toString(16)}-${result.stats.mtime.getTime().toString(16)}"`;

        // Set caching headers
        reply.header('Last-Modified', lastModified);
        reply.header('ETag', etag);
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');

        // Check conditional headers
        const ifNoneMatch = request.headers['if-none-match'];
        const ifModifiedSince = request.headers['if-modified-since'];

        let notModified = false;
        if (ifNoneMatch) {
          if (ifNoneMatch === etag) notModified = true;
        } else if (ifModifiedSince) {
          const ifModifiedSinceDate = new Date(ifModifiedSince);
          const mtime = new Date(result.stats.mtime);
          mtime.setMilliseconds(0);
          if (ifModifiedSinceDate >= mtime) notModified = true;
        }

        if (notModified) {
          result.stream.destroy();
          return reply.code(304).send();
        }

        // Set Content-Type header
        reply.header('Content-Type', result.mimeType);

        // Set Accept-Ranges header to indicate Range support
        reply.header('Accept-Ranges', 'bytes');

        // Handle Range request
        if (result.range && rangeHeader) {
          const { start, end, total } = result.range;
          
          // Set status code for partial content
          reply.code(206);
          
          // Set Content-Range header
          reply.header('Content-Range', `bytes ${start}-${end}/${total}`);
          
          // Set Content-Length for the range
          reply.header('Content-Length', end - start + 1);
        } else if (result.range) {
          // Full file response
          reply.header('Content-Length', result.range.total);
        }

        // Send the stream
        return reply.send(result.stream);
      } catch (error) {
        // Handle different types of errors
        if (error instanceof Error) {
          // File not found
          if (error.message.includes('File not found')) {
            return reply.code(404).send({
              error: {
                code: 'FILE_NOT_FOUND',
                message: 'Audio file not found',
                details: error.message,
              },
            });
          }

          // Permission denied
          if (error.message.includes('Permission denied')) {
            return reply.code(403).send({
              error: {
                code: 'PERMISSION_DENIED',
                message: 'Permission denied',
                details: error.message,
              },
            });
          }

          // Path traversal or invalid path
          if (error.message.includes('Invalid file path') || error.message.includes('Path traversal')) {
            return reply.code(400).send({
              error: {
                code: 'INVALID_PATH',
                message: 'Invalid file path',
                details: error.message,
              },
            });
          }

          // Generic error
          fastify.log.error({ err: error }, 'Error streaming audio file');
          return reply.code(500).send({
            error: {
              code: 'STREAM_FAILED',
              message: 'Failed to stream audio file',
              details: error.message,
            },
          });
        }

        // Unknown error type
        fastify.log.error({ err: error }, 'Unknown error streaming audio file');
        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            details: String(error),
          },
        });
      }
    }
  );
}
