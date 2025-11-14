import { useState, useCallback, useEffect } from 'react';
import { AudioMetadata } from '../../shared/types';

/**
 * Audio metadata hook return type
 */
export interface UseAudioMetadataReturn {
  metadata: Map<string, AudioMetadata>;
  isLoading: boolean;
  error: Error | null;
  updateRating: (filePath: string, rating: number) => Promise<void>;
  updateDescription: (filePath: string, description: string) => Promise<void>;
  deleteMetadata: (filePath: string) => Promise<void>;
  getMetadata: (filePath: string) => AudioMetadata | undefined;
  refreshMetadata: () => Promise<void>;
}

/**
 * Custom hook for managing audio metadata
 * Handles fetching, updating, and caching metadata from the API
 */
export function useAudioMetadata(): UseAudioMetadataReturn {
  const [metadata, setMetadata] = useState<Map<string, AudioMetadata>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all metadata from API
   */
  const fetchMetadata = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/metadata');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }

      const data = await response.json();
      const metadataMap = new Map<string, AudioMetadata>();

      // Convert response object to Map
      Object.entries(data.metadata || {}).forEach(([filePath, meta]) => {
        metadataMap.set(filePath, meta as AudioMetadata);
      });

      setMetadata(metadataMap);
      setIsLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch metadata');
      setError(error);
      setIsLoading(false);
      console.error('Metadata fetch error:', error);
    }
  }, []);

  /**
   * Update rating for an audio file
   * @param filePath - File path of the audio file
   * @param rating - Rating value (0-3)
   */
  const updateRating = useCallback(async (filePath: string, rating: number) => {
    // Validate rating range
    if (rating < 0 || rating > 3) {
      throw new Error('Rating must be between 0 and 3');
    }

    const currentMeta = metadata.get(filePath);
    const previousMeta = currentMeta ? { ...currentMeta } : null;

    try {
      // Optimistic update - mutate the existing Map to avoid triggering re-renders
      const optimisticMeta: AudioMetadata = currentMeta
        ? { ...currentMeta, rating, updatedAt: new Date() }
        : {
            id: 0,
            filePath,
            rating,
            description: '',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

      // Mutate the map directly instead of creating a new one
      metadata.set(filePath, optimisticMeta);

      // Send update to API
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          rating,
          description: currentMeta?.description || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update rating: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update with server response (mutate to avoid re-render)
      metadata.set(filePath, data.metadata);
    } catch (err) {
      // Rollback on error
      if (previousMeta) {
        metadata.set(filePath, previousMeta);
      } else {
        metadata.delete(filePath);
      }

      const error = err instanceof Error ? err : new Error('Failed to update rating');
      console.error('Rating update error:', error);
      throw error;
    }
  }, [metadata]);

  /**
   * Update description for an audio file
   * @param filePath - File path of the audio file
   * @param description - Description text
   */
  const updateDescription = useCallback(async (filePath: string, description: string) => {
    const currentMeta = metadata.get(filePath);
    const previousMeta = currentMeta ? { ...currentMeta } : null;

    try {
      // Optimistic update - mutate the existing Map to avoid triggering re-renders
      const optimisticMeta: AudioMetadata = currentMeta
        ? { ...currentMeta, description, updatedAt: new Date() }
        : {
            id: 0,
            filePath,
            rating: 0,
            description,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

      // Mutate the map directly instead of creating a new one
      metadata.set(filePath, optimisticMeta);

      // Send update to API
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          rating: currentMeta?.rating || 0,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update description: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update with server response (mutate to avoid re-render)
      metadata.set(filePath, data.metadata);
    } catch (err) {
      // Rollback on error
      if (previousMeta) {
        metadata.set(filePath, previousMeta);
      } else {
        metadata.delete(filePath);
      }

      const error = err instanceof Error ? err : new Error('Failed to update description');
      console.error('Description update error:', error);
      throw error;
    }
  }, [metadata]);

  /**
   * Delete metadata for an audio file
   * @param filePath - File path of the audio file
   */
  const deleteMetadata = useCallback(async (filePath: string) => {
    const previousMeta = metadata.get(filePath);

    try {
      // Optimistic delete
      setMetadata(prev => {
        const newMap = new Map(prev);
        newMap.delete(filePath);
        return newMap;
      });

      // Send delete request to API
      const response = await fetch(`/api/metadata/${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete metadata: ${response.statusText}`);
      }
    } catch (err) {
      // Rollback on error
      if (previousMeta) {
        setMetadata(prev => new Map(prev).set(filePath, previousMeta));
      }

      const error = err instanceof Error ? err : new Error('Failed to delete metadata');
      console.error('Metadata delete error:', error);
      throw error;
    }
  }, [metadata]);

  /**
   * Get metadata for a specific file
   * @param filePath - File path of the audio file
   */
  const getMetadata = useCallback((filePath: string): AudioMetadata | undefined => {
    return metadata.get(filePath);
  }, [metadata]);

  /**
   * Refresh metadata from server
   */
  const refreshMetadata = useCallback(async () => {
    await fetchMetadata();
  }, [fetchMetadata]);

  /**
   * Load metadata on mount
   */
  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return {
    metadata,
    isLoading,
    error,
    updateRating,
    updateDescription,
    deleteMetadata,
    getMetadata,
    refreshMetadata,
  };
}
