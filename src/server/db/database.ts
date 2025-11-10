import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { AudioMetadata } from '../../shared/types/index.js';
import { validateMetadata } from '../utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AudioDatabase {
  private db: Database.Database;
  private preparedStatements: Map<string, Database.Statement>;

  constructor(dbPath?: string) {
    const defaultPath = path.join(__dirname, '../../../data/audio-metadata.db');
    this.db = new Database(dbPath || defaultPath);
    this.preparedStatements = new Map();
    this.initialize();
    this.optimizeDatabase();
  }

  /**
   * Initialize database schema and indexes
   */
  initialize(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS audio_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        rating INTEGER DEFAULT 0 CHECK(rating >= 0 AND rating <= 3),
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createFilePathIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_file_path ON audio_metadata(file_path)
    `;

    const createRatingIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_rating ON audio_metadata(rating)
    `;

    this.db.exec(createTableSQL);
    this.db.exec(createFilePathIndexSQL);
    this.db.exec(createRatingIndexSQL);
  }

  /**
   * Optimize database performance settings
   */
  private optimizeDatabase(): void {
    // Enable WAL mode for better concurrent read/write performance
    this.db.pragma('journal_mode = WAL');
    
    // Increase cache size (in pages, negative means KB)
    this.db.pragma('cache_size = -64000'); // 64MB cache
    
    // Use memory for temporary tables
    this.db.pragma('temp_store = MEMORY');
    
    // Optimize for faster writes
    this.db.pragma('synchronous = NORMAL');
    
    // Enable memory-mapped I/O for better performance
    this.db.pragma('mmap_size = 30000000000'); // 30GB
  }

  /**
   * Get or create a prepared statement (cached)
   * @param key - Unique key for the statement
   * @param sql - SQL query string
   * @returns Prepared statement
   */
  private getPreparedStatement(key: string, sql: string): Database.Statement {
    let stmt = this.preparedStatements.get(key);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.preparedStatements.set(key, stmt);
    }
    return stmt;
  }

  /**
   * Get metadata for a specific file (uses cached prepared statement)
   * @param filePath - File path to query
   * @returns AudioMetadata or null if not found
   */
  getMetadata(filePath: string): AudioMetadata | null {
    const stmt = this.getPreparedStatement(
      'getMetadata',
      `SELECT id, file_path, rating, description, created_at, updated_at
       FROM audio_metadata
       WHERE file_path = ?`
    );

    const row = stmt.get(filePath) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      filePath: row.file_path,
      rating: row.rating,
      description: row.description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Get all metadata records (uses cached prepared statement)
   * @returns Array of AudioMetadata
   */
  getAllMetadata(): AudioMetadata[] {
    const stmt = this.getPreparedStatement(
      'getAllMetadata',
      `SELECT id, file_path, rating, description, created_at, updated_at
       FROM audio_metadata
       ORDER BY file_path`
    );

    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      filePath: row.file_path,
      rating: row.rating,
      description: row.description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Insert or update metadata (upsert) - uses cached prepared statement
   * @param data - Metadata to insert or update
   * @returns Updated AudioMetadata
   * @throws ValidationError if data is invalid
   */
  upsertMetadata(data: {
    filePath: string;
    rating: number;
    description: string;
  }): AudioMetadata {
    // Validate data before database operation
    validateMetadata(data);

    const upsertStmt = this.getPreparedStatement(
      'upsertMetadata',
      `INSERT INTO audio_metadata (file_path, rating, description, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(file_path) DO UPDATE SET
         rating = excluded.rating,
         description = excluded.description,
         updated_at = CURRENT_TIMESTAMP`
    );

    upsertStmt.run(data.filePath, data.rating, data.description);

    const result = this.getMetadata(data.filePath);
    if (!result) {
      throw new Error('Failed to upsert metadata');
    }

    return result;
  }

  /**
   * Batch upsert multiple metadata records in a transaction
   * @param dataArray - Array of metadata to insert or update
   * @returns Number of records processed
   */
  batchUpsertMetadata(
    dataArray: Array<{
      filePath: string;
      rating: number;
      description: string;
    }>
  ): number {
    // Validate all data first
    for (const data of dataArray) {
      validateMetadata(data);
    }

    const upsertStmt = this.getPreparedStatement(
      'upsertMetadata',
      `INSERT INTO audio_metadata (file_path, rating, description, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(file_path) DO UPDATE SET
         rating = excluded.rating,
         description = excluded.description,
         updated_at = CURRENT_TIMESTAMP`
    );

    // Use transaction for batch operations
    const batchUpsert = this.db.transaction((items: typeof dataArray) => {
      for (const item of items) {
        upsertStmt.run(item.filePath, item.rating, item.description);
      }
    });

    batchUpsert(dataArray);
    return dataArray.length;
  }

  /**
   * Delete metadata for a specific file (uses cached prepared statement)
   * @param filePath - File path to delete
   * @returns true if deleted, false if not found
   */
  deleteMetadata(filePath: string): boolean {
    const stmt = this.getPreparedStatement(
      'deleteMetadata',
      `DELETE FROM audio_metadata WHERE file_path = ?`
    );

    const result = stmt.run(filePath);
    return result.changes > 0;
  }

  /**
   * Batch delete multiple metadata records in a transaction
   * @param filePaths - Array of file paths to delete
   * @returns Number of records deleted
   */
  batchDeleteMetadata(filePaths: string[]): number {
    const deleteStmt = this.getPreparedStatement(
      'deleteMetadata',
      `DELETE FROM audio_metadata WHERE file_path = ?`
    );

    // Use transaction for batch operations
    const batchDelete = this.db.transaction((paths: string[]) => {
      let count = 0;
      for (const filePath of paths) {
        const result = deleteStmt.run(filePath);
        count += result.changes;
      }
      return count;
    });

    return batchDelete(filePaths);
  }

  /**
   * Vacuum database to reclaim space and optimize
   */
  vacuum(): void {
    this.db.exec('VACUUM');
  }

  /**
   * Analyze database to update query optimizer statistics
   */
  analyze(): void {
    this.db.exec('ANALYZE');
  }

  /**
   * Close database connection and cleanup prepared statements
   */
  close(): void {
    // Clear prepared statements cache
    this.preparedStatements.clear();
    this.db.close();
  }
}
