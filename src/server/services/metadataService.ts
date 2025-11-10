import { AudioDatabase } from '../db/database.js';
import { AudioMetadata } from '../../shared/types/index.js';

/**
 * Service for managing audio file metadata
 * Provides business logic layer with caching on top of database operations
 */
export class MetadataService {
  private db: AudioDatabase;
  private metadataCache: Map<string, AudioMetadata>;
  private allMetadataCache: AudioMetadata[] | null;
  private cacheTimestamp: number;
  private readonly cacheTTL = 30000; // 30 seconds cache TTL

  constructor(db: AudioDatabase) {
    this.db = db;
    this.metadataCache = new Map();
    this.allMetadataCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Check if cache is valid
   * @returns true if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.cacheTTL;
  }

  /**
   * Invalidate all caches
   */
  private invalidateCache(): void {
    this.metadataCache.clear();
    this.allMetadataCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get metadata for a specific file (with caching)
   * @param filePath - File path to query
   * @returns AudioMetadata or null if not found
   */
  getMetadata(filePath: string): AudioMetadata | null {
    // Check individual cache first
    if (this.isCacheValid() && this.metadataCache.has(filePath)) {
      return this.metadataCache.get(filePath) || null;
    }

    // Fetch from database
    const metadata = this.db.getMetadata(filePath);
    
    // Cache the result
    if (metadata) {
      this.metadataCache.set(filePath, metadata);
      this.cacheTimestamp = Date.now();
    }

    return metadata;
  }

  /**
   * Get all metadata records (with caching)
   * @returns Array of AudioMetadata
   */
  getAllMetadata(): AudioMetadata[] {
    // Check cache first
    if (this.isCacheValid() && this.allMetadataCache !== null) {
      return this.allMetadataCache;
    }

    // Fetch from database
    const metadata = this.db.getAllMetadata();
    
    // Update both caches
    this.allMetadataCache = metadata;
    this.metadataCache.clear();
    for (const item of metadata) {
      this.metadataCache.set(item.filePath, item);
    }
    this.cacheTimestamp = Date.now();

    return metadata;
  }

  /**
   * Update metadata for a file (upsert logic)
   * Invalidates cache after update
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
    const result = this.db.upsertMetadata({ filePath, rating, description });
    
    // Invalidate cache after update
    this.invalidateCache();
    
    return result;
  }

  /**
   * Batch update multiple metadata records
   * @param updates - Array of metadata updates
   * @returns Number of records updated
   */
  batchUpdateMetadata(
    updates: Array<{
      filePath: string;
      rating: number;
      description: string;
    }>
  ): number {
    const count = this.db.batchUpsertMetadata(updates);
    
    // Invalidate cache after batch update
    this.invalidateCache();
    
    return count;
  }

  /**
   * Delete metadata for a specific file
   * Invalidates cache after deletion
   * @param filePath - File path to delete
   * @returns true if deleted, false if not found
   */
  deleteMetadata(filePath: string): boolean {
    const result = this.db.deleteMetadata(filePath);
    
    // Invalidate cache after deletion
    if (result) {
      this.invalidateCache();
    }
    
    return result;
  }

  /**
   * Batch delete multiple metadata records
   * @param filePaths - Array of file paths to delete
   * @returns Number of records deleted
   */
  batchDeleteMetadata(filePaths: string[]): number {
    const count = this.db.batchDeleteMetadata(filePaths);
    
    // Invalidate cache after batch deletion
    if (count > 0) {
      this.invalidateCache();
    }
    
    return count;
  }

  /**
   * Clear service cache manually
   */
  clearCache(): void {
    this.invalidateCache();
  }
}
