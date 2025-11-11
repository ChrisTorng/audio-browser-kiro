import { promises as fs } from 'fs';
import path from 'path';
import { DirectoryTree, DirectoryNode, AudioFile } from '../../shared/types/audio';

/**
 * Supported audio file formats
 */
const SUPPORTED_AUDIO_FORMATS = [
  '.mp3',
  '.wav',
  '.flac',
  '.ogg',
  '.m4a',
  '.aac',
];

/**
 * Service for scanning audio files and building directory tree
 * Caches the scanned tree structure for quick access
 */
export class ScanService {
  private cachedTree: DirectoryTree | null = null;
  private rootPath: string = '';

  /**
   * Initialize the scan service by scanning the audio directory
   * @param audioDirectory - Root directory to scan for audio files
   * @throws Error if directory doesn't exist or cannot be accessed
   */
  async initialize(audioDirectory: string): Promise<void> {
    try {
      console.log(`Starting scan of audio directory: ${audioDirectory}`);
      const startTime = Date.now();

      // Scan and build tree (this will also cache the result)
      const tree = await this.scanDirectory(audioDirectory, false);

      const duration = Date.now() - startTime;
      const fileCount = this.countFiles(tree);
      console.log(
        `Scan completed in ${duration}ms. Found ${fileCount} audio files.`
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(
          `Audio directory not found: ${audioDirectory}. ` +
          `Please check the path in config.json.`
        );
      }

      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        console.warn(
          `Permission denied accessing directory: ${audioDirectory}. ` +
          `Continuing with available files.`
        );
        throw error;
      }

      throw error;
    }
  }

  /**
   * Get the cached directory tree
   * @throws Error if tree is not initialized
   * @returns Cached directory tree
   */
  getTree(): DirectoryTree {
    if (!this.cachedTree) {
      throw new Error(
        'Directory tree not initialized. Call initialize() first.'
      );
    }

    return this.cachedTree;
  }

  /**
   * Get list of supported audio formats
   * @returns Array of supported file extensions
   */
  getSupportedFormats(): string[] {
    return [...SUPPORTED_AUDIO_FORMATS];
  }

  /**
   * Scan directory and build tree structure recursively
   * @param dirPath - Directory path to scan
   * @param useCache - Whether to use cached result (default: true)
   * @returns Directory tree structure
   */
  async scanDirectory(dirPath: string, useCache: boolean = true): Promise<DirectoryTree> {
    // Resolve to absolute path
    const absolutePath = path.resolve(dirPath);

    // Check if we can use cached result
    if (useCache && this.cachedTree && this.rootPath === absolutePath) {
      return this.cachedTree;
    }

    // Update root path
    this.rootPath = absolutePath;

    // Check if directory exists
    const stats = await fs.stat(absolutePath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${absolutePath}`);
    }

    const node = await this.buildTree(absolutePath);

    // Filter out directories without audio files
    this.filterEmptyDirectories(node);

    // Calculate total file count for all nodes
    this.calculateTotalFileCount(node);

    // Cache the result
    this.cachedTree = node;

    return node;
  }

  /**
   * Clear the cached directory tree
   */
  clearCache(): void {
    this.cachedTree = null;
  }

  /**
   * Build directory tree recursively
   * @param dirPath - Directory path to process
   * @returns Directory node
   */
  private async buildTree(dirPath: string): Promise<DirectoryNode> {
    const relativePath = path.relative(this.rootPath, dirPath);
    const name = path.basename(dirPath) || path.basename(this.rootPath);

    const node: DirectoryNode = {
      name,
      path: relativePath || '.',
      files: [],
      subdirectories: [],
      totalFileCount: 0, // Will be calculated later
    };

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      // Process all entries in parallel
      const promises = entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);

        try {
          if (entry.isDirectory()) {
            // Recursively process subdirectory
            const subNode = await this.buildTree(fullPath);
            node.subdirectories.push(subNode);
          } else if (entry.isFile()) {
            // Check if it's a supported audio file
            if (this.isAudioFile(entry.name)) {
              const stats = await fs.stat(fullPath);
              const audioFile: AudioFile = {
                name: entry.name,
                path: path.relative(this.rootPath, fullPath),
                size: stats.size,
              };
              node.files.push(audioFile);
            }
          }
        } catch (error) {
          // Log error but continue processing other files
          console.error(
            `Error processing ${fullPath}: ${(error as Error).message}`
          );
        }
      });

      await Promise.all(promises);

      // Sort files and subdirectories alphabetically
      node.files.sort((a, b) => a.name.localeCompare(b.name));
      node.subdirectories.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error(
        `Error reading directory ${dirPath}: ${(error as Error).message}`
      );
    }

    return node;
  }

  /**
   * Check if a file is a supported audio file
   * @param filename - File name to check
   * @returns true if file is a supported audio format
   */
  private isAudioFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return SUPPORTED_AUDIO_FORMATS.includes(ext);
  }

  /**
   * Filter out directories that don't contain any audio files
   * Modifies the tree in place
   * @param node - Directory node to filter
   * @returns true if node has audio files (directly or in subdirectories)
   */
  private filterEmptyDirectories(node: DirectoryNode): boolean {
    // First, recursively filter subdirectories
    node.subdirectories = node.subdirectories.filter((subNode) =>
      this.filterEmptyDirectories(subNode)
    );

    // Check if this node has audio files
    return this.hasAudioFiles(node);
  }

  /**
   * Check if a directory node contains audio files
   * Checks both direct files and files in subdirectories
   * @param node - Directory node to check
   * @returns true if node contains audio files
   */
  private hasAudioFiles(node: DirectoryNode): boolean {
    // Has direct audio files
    if (node.files.length > 0) {
      return true;
    }

    // Has audio files in subdirectories
    return node.subdirectories.some((subNode) => this.hasAudioFiles(subNode));
  }

  /**
   * Count total number of audio files in tree
   * @param node - Directory node to count
   * @returns Total number of audio files
   */
  private countFiles(node: DirectoryNode): number {
    let count = node.files.length;

    for (const subNode of node.subdirectories) {
      count += this.countFiles(subNode);
    }

    return count;
  }

  /**
   * Calculate total file count for all nodes recursively
   * Modifies the tree in place
   * @param node - Directory node to calculate
   * @returns Total number of audio files in this node and all subdirectories
   */
  private calculateTotalFileCount(node: DirectoryNode): number {
    // Start with direct files
    let total = node.files.length;

    // Add files from all subdirectories
    for (const subNode of node.subdirectories) {
      total += this.calculateTotalFileCount(subNode);
    }

    // Update the node's totalFileCount
    node.totalFileCount = total;

    return total;
  }

  /**
   * Check if scan service is initialized
   * @returns true if initialized
   */
  isInitialized(): boolean {
    return this.cachedTree !== null;
  }
}
