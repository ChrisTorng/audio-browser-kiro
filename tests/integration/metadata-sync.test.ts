import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioMetadata } from '../../src/client/hooks/useAudioMetadata';
import { AudioDatabase } from '../../src/server/db/database';
import { MetadataService } from '../../src/server/services/metadataService';

/**
 * Integration test for metadata synchronization flow
 * Tests the complete flow from frontend to backend including:
 * - Loading all metadata on mount
 * - Optimistic updates for rating and description
 * - Error rollback on failed updates
 * - Synchronization with backend
 */
describe('Metadata Synchronization Integration', () => {
  let testDbPath: string;
  let database: AudioDatabase;
  let metadataService: MetadataService;
  let originalFetch: typeof global.fetch;

  beforeAll(async () => {
    // Create temporary database
    const testDir = path.join(os.tmpdir(), `audio-browser-metadata-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    testDbPath = path.join(testDir, 'test-metadata.db');

    // Initialize database and service
    database = new AudioDatabase(testDbPath);
    metadataService = new MetadataService(database);

    // Save original fetch
    originalFetch = global.fetch;
  });

  afterAll(async () => {
    // Clean up
    database.close();
    await fs.rm(path.dirname(testDbPath), { recursive: true, force: true });
    
    // Restore fetch
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    // Clear database before each test
    // Delete all metadata by getting all and deleting each
    const allMetadata = database.getAllMetadata();
    allMetadata.forEach(meta => database.deleteMetadata(meta.filePath));
    vi.clearAllMocks();
  });

  describe('Initial Metadata Loading', () => {
    it('should load all metadata from backend on mount', async () => {
      // Setup: Add metadata to database
      metadataService.updateMetadata('audio/file1.mp3', 3, 'Great track');
      metadataService.updateMetadata('audio/file2.mp3', 2, 'Good song');

      // Mock fetch to return database data
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: {
            'audio/file1.mp3': metadataService.getMetadata('audio/file1.mp3'),
            'audio/file2.mp3': metadataService.getMetadata('audio/file2.mp3'),
          },
        }),
      });

      // Render hook
      const { result } = renderHook(() => useAudioMetadata());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify metadata is loaded
      expect(result.current.metadata.size).toBe(2);
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
      expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe('Great track');
      expect(result.current.metadata.get('audio/file2.mp3')?.rating).toBe(2);
      expect(result.current.error).toBe(null);
    });

    it('should handle empty metadata on initial load', async () => {
      // Mock fetch to return empty metadata
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: {} }),
      });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.metadata.size).toBe(0);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Optimistic Rating Updates', () => {
    it('should perform optimistic update and sync with backend', async () => {
      // Setup: Initial metadata
      metadataService.updateMetadata('audio/file1.mp3', 1, 'Initial');

      // Mock initial fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: {
            'audio/file1.mp3': metadataService.getMetadata('audio/file1.mp3'),
          },
        }),
      });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock update request
      const updatedMetadata = metadataService.updateMetadata('audio/file1.mp3', 3, 'Initial');
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: updatedMetadata }),
      });

      // Perform update
      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 3);
      });

      // Verify optimistic update
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);

      // Verify backend was called
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/metadata',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            filePath: 'audio/file1.mp3',
            rating: 3,
            description: 'Initial',
          }),
        })
      );
    });

    it('should rollback on rating update failure', async () => {
      // Setup: Initial metadata
      metadataService.updateMetadata('audio/file1.mp3', 2, 'Test');

      // Mock initial fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: {
            'audio/file1.mp3': metadataService.getMetadata('audio/file1.mp3'),
          },
        }),
      });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalRating = result.current.metadata.get('audio/file1.mp3')?.rating;

      // Mock failed update
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      // Attempt update
      await expect(async () => {
        await act(async () => {
          await result.current.updateRating('audio/file1.mp3', 3);
        });
      }).rejects.toThrow();

      // Verify rollback to original value
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(originalRating);
    });

    it('should create new metadata for unrated file', async () => {
      // Mock initial fetch (empty)
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: {} }),
      });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock create request
      const newMetadata = metadataService.updateMetadata('audio/new.mp3', 2, '');
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: newMetadata }),
      });

      // Create new metadata
      await act(async () => {
        await result.current.updateRating('audio/new.mp3', 2);
      });

      // Verify new metadata exists
      expect(result.current.metadata.has('audio/new.mp3')).toBe(true);
      expect(result.current.metadata.get('audio/new.mp3')?.rating).toBe(2);
    });
  });

  describe('Optimistic Description Updates', () => {
    it('should perform optimistic update and sync with backend', async () => {
      // Setup: Initial metadata
      metadataService.updateMetadata('audio/file1.mp3', 2, 'Old description');

      // Mock initial fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: {
            'audio/file1.mp3': metadataService.getMetadata('audio/file1.mp3'),
          },
        }),
      });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock update request
      const updatedMetadata = metadataService.updateMetadata('audio/file1.mp3', 2, 'New description');
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: updatedMetadata }),
      });

      // Perform update
      await act(async () => {
        await result.current.updateDescription('audio/file1.mp3', 'New description');
      });

      // Verify optimistic update
      expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe('New description');

      // Verify backend was called
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/metadata',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            filePath: 'audio/file1.mp3',
            rating: 2,
            description: 'New description',
          }),
        })
      );
    });

    it('should rollback on description update failure', async () => {
      // Setup: Initial metadata
      metadataService.updateMetadata('audio/file1.mp3', 2, 'Original description');

      // Mock initial fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: {
            'audio/file1.mp3': metadataService.getMetadata('audio/file1.mp3'),
          },
        }),
      });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalDescription = result.current.metadata.get('audio/file1.mp3')?.description;

      // Mock failed update
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      // Attempt update
      await expect(async () => {
        await act(async () => {
          await result.current.updateDescription('audio/file1.mp3', 'Failed description');
        });
      }).rejects.toThrow();

      // Verify rollback to original value
      expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe(originalDescription);
    });
  });

  describe('Multiple Concurrent Updates', () => {
    it('should handle multiple rating updates in sequence', async () => {
      // Setup: Initial metadata
      metadataService.updateMetadata('audio/file1.mp3', 0, '');

      // Mock initial fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: {
            'audio/file1.mp3': metadataService.getMetadata('audio/file1.mp3'),
          },
        }),
      });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock multiple updates
      for (let rating = 1; rating <= 3; rating++) {
        const updated = metadataService.updateMetadata('audio/file1.mp3', rating, '');
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ metadata: updated }),
        });
      }

      // Perform multiple updates
      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 1);
      });
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(1);

      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 2);
      });
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(2);

      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 3);
      });
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
    });

    it('should handle rating and description updates together', async () => {
      // Setup: Initial metadata
      metadataService.updateMetadata('audio/file1.mp3', 1, 'Initial');

      // Mock initial fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: {
            'audio/file1.mp3': metadataService.getMetadata('audio/file1.mp3'),
          },
        }),
      });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock rating update
      let updated = metadataService.updateMetadata('audio/file1.mp3', 3, 'Initial');
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: updated }),
      });

      // Update rating
      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 3);
      });

      // Mock description update
      updated = metadataService.updateMetadata('audio/file1.mp3', 3, 'Updated description');
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: updated }),
      });

      // Update description
      await act(async () => {
        await result.current.updateDescription('audio/file1.mp3', 'Updated description');
      });

      // Verify both updates
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
      expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe('Updated description');
    });
  });

  describe('Metadata Refresh', () => {
    it('should refresh metadata from backend', async () => {
      // Mock initial fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: {} }),
      });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.metadata.size).toBe(0);

      // Add metadata to backend
      metadataService.updateMetadata('audio/file1.mp3', 3, 'New file');

      // Mock refresh fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: {
            'audio/file1.mp3': metadataService.getMetadata('audio/file1.mp3'),
          },
        }),
      });

      // Refresh
      await act(async () => {
        await result.current.refreshMetadata();
      });

      // Verify new metadata is loaded
      expect(result.current.metadata.size).toBe(1);
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBe(null);
      expect(result.current.metadata.size).toBe(0);
    });

    it('should handle invalid rating values', async () => {
      // Mock initial fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: {} }),
      });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test invalid ratings
      await expect(async () => {
        await act(async () => {
          await result.current.updateRating('audio/file1.mp3', -1);
        });
      }).rejects.toThrow('Rating must be between 0 and 3');

      await expect(async () => {
        await act(async () => {
          await result.current.updateRating('audio/file1.mp3', 4);
        });
      }).rejects.toThrow('Rating must be between 0 and 3');
    });
  });
});
