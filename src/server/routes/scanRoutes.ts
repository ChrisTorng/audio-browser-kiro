import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ScanService } from '../services/scanService.js';
import { ScanDirectoryRequest, ScanDirectoryResponse, ApiErrorResponse } from '../../shared/types/api.js';

/**
 * Schema for scan directory request
 */
const scanDirectorySchema = {
  body: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to scan',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        tree: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            path: { type: 'string' },
            files: { type: 'array' },
            subdirectories: { type: 'array' },
          },
        },
      },
    },
    400: {
      type: 'object',
      required: ['error'],
      properties: {
        error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
    404: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
    500: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
  },
};

/**
 * Register scan routes
 * @param fastify - Fastify instance
 */
export async function registerScanRoutes(fastify: FastifyInstance) {
  const scanService = new ScanService();

  /**
   * POST /api/scan
   * Scan a directory and return the audio file tree structure
   */
  fastify.post<{
    Body: ScanDirectoryRequest;
    Reply: ScanDirectoryResponse | ApiErrorResponse;
  }>(
    '/api/scan',
    { schema: scanDirectorySchema },
    async (request: FastifyRequest<{ Body: ScanDirectoryRequest }>, reply: FastifyReply) => {
      try {
        // Validate request body exists
        if (!request.body) {
          return reply.code(400).send({
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid request body',
              details: 'Request body is required',
            },
          });
        }

        const { path } = request.body;

        // Validate path is provided and not empty
        if (!path || typeof path !== 'string') {
          return reply.code(400).send({
            error: {
              code: 'INVALID_PATH',
              message: 'Invalid directory path',
              details: 'Path must be a non-empty string',
            },
          });
        }

        const trimmedPath = path.trim();
        if (trimmedPath.length === 0) {
          return reply.code(400).send({
            error: {
              code: 'INVALID_PATH',
              message: 'Invalid directory path',
              details: 'Path must be a non-empty string',
            },
          });
        }

        // Scan the directory
        const tree = await scanService.scanDirectory(trimmedPath);

        return reply.code(200).send({ tree });
      } catch (error) {
        // Handle different types of errors
        if (error instanceof Error) {
          // Check for common error types
          if (error.message.includes('ENOENT') || error.message.includes('not a directory')) {
            return reply.code(404).send({
              error: {
                code: 'DIRECTORY_NOT_FOUND',
                message: 'Directory not found',
                details: error.message,
              },
            });
          }

          if (error.message.includes('EACCES') || error.message.includes('permission')) {
            return reply.code(403).send({
              error: {
                code: 'PERMISSION_DENIED',
                message: 'Permission denied',
                details: error.message,
              },
            });
          }

          // Generic error
          fastify.log.error({ err: error }, 'Error scanning directory');
          return reply.code(500).send({
            error: {
              code: 'SCAN_FAILED',
              message: 'Failed to scan directory',
              details: error.message,
            },
          });
        }

        // Unknown error type
        fastify.log.error({ err: error }, 'Unknown error scanning directory');
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
