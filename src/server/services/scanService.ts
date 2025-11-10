import { promises as fs } from 'fs';
import path from 'path';
import { DirectoryTree, DirectoryNode, AudioFile } from '../../shared/types/index.js';

/**
 * Service for scanning directories and building audio file trees
 */
export class ScanService {
  private readonly supportedFormats = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'];

  /**
   * Get list of supported audio formats
   * @returns Array of supported file extensions
   */
  getSupportedFormats(): string[] {
    return [...this.supportedFormats];
  }

  /**
   * Scan a directory and return a tree structure of audio files
   * @param rootPath - Root directory path to scan
   * @returns Directory tree structure
   */
  async scanDirectory(rootPath: string): Promise<DirectoryTree> {
    try {
      // Validate that the path exists
      const stats = await fs.stat(rootPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${rootPath}`);
      }

      console.log(`Starting scan of directory: ${rootPath}`);
      const tree = await this.buildTree(rootPath, rootPath);
      console.log(`Scan completed successfully`);
      
      return tree;
    } catch (error) {
      console.error(`Error scanning directory ${rootPath}:`, error);
      throw error;
    }
  }

  /**
   * Recursively build directory tree structure
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

      // Process all entries in parallel
      const promises = entries.map(async (entry) => {
        const fullPath = path.join(currentPath, entry.name);

        try {
          if (entry.isDirectory()) {
            // Recursively scan subdirectory
            const subTree = await this.buildTree(fullPath, rootPath);
            subdirectories.push(subTree);
          } else if (entry.isFile()) {
            // Check if file is a supported audio format
            const ext = path.extname(entry.name).toLowerCase();
            if (this.supportedFormats.includes(ext)) {
              const stats = await fs.stat(fullPath);
              const relativeFilePath = path.relative(rootPath, fullPath);
              
              files.push({
                name: entry.name,
                path: relativeFilePath,
                size: stats.size,
              });
            }
          }
        } catch (error) {
          // Log error but continue processing other files
          console.error(`Error processing ${fullPath}:`, error);
        }
      });

      await Promise.all(promises);

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
}

