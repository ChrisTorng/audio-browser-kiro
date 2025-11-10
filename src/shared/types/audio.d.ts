/**
 * Audio metadata stored in database
 */
export interface AudioMetadata {
    id: number;
    filePath: string;
    rating: number;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Audio file information
 */
export interface AudioFile {
    name: string;
    path: string;
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
}
/**
 * Directory tree root type
 */
export type DirectoryTree = DirectoryNode;
//# sourceMappingURL=audio.d.ts.map