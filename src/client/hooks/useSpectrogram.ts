/**
 * useSpectrogram Hook
 * Fetches spectrogram image from server API
 */
import { useState, useEffect, useRef } from 'react';
import { audioBrowserAPI } from '../services/api';

export interface UseSpectrogramResult {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook for fetching spectrogram image from server
 * @param filePath - Audio file path
 * @returns Spectrogram image URL, loading state, and error
 */
export function useSpectrogram(filePath: string | null): UseSpectrogramResult {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset state when filePath changes
    if (!filePath) {
      setImageUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Revoke previous object URL
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Fetch spectrogram
    const fetchSpectrogram = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const blob = await audioBrowserAPI.getSpectrogram(filePath);

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        // Create object URL from blob
        const url = URL.createObjectURL(blob);
        imageUrlRef.current = url;
        setImageUrl(url);
        setIsLoading(false);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err : new Error('Failed to load spectrogram'));
          setIsLoading(false);
        }
      }
    };

    fetchSpectrogram();

    // Cleanup function
    return () => {
      abortController.abort();
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
    };
  }, [filePath]);

  return {
    imageUrl,
    isLoading,
    error,
  };
}
