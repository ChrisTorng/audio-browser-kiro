import { AudioMetadata, DirectoryTree } from './audio';
/**
 * API Request Types
 */
export interface ScanDirectoryRequest {
    path: string;
}
export interface UpdateMetadataRequest {
    filePath: string;
    rating?: number;
    description?: string;
}
export interface DeleteMetadataRequest {
    filePath: string;
}
/**
 * API Response Types
 */
export interface ScanDirectoryResponse {
    tree: DirectoryTree;
}
export interface GetMetadataResponse {
    metadata: Record<string, AudioMetadata>;
}
export interface UpdateMetadataResponse {
    metadata: AudioMetadata;
}
export interface DeleteMetadataResponse {
    success: boolean;
}
/**
 * API Error Response
 */
export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: string;
    };
}
//# sourceMappingURL=api.d.ts.map