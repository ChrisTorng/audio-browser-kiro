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
    await fs.mkdir(testDir, { recursive: true }, { timeout: 5000 });
    testDbPath = path.join(testDir, 'test-metadata.db');

    // Initialize database and service
    database = new AudioDatabase(testDbPath);
    metadataService = new MetadataService(database);

    // Save original fetch
    originalFetch = global.fetch;
  }, { timeout: 5000 });

  afterAll(async () => {
    // Clean up
    try {
      database.close();
      await fs.rm(path.dirname(testDbPath), { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    
    // Restore fetch
    global.fetch = originalFetch;
  }, 15000);

  beforeEach(() => {
    // Clear database before each test
    // Delete all metadata by getting all and deleting each
    const allMetadata = database.getAllMetadata();
    allMetadata.forEach(meta => database.deleteMetadata(meta.filePath));
    vi.clearAllMocks();
    
    // Setup default fetch mock to prevent hanging
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ metadata: {} }),
    }, { timeout: 5000 });
  }, { timeout: 5000 });

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
      }, { timeout: 5000 });

      // Render hook
      const { result } = renderHook(() => useAudioMetadata());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Verify metadata is loaded
      expect(result.current.metadata.size).toBe(2);
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
      expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe('Great track');
      expect(result.current.metadata.get('audio/file2.mp3')?.rating).toBe(2);
      expect(result.current.error).toBe(null);
    }, { timeout: 5000 });

    it('should handle empty metadata on initial load', async () => {
      // Mock fetch to return empty metadata
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: {} }),
      }, { timeout: 5000 });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.metadata.size).toBe(0);
      expect(result.current.error).toBe(null);
    }, { timeout: 5000 });
  }, { timeout: 5000 });

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
      }, { timeout: 5000 });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Mock update request
      const updatedMetadata = metadataService.updateMetadata('audio/file1.mp3', 3, 'Initial');
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: updatedMetadata }),
      }, { timeout: 5000 });

      // Perform update
      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 3);
      }, { timeout: 5000 });

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
    }, { timeout: 5000 });

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
      }, { timeout: 5000 });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      const originalRating = result.current.metadata.get('audio/file1.mp3')?.rating;

      // Mock failed update
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      }, { timeout: 5000 });

      // Attempt update
      await expect(async () => {
        await act(async () => {
          await result.current.updateRating('audio/file1.mp3', 3);
        }, { timeout: 5000 });
      }).rejects.toThrow();

      // Verify rollback to original value
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(originalRating);
    }, { timeout: 5000 });

    it('should create new metadata for unrated file', async () => {
      // Mock initial fetch (empty)
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: {} }),
      }, { timeout: 5000 });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Mock create request
      const newMetadata = metadataService.updateMetadata('audio/new.mp3', 2, '');
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: newMetadata }),
      }, { timeout: 5000 });

      // Create new metadata
      await act(async () => {
        await result.current.updateRating('audio/new.mp3', 2);
      }, { timeout: 5000 });

      // Verify new metadata exists
      expect(result.current.metadata.has('audio/new.mp3')).toBe(true);
      expect(result.current.metadata.get('audio/new.mp3')?.rating).toBe(2);
    }, { timeout: 5000 });
  }, { timeout: 5000 });

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
      }, { timeout: 5000 });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Mock update request
      const updatedMetadata = metadataService.updateMetadata('audio/file1.mp3', 2, 'New description');
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: updatedMetadata }),
      }, { timeout: 5000 });

      // Perform update
      await act(async () => {
        await result.current.updateDescription('audio/file1.mp3', 'New description');
      }, { timeout: 5000 });

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
    }, { timeout: 5000 });

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
      }, { timeout: 5000 });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      const originalDescription = result.current.metadata.get('audio/file1.mp3')?.description;

      // Mock failed update
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      }, { timeout: 5000 });

      // Attempt update
      await expect(async () => {
        await act(async () => {
          await result.current.updateDescription('audio/file1.mp3', 'Failed description');
        }, { timeout: 5000 });
      }).rejects.toThrow();

      // Verify rollback to original value
      expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe(originalDescription);
    }, { timeout: 5000 });
  }, { timeout: 5000 });

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
      }, { timeout: 5000 });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Mock multiple updates
      for (let rating = 1; rating <= 3; rating++) {
        const updated = metadataService.updateMetadata('audio/file1.mp3', rating, '');
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ metadata: updated }),
        }, { timeout: 5000 });
      }

      // Perform multiple updates
      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 1);
      }, { timeout: 5000 });
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(1);

      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 2);
      }, { timeout: 5000 });
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(2);

      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 3);
      }, { timeout: 5000 });
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
    }, { timeout: 5000 });

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
      }, { timeout: 5000 });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Mock rating update
      let updated = metadataService.updateMetadata('audio/file1.mp3', 3, 'Initial');
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: updated }),
      }, { timeout: 5000 });

      // Update rating
      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 3);
      }, { timeout: 5000 });

      // Mock description update
      updated = metadataService.updateMetadata('audio/file1.mp3', 3, 'Updated description');
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: updated }),
      }, { timeout: 5000 });

      // Update description
      await act(async () => {
        await result.current.updateDescription('audio/file1.mp3', 'Updated description');
      }, { timeout: 5000 });

      // Verify both updates
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
      expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe('Updated description');
    }, { timeout: 5000 });
  }, { timeout: 5000 });

  describe('Metadata Refresh', () => {
    it('should refresh metadata from backend', async () => {
      // Mock initial fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: {} }),
      }, { timeout: 5000 });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

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
      }, { timeout: 5000 });

      // Refresh
      await act(async () => {
        await result.current.refreshMetadata();
      }, { timeout: 5000 });

      // Verify new metadata is loaded
      expect(result.current.metadata.size).toBe(1);
      expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
    }, { timeout: 5000 });
  }, { timeout: 5000 });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.error).not.toBe(null);
      expect(result.current.metadata.size).toBe(0);
    }, { timeout: 5000 });

    it('should handle invalid rating values', async () => {
      // Mock initial fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: {} }),
      }, { timeout: 5000 });

      const { result } = renderHook(() => useAudioMetadata());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // Test invalid ratings
      await expect(async () => {
        await act(async () => {
          await result.current.updateRating('audio/file1.mp3', -1);
        }, { timeout: 5000 });
      }).rejects.toThrow('Rating must be between 0 and 3');

      await expect(async () => {
        await act(async () => {
          await result.current.updateRating('audio/file1.mp3', 4);
        }, { timeout: 5000 });
      }).rejects.toThrow('Rating must be between 0 and 3');
    }, { timeout: 5000 });
  }, { timeout: 5000 });
}, { timeout: 5000 });
