import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { AudioMetadata } from '../../shared/types/index.js';
import { validateMetadata } from '../utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AudioDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(__dirname, '../../../data/audio-metadata.db');
    this.db = new Database(dbPath || defaultPath);
    this.initialize();
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
   * Get metadata for a specific file
   * @param filePath - File path to query
   * @returns AudioMetadata or null if not found
   */
  getMetadata(filePath: string): AudioMetadata | null {
    const stmt = this.db.prepare(`
      SELECT id, file_path, rating, description, created_at, updated_at
      FROM audio_metadata
      WHERE file_path = ?
    `);

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
   * Get all metadata records
   * @returns Array of AudioMetadata
   */
  getAllMetadata(): AudioMetadata[] {
    const stmt = this.db.prepare(`
      SELECT id, file_path, rating, description, created_at, updated_at
      FROM audio_metadata
      ORDER BY file_path
    `);

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
   * Insert or update metadata (upsert)
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

    const upsertStmt = this.db.prepare(`
      INSERT INTO audio_metadata (file_path, rating, description, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(file_path) DO UPDATE SET
        rating = excluded.rating,
        description = excluded.description,
        updated_at = CURRENT_TIMESTAMP
    `);

    upsertStmt.run(data.filePath, data.rating, data.description);

    const result = this.getMetadata(data.filePath);
    if (!result) {
      throw new Error('Failed to upsert metadata');
    }

    return result;
  }

  /**
   * Delete metadata for a specific file
   * @param filePath - File path to delete
   * @returns true if deleted, false if not found
   */
  deleteMetadata(filePath: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM audio_metadata
      WHERE file_path = ?
    `);

    const result = stmt.run(filePath);
    return result.changes > 0;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
