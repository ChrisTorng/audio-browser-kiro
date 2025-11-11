/**
 * Audio metadata stored in database
 */
export interface AudioMetadata {
  id: number;
  filePath: string; // Unique, relative path
  rating: number; // 0-3 (0=unrated, 1-3=rated)
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Audio file information
 */
export interface AudioFile {
  name: string;
  path: string; // Relative path
  size: number;
}

/**
 * Directory node in the tree structure
 */
export interface DirectoryNode {
  name: string;
  path: string;
  files: AudioFile[];
  subdirectories: DirectoryNode[];
  totalFileCount: number; // Total number of audio files including all subdirectories
}

/**
 * Directory tree root type
 */
export type DirectoryTree = DirectoryNode;
