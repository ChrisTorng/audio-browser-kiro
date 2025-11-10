import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MetadataService } from '../services/metadataService.js';
import { AudioDatabase } from '../db/database.js';
import {
  ApiErrorResponse,
  GetMetadataResponse,
  UpdateMetadataRequest,
  UpdateMetadataResponse,
  DeleteMetadataResponse,
} from '../../shared/types/api.js';

/**
 * Register metadata routes
 * @param fastify - Fastify instance
 * @param dbInstance - Optional database instance for testing
 */
export async function registerMetadataRoutes(
  fastify: FastifyInstance,
  dbInstance?: AudioDatabase
) {
  // Initialize database and metadata service
  const db = dbInstance || new AudioDatabase();
  const metadataService = new MetadataService(db);

  /**
   * GET /api/metadata
   * Get all metadata records
   */
  fastify.get<{
    Reply: GetMetadataResponse | ApiErrorResponse;
  }>('/api/metadata', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const allMetadata = metadataService.getAllMetadata();

      // Convert array to Record<string, AudioMetadata> format
      const metadataRecord: Record<string, any> = {};
      for (const metadata of allMetadata) {
        metadataRecord[metadata.filePath] = {
          rating: metadata.rating,
          description: metadata.description,
          updatedAt: metadata.updatedAt,
        };
      }

      return reply.code(200).send({
        metadata: metadataRecord,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Error getting metadata');
      return reply.code(500).send({
        error: {
          code: 'GET_METADATA_FAILED',
          message: 'Failed to retrieve metadata',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });

  /**
   * POST /api/metadata
   * Update metadata for a file (upsert)
   */
  fastify.post<{
    Body: UpdateMetadataRequest;
    Reply: UpdateMetadataResponse | ApiErrorResponse;
  }>('/api/metadata', async (request: FastifyRequest<{ Body: UpdateMetadataRequest }>, reply: FastifyReply) => {
    try {
      const { filePath, rating, description } = request.body;

      // Validate required fields
      if (!filePath || filePath.trim().length === 0) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request',
            details: 'filePath is required',
          },
        });
      }

      // At least one of rating or description must be provided
      if (rating === undefined && description === undefined) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request',
            details: 'At least one of rating or description must be provided',
          },
        });
      }

      // Get current metadata or use defaults
      const currentMetadata = metadataService.getMetadata(filePath);
      const finalRating = rating !== undefined ? rating : (currentMetadata?.rating ?? 0);
      const finalDescription = description !== undefined ? description : (currentMetadata?.description ?? '');

      // Update metadata
      const updatedMetadata = metadataService.updateMetadata(
        filePath,
        finalRating,
        finalDescription
      );

      return reply.code(200).send({
        metadata: updatedMetadata,
      });
    } catch (error) {
      // Handle validation errors
      if (error instanceof Error && (error.name === 'ValidationError' || error.message.includes('validation'))) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.message,
          },
        });
      }

      fastify.log.error({ err: error }, 'Error updating metadata');
      return reply.code(500).send({
        error: {
          code: 'UPDATE_METADATA_FAILED',
          message: 'Failed to update metadata',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });

  /**
   * DELETE /api/metadata/:filePath
   * Delete metadata for a specific file
   */
  fastify.delete<{
    Params: { filePath: string };
    Reply: DeleteMetadataResponse | ApiErrorResponse;
  }>('/api/metadata/:filePath', async (request: FastifyRequest<{ Params: { filePath: string } }>, reply: FastifyReply) => {
    try {
      const { filePath } = request.params;

      // Validate file path
      if (!filePath || filePath.trim().length === 0) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request',
            details: 'filePath is required',
          },
        });
      }

      // Decode URL-encoded file path
      const decodedFilePath = decodeURIComponent(filePath);

      // Delete metadata
      const success = metadataService.deleteMetadata(decodedFilePath);

      if (!success) {
        return reply.code(404).send({
          error: {
            code: 'METADATA_NOT_FOUND',
            message: 'Metadata not found',
            details: `No metadata found for file: ${decodedFilePath}`,
          },
        });
      }

      return reply.code(200).send({
        success: true,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Error deleting metadata');
      return reply.code(500).send({
        error: {
          code: 'DELETE_METADATA_FAILED',
          message: 'Failed to delete metadata',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });
}
