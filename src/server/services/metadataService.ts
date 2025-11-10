import { AudioDatabase } from '../db/database.js';
import { AudioMetadata } from '../../shared/types/index.js';

/**
 * Service for managing audio file metadata
 * Provides business logic layer on top of database operations
 */
export class MetadataService {
  private db: AudioDatabase;

  constructor(db: AudioDatabase) {
    this.db = db;
  }

  /**
   * Get metadata for a specific file
   * @param filePath - File path to query
   * @returns AudioMetadata or null if not found
   */
  getMetadata(filePath: string): AudioMetadata | null {
    return this.db.getMetadata(filePath);
  }

  /**
   * Get all metadata records
   * @returns Array of AudioMetadata
   */
  getAllMetadata(): AudioMetadata[] {
    return this.db.getAllMetadata();
  }

  /**
   * Update metadata for a file (upsert logic)
   * @param filePath - File path to update
   * @param rating - Rating value (0-3)
   * @param description - Description text
   * @returns Updated AudioMetadata
   * @throws ValidationError if data is invalid
   */
  updateMetadata(
    filePath: string,
    rating: number,
    description: string
  ): AudioMetadata {
    return this.db.upsertMetadata({ filePath, rating, description });
  }

  /**
   * Delete metadata for a specific file
   * @param filePath - File path to delete
   * @returns true if deleted, false if not found
   */
  deleteMetadata(filePath: string): boolean {
    return this.db.deleteMetadata(filePath);
  }
}
