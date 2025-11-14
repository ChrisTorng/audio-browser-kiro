import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioMetadata } from '../../../src/client/hooks/useAudioMetadata';
import { AudioMetadata } from '../../../src/shared/types';

// Mock fetch
global.fetch = vi.fn();

describe('useAudioMetadata', () => {
  const mockMetadata: Record<string, AudioMetadata> = {
    'audio/file1.mp3': {
      id: 1,
      filePath: 'audio/file1.mp3',
      rating: 3,
      description: 'Test file 1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    'audio/file2.mp3': {
      id: 2,
      filePath: 'audio/file2.mp3',
      rating: 2,
      description: 'Test file 2',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches metadata on mount', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: mockMetadata }),
    });

    const { result } = renderHook(() => useAudioMetadata());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metadata.size).toBe(2);
    expect(result.current.metadata.get('audio/file1.mp3')).toEqual(mockMetadata['audio/file1.mp3']);
    expect(result.current.error).toBe(null);
  });

  it('handles fetch error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.metadata.size).toBe(0);
  });

  it('updates rating successfully with optimistic update', async () => {
    // Initial fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: mockMetadata }),
    });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock the backend update (fire and forget - we don't wait for it)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        metadata: {
          id: 1,
          filePath: 'audio/file1.mp3',
          rating: 3,
          description: 'Test file 1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      }),
    });

    await act(async () => {
      await result.current.updateRating('audio/file1.mp3', 3);
    });

    // Should be updated immediately (optimistic update)
    expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
  });

  it('validates rating range', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: mockMetadata }),
    });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(async () => {
      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 5);
      });
    }).rejects.toThrow('Rating must be between 0 and 3');
  });

  it('performs optimistic update for rating without waiting for backend', async () => {
    // Initial fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: mockMetadata }),
    });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock backend call (will be fire-and-forget)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        metadata: {
          id: 1,
          filePath: 'audio/file1.mp3',
          rating: 3,
          description: 'Test file 1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      }),
    });

    await act(async () => {
      await result.current.updateRating('audio/file1.mp3', 3);
    });

    // Should be updated immediately (optimistic)
    expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
    
    // Verify backend was called
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metadata',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"rating":3'),
      })
    );
  });

  it('does not rollback on backend sync error (fire and forget)', async () => {
    // Initial fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: mockMetadata }),
    });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const originalRating = result.current.metadata.get('audio/file1.mp3')?.rating;

    // Mock backend error (but we don't wait for it)
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
    });

    // Should not throw since we use fire-and-forget
    await act(async () => {
      await result.current.updateRating('audio/file1.mp3', 1);
    });

    // Should keep the optimistic update (not rollback)
    expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(1);
    expect(result.current.metadata.get('audio/file1.mp3')?.rating).not.toBe(originalRating);
  });

  it('updates description successfully with optimistic update', async () => {
    // Initial fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: mockMetadata }),
    });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock the backend update (fire and forget)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        metadata: {
          id: 1,
          filePath: 'audio/file1.mp3',
          rating: 3,
          description: 'Updated description',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      }),
    });

    await act(async () => {
      await result.current.updateDescription('audio/file1.mp3', 'Updated description');
    });

    // Should be updated immediately (optimistic)
    expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe('Updated description');
  });

  it('performs optimistic update for description without waiting for backend', async () => {
    // Initial fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: mockMetadata }),
    });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock backend call (fire and forget)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        metadata: {
          id: 1,
          filePath: 'audio/file1.mp3',
          rating: 3,
          description: 'New description',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      }),
    });

    await act(async () => {
      await result.current.updateDescription('audio/file1.mp3', 'New description');
    });

    // Should be updated immediately (optimistic)
    expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe('New description');
    
    // Verify backend was called
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metadata',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"description":"New description"'),
      })
    );
  });

  it('deletes metadata successfully', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: mockMetadata }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metadata.has('audio/file1.mp3')).toBe(true);

    await act(async () => {
      await result.current.deleteMetadata('audio/file1.mp3');
    });

    expect(result.current.metadata.has('audio/file1.mp3')).toBe(false);
  });

  it('rolls back on delete error', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: mockMetadata }),
      });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear previous mocks and set up error response
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    await expect(async () => {
      await act(async () => {
        await result.current.deleteMetadata('audio/file1.mp3');
      });
    }).rejects.toThrow();

    // Should rollback - metadata should still exist
    expect(result.current.metadata.has('audio/file1.mp3')).toBe(true);
  });

  it('gets metadata for specific file', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: mockMetadata }),
    });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const metadata = result.current.getMetadata('audio/file1.mp3');
    expect(metadata).toEqual(mockMetadata['audio/file1.mp3']);

    const nonExistent = result.current.getMetadata('audio/nonexistent.mp3');
    expect(nonExistent).toBeUndefined();
  });

  it('refreshes metadata', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: mockMetadata }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: {} }),
      });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metadata.size).toBe(2);

    await act(async () => {
      await result.current.refreshMetadata();
    });

    expect(result.current.metadata.size).toBe(0);
  });

  it('creates new metadata when updating non-existent file with optimistic update', async () => {
    // Initial fetch with empty metadata
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: {} }),
    });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock backend call (fire and forget)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        metadata: {
          id: 3,
          filePath: 'audio/new.mp3',
          rating: 2,
          description: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    });

    await act(async () => {
      await result.current.updateRating('audio/new.mp3', 2);
    });

    // Should create new metadata immediately (optimistic)
    expect(result.current.metadata.has('audio/new.mp3')).toBe(true);
    expect(result.current.metadata.get('audio/new.mp3')?.rating).toBe(2);
  });
});
