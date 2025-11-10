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

  it('updates rating successfully', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: mockMetadata }),
      })
      .mockResolvedValueOnce({
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

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateRating('audio/file1.mp3', 3);
    });

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

  it('performs optimistic update for rating', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: mockMetadata }),
      })
      .mockResolvedValueOnce({
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

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateRating('audio/file1.mp3', 3);
    });

    // Should be updated
    expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(3);
  });

  it('rolls back on rating update error', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: mockMetadata }),
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const originalRating = result.current.metadata.get('audio/file1.mp3')?.rating;

    await expect(async () => {
      await act(async () => {
        await result.current.updateRating('audio/file1.mp3', 1);
      });
    }).rejects.toThrow();

    // Should rollback to original value
    expect(result.current.metadata.get('audio/file1.mp3')?.rating).toBe(originalRating);
  });

  it('updates description successfully', async () => {
    // Initial fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: mockMetadata }),
    });

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock the update call
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

    expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe('Updated description');
  });

  it('performs optimistic update for description', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: mockMetadata }),
      })
      .mockResolvedValueOnce({
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

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateDescription('audio/file1.mp3', 'New description');
    });

    // Should be updated
    expect(result.current.metadata.get('audio/file1.mp3')?.description).toBe('New description');
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

  it('creates new metadata when updating non-existent file', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: {} }),
      })
      .mockResolvedValueOnce({
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

    const { result } = renderHook(() => useAudioMetadata());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateRating('audio/new.mp3', 2);
    });

    expect(result.current.metadata.has('audio/new.mp3')).toBe(true);
    expect(result.current.metadata.get('audio/new.mp3')?.rating).toBe(2);
  });
});
