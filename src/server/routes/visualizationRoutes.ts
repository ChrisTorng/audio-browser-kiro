/**
 * Visualization Routes
 * Provides endpoints for waveform and spectrogram generation
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { VisualizationService } from '../services/visualizationService.js';
import { ConfigService } from '../services/configService.js';
import { ApiErrorResponse } from '../../shared/types/api.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Register visualization routes
 * @param fastify - Fastify instance
 */
export async function registerVisualizationRoutes(fastify: FastifyInstance) {
  const visualizationService = new VisualizationService();
  
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
   * GET /api/waveform/*
   * Generate and return waveform image for audio file
   */
  fastify.get<{
    Params: { '*': string };
    Reply: ApiErrorResponse;
  }>(
    '/api/waveform/*',
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

        // Generate waveform
        const result = await visualizationService.generateWaveform(absolutePath, filePath);

        // Read image file
        const imageBuffer = await fs.readFile(result.imagePath);

        // Set headers
        reply.header('Content-Type', 'image/png');
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');

        // Send image
        return reply.send(imageBuffer);
      } catch (error) {
        // Handle different types of errors
        if (error instanceof Error) {
          // File not found
          if (error.message.includes('not found') || error.message.includes('ENOENT')) {
            return reply.code(404).send({
              error: {
                code: 'FILE_NOT_FOUND',
                message: 'Audio file not found',
                details: error.message,
              },
            });
          }

          // ffmpeg error
          if (error.message.includes('ffmpeg')) {
            fastify.log.error({ err: error }, 'ffmpeg error generating waveform');
            return reply.code(500).send({
              error: {
                code: 'GENERATION_FAILED',
                message: 'Failed to generate waveform',
                details: error.message,
              },
            });
          }

          // Generic error
          fastify.log.error({ err: error }, 'Error generating waveform');
          return reply.code(500).send({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred',
              details: error.message,
            },
          });
        }

        // Unknown error type
        fastify.log.error({ err: error }, 'Unknown error generating waveform');
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

  /**
   * GET /api/spectrogram/*
   * Generate and return spectrogram image for audio file
   */
  fastify.get<{
    Params: { '*': string };
    Reply: ApiErrorResponse;
  }>(
    '/api/spectrogram/*',
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

        // Generate spectrogram
        const result = await visualizationService.generateSpectrogram(absolutePath, filePath);

        // Read image file
        const imageBuffer = await fs.readFile(result.imagePath);

        // Set headers
        reply.header('Content-Type', 'image/png');
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');

        // Send image
        return reply.send(imageBuffer);
      } catch (error) {
        // Handle different types of errors
        if (error instanceof Error) {
          // File not found
          if (error.message.includes('not found') || error.message.includes('ENOENT')) {
            return reply.code(404).send({
              error: {
                code: 'FILE_NOT_FOUND',
                message: 'Audio file not found',
                details: error.message,
              },
            });
          }

          // ffmpeg error
          if (error.message.includes('ffmpeg')) {
            fastify.log.error({ err: error }, 'ffmpeg error generating spectrogram');
            return reply.code(500).send({
              error: {
                code: 'GENERATION_FAILED',
                message: 'Failed to generate spectrogram',
                details: error.message,
              },
            });
          }

          // Generic error
          fastify.log.error({ err: error }, 'Error generating spectrogram');
          return reply.code(500).send({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred',
              details: error.message,
            },
          });
        }

        // Unknown error type
        fastify.log.error({ err: error }, 'Unknown error generating spectrogram');
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
