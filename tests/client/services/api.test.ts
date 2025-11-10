import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioBrowserAPI } from '../../../src/client/services/api';
import type {
  DirectoryTree,
  AudioMetadata,
  ScanDirectoryResponse,
  GetMetadataResponse,
  UpdateMetadataResponse,
  DeleteMetadataResponse,
  ApiErrorResponse,
} from '../../../src/shared/types';

describe('AudioBrowserAPI', () => {
  let api: AudioBrowserAPI;

  beforeEach(() => {
    api = new AudioBrowserAPI('/api', 2, 100); // Reduced retries and delay for testing
    vi.clearAllMocks();
  });

  describe('scanDirectory', () => {
    it('should scan directory and return tree structure', async () => {
      const mockTree: DirectoryTree = {
        name: 'music',
        path: '/music',
        files: [
          { name: 'song.mp3', path: '/music/song.mp3', size: 1024 },
        ],
        subdirectories: [],
      };

      const mockResponse: ScanDirectoryResponse = { tree: mockTree };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.scanDirectory('/music');

      expect(result).toEqual(mockTree);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scan',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/music' }),
        })
      );
    });

    it('should handle scan errors', async () => {
      const mockError: ApiErrorResponse = {
        error: {
          code: 'SCAN_FAILED',
          message: 'Directory not found',
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockError,
      });

      await expect(api.scanDirectory('/invalid')).rejects.toThrow(
        'API Error: Directory not found (SCAN_FAILED)'
      );
    });
  });

  describe('getAudioFile', () => {
    it('should fetch audio file as Blob', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/mpeg' });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      });

      const result = await api.getAudioFile('/music/song.mp3');

      expect(result).toEqual(mockBlob);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/audio/%2Fmusic%2Fsong.mp3',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle audio file fetch errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(api.getAudioFile('/invalid.mp3')).rejects.toThrow(
        'Failed to fetch audio file: Not Found'
      );
    });
  });

  describe('getAllMetadata', () => {
    it('should fetch all metadata', async () => {
      const mockMetadata: Record<string, AudioMetadata> = {
        '/music/song.mp3': {
          id: 1,
          filePath: '/music/song.mp3',
          rating: 3,
          description: 'Great song',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      };

      const mockResponse: GetMetadataResponse = { metadata: mockMetadata };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.getAllMetadata();

      expect(result).toEqual(mockMetadata);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/metadata',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('updateMetadata', () => {
    it('should update metadata with rating and description', async () => {
      const mockMetadata: AudioMetadata = {
        id: 1,
        filePath: '/music/song.mp3',
        rating: 3,
        description: 'Updated description',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      };

      const mockResponse: UpdateMetadataResponse = { metadata: mockMetadata };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateMetadata(
        '/music/song.mp3',
        3,
        'Updated description'
      );

      expect(result).toEqual(mockMetadata);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/metadata',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: '/music/song.mp3',
            rating: 3,
            description: 'Updated description',
          }),
        })
      );
    });

    it('should update metadata with only rating', async () => {
      const mockMetadata: AudioMetadata = {
        id: 1,
        filePath: '/music/song.mp3',
        rating: 2,
        description: '',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      };

      const mockResponse: UpdateMetadataResponse = { metadata: mockMetadata };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateMetadata('/music/song.mp3', 2);

      expect(result).toEqual(mockMetadata);
    });
  });

  describe('deleteMetadata', () => {
    it('should delete metadata successfully', async () => {
      const mockResponse: DeleteMetadataResponse = { success: true };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.deleteMetadata('/music/song.mp3');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/metadata/%2Fmusic%2Fsong.mp3',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      const mockTree: DirectoryTree = {
        name: 'music',
        path: '/music',
        files: [],
        subdirectories: [],
      };

      const mockResponse: ScanDirectoryResponse = { tree: mockTree };

      // Fail first attempt, succeed on second
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const result = await api.scanDirectory('/music');

      expect(result).toEqual(mockTree);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client errors', async () => {
      const mockError: ApiErrorResponse = {
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid directory path',
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockError,
      });

      await expect(api.scanDirectory('/invalid')).rejects.toThrow(
        'API Error: Invalid directory path (INVALID_PATH)'
      );

      // Should only be called once (no retry on 4xx errors)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(api.scanDirectory('/music')).rejects.toThrow(
        'Request failed after 2 attempts'
      );

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
