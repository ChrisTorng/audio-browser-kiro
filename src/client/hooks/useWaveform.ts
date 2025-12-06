/**
 * useWaveform Hook
 * Fetches waveform image from server API
 */
import { useState, useEffect, useRef } from 'react';
import { audioBrowserAPI } from '../services/api';

export interface UseWaveformResult {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

// Global cache for waveform URLs to avoid re-fetching and flickering
const waveformUrlCache = new Map<string, string>();

/**
 * Custom hook for fetching waveform image from server
 * @param filePath - Audio file path
 * @returns Waveform image URL, loading state, and error
 */
export function useWaveform(filePath: string | null): UseWaveformResult {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Don't reset state when filePath becomes null - keep showing last image
    if (!filePath) {
      return;
    }

    // Check cache first
    const cachedUrl = waveformUrlCache.get(filePath);
    if (cachedUrl) {
      setImageUrl(cachedUrl);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Fetch waveform
    const fetchWaveform = async () => {
      try {
        setError(null);
        setIsLoading(true);

        const blob = await audioBrowserAPI.getWaveform(filePath);

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        // Create object URL from blob
        const url = URL.createObjectURL(blob);
        // Store in cache
        waveformUrlCache.set(filePath, url);
        setImageUrl(url);
        setIsLoading(false);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err : new Error('Failed to load waveform'));
          setIsLoading(false);
        }
      }
    };

    fetchWaveform();

    // Cleanup function
    return () => {
      abortController.abort();
      // Don't revoke URLs - keep them in cache to avoid flickering
    };
  }, [filePath]);

  return {
    imageUrl,
    isLoading,
    error,
  };
}
