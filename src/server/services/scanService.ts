import { promises as fs } from 'fs';
import path from 'path';
import { DirectoryTree, DirectoryNode, AudioFile } from '../../shared/types/index.js';

interface CacheEntry {
  tree: DirectoryTree;
  timestamp: number;
  mtime: number; // Directory modification time
}

/**
 * Service for scanning directories and building audio file trees
 * Includes caching and optimized async operations
 */
export class ScanService {
  private readonly supportedFormats = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'];
  private readonly scanCache = new Map<string, CacheEntry>();
  private readonly cacheTTL = 60000; // 60 seconds cache TTL
  private readonly maxConcurrency = 10; // Limit concurrent directory scans

  /**
   * Get list of supported audio formats
   * @returns Array of supported file extensions
   */
  getSupportedFormats(): string[] {
    return [...this.supportedFormats];
  }

  /**
   * Scan a directory and return a tree structure of audio files
   * Uses caching to avoid redundant scans
   * @param rootPath - Root directory path to scan
   * @param useCache - Whether to use cached results (default: true)
   * @returns Directory tree structure
   */
  async scanDirectory(rootPath: string, useCache = true): Promise<DirectoryTree> {
    try {
      // Validate that the path exists
      const stats = await fs.stat(rootPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${rootPath}`);
      }

      // Check cache if enabled
      if (useCache) {
        const cached = this.getCachedScan(rootPath, stats.mtimeMs);
        if (cached) {
          console.log(`Using cached scan for directory: ${rootPath}`);
          return cached;
        }
      }

      console.log(`Starting scan of directory: ${rootPath}`);
      const startTime = Date.now();
      const tree = await this.buildTree(rootPath, rootPath);
      const duration = Date.now() - startTime;
      console.log(`Scan completed successfully in ${duration}ms`);
      
      // Cache the result
      this.cacheScan(rootPath, tree, stats.mtimeMs);
      
      return tree;
    } catch (error) {
      console.error(`Error scanning directory ${rootPath}:`, error);
      throw error;
    }
  }

  /**
   * Get cached scan result if valid
   * @param rootPath - Directory path
   * @param currentMtime - Current modification time of directory
   * @returns Cached tree or null if invalid/expired
   */
  private getCachedScan(rootPath: string, currentMtime: number): DirectoryTree | null {
    const cached = this.scanCache.get(rootPath);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - cached.timestamp > this.cacheTTL;
    const isModified = cached.mtime !== currentMtime;

    if (isExpired || isModified) {
      this.scanCache.delete(rootPath);
      return null;
    }

    return cached.tree;
  }

  /**
   * Cache scan result
   * @param rootPath - Directory path
   * @param tree - Directory tree to cache
   * @param mtime - Modification time of directory
   */
  private cacheScan(rootPath: string, tree: DirectoryTree, mtime: number): void {
    this.scanCache.set(rootPath, {
      tree,
      timestamp: Date.now(),
      mtime,
    });

    // Limit cache size to prevent memory issues
    if (this.scanCache.size > 100) {
      const firstKey = this.scanCache.keys().next().value;
      this.scanCache.delete(firstKey);
    }
  }

  /**
   * Clear scan cache
   */
  clearCache(): void {
    this.scanCache.clear();
  }

  /**
   * Recursively build directory tree structure with optimized concurrency
   * @param currentPath - Current directory path being scanned
   * @param rootPath - Root directory path for calculating relative paths
   * @returns Directory node with files and subdirectories
   */
  private async buildTree(currentPath: string, rootPath: string): Promise<DirectoryNode> {
    const files: AudioFile[] = [];
    const subdirectories: DirectoryNode[] = [];
    const relativePath = path.relative(rootPath, currentPath) || '.';
    const dirName = path.basename(currentPath);

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      // Separate directories and files for optimized processing
      const directories: string[] = [];
      const audioFiles: Array<{ name: string; fullPath: string }> = [];

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          directories.push(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.supportedFormats.includes(ext)) {
            audioFiles.push({ name: entry.name, fullPath });
          }
        }
      }

      // Process files in parallel (fast operation)
      const filePromises = audioFiles.map(async ({ name, fullPath }) => {
        try {
          const stats = await fs.stat(fullPath);
          const relativeFilePath = path.relative(rootPath, fullPath);
          return {
            name,
            path: relativeFilePath,
            size: stats.size,
          };
        } catch (error) {
          console.error(`Error processing file ${fullPath}:`, error);
          return null;
        }
      });

      const fileResults = await Promise.all(filePromises);
      files.push(...fileResults.filter((f): f is AudioFile => f !== null));

      // Process subdirectories with controlled concurrency
      subdirectories.push(...await this.processDirectoriesWithConcurrency(directories, rootPath));

      // Sort files and subdirectories alphabetically
      files.sort((a, b) => a.name.localeCompare(b.name));
      subdirectories.sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error);
      // Return partial results even if there's an error
    }

    return {
      name: dirName,
      path: relativePath,
      files,
      subdirectories,
    };
  }

  /**
   * Process directories with controlled concurrency to avoid overwhelming the system
   * @param directories - Array of directory paths to process
   * @param rootPath - Root directory path
   * @returns Array of directory nodes
   */
  private async processDirectoriesWithConcurrency(
    directories: string[],
    rootPath: string
  ): Promise<DirectoryNode[]> {
    const results: DirectoryNode[] = [];
    
    // Process directories in batches to control concurrency
    for (let i = 0; i < directories.length; i += this.maxConcurrency) {
      const batch = directories.slice(i, i + this.maxConcurrency);
      const batchPromises = batch.map(async (dir) => {
        try {
          return await this.buildTree(dir, rootPath);
        } catch (error) {
          console.error(`Error processing directory ${dir}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((r): r is DirectoryNode => r !== null));
    }
    
    return results;
  }
}

