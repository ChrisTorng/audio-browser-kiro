import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Visible range information
 */
export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  overscanStartIndex: number;
  overscanEndIndex: number;
}

/**
 * Virtual scroll optimization hook return type
 */
export interface UseVirtualScrollOptimizationReturn {
  visibleRange: VisibleRange;
  isItemVisible: (index: number) => boolean;
  isItemInOverscan: (index: number) => boolean;
  updateScrollPosition: (scrollTop: number) => void;
  updateVisibleRange: (visibleRows: { startIndex: number; stopIndex: number }, allRows: { startIndex: number; stopIndex: number }) => void;
}

/**
 * Options for virtual scroll optimization
 */
export interface VirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscanCount?: number;
}

/**
 * Custom hook for optimizing virtual scroll performance
 * Tracks visible items and provides overscan for smooth scrolling
 */
export function useVirtualScrollOptimization(
  options: VirtualScrollOptions
): UseVirtualScrollOptimizationReturn {
  const { itemCount, itemHeight, containerHeight, overscanCount = 5 } = options;

  const [visibleRange, setVisibleRange] = useState<VisibleRange>({
    startIndex: 0,
    endIndex: 0,
    overscanStartIndex: 0,
    overscanEndIndex: 0,
  });

  const scrollTopRef = useRef(0);

  /**
   * Calculate visible range based on scroll position
   */
  const calculateVisibleRange = useCallback(
    (scrollTop: number): VisibleRange => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        itemCount - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight)
      );

      const overscanStartIndex = Math.max(0, startIndex - overscanCount);
      const overscanEndIndex = Math.min(itemCount - 1, endIndex + overscanCount);

      return {
        startIndex,
        endIndex,
        overscanStartIndex,
        overscanEndIndex,
      };
    },
    [itemCount, itemHeight, containerHeight, overscanCount]
  );

  /**
   * Update scroll position and recalculate visible range
   * Only update if the range actually changed to prevent unnecessary re-renders
   */
  const updateScrollPosition = useCallback(
    (scrollTop: number) => {
      scrollTopRef.current = scrollTop;
      const newRange = calculateVisibleRange(scrollTop);
      
      // Only update state if the range actually changed
      setVisibleRange((prevRange) => {
        if (
          prevRange.startIndex === newRange.startIndex &&
          prevRange.endIndex === newRange.endIndex &&
          prevRange.overscanStartIndex === newRange.overscanStartIndex &&
          prevRange.overscanEndIndex === newRange.overscanEndIndex
        ) {
          return prevRange;
        }
        return newRange;
      });
    },
    [calculateVisibleRange]
  );

  /**
   * Check if item is in visible range
   */
  const isItemVisible = useCallback(
    (index: number): boolean => {
      return index >= visibleRange.startIndex && index <= visibleRange.endIndex;
    },
    [visibleRange]
  );

  /**
   * Check if item is in overscan range
   */
  const isItemInOverscan = useCallback(
    (index: number): boolean => {
      return (
        index >= visibleRange.overscanStartIndex && index <= visibleRange.overscanEndIndex
      );
    },
    [visibleRange]
  );

  /**
   * Update visible range directly from react-window's onRowsRendered callback
   * This is more accurate than calculating from scroll position
   */
  const updateVisibleRange = useCallback(
    (visibleRows: { startIndex: number; stopIndex: number }, allRows: { startIndex: number; stopIndex: number }) => {
      const newRange: VisibleRange = {
        startIndex: visibleRows.startIndex,
        endIndex: visibleRows.stopIndex,
        overscanStartIndex: allRows.startIndex,
        overscanEndIndex: allRows.stopIndex,
      };
      
      // Only update state if the range actually changed
      setVisibleRange((prevRange) => {
        if (
          prevRange.startIndex === newRange.startIndex &&
          prevRange.endIndex === newRange.endIndex &&
          prevRange.overscanStartIndex === newRange.overscanStartIndex &&
          prevRange.overscanEndIndex === newRange.overscanEndIndex
        ) {
          return prevRange;
        }
        return newRange;
      });
    },
    []
  );

  /**
   * Initialize visible range on mount or when options change
   */
  useEffect(() => {
    const initialRange = calculateVisibleRange(scrollTopRef.current);
    setVisibleRange(initialRange);
  }, [calculateVisibleRange]);

  return {
    visibleRange,
    isItemVisible,
    isItemInOverscan,
    updateScrollPosition,
    updateVisibleRange,
  };
}

/**
 * Hook for preloading items in visible range
 * Useful for lazy loading visualizations
 */
export interface UsePreloadVisibleItemsOptions<T> {
  items: T[];
  visibleRange: VisibleRange;
  preloadFn: (item: T, index: number) => Promise<void>;
  enabled?: boolean;
}

export function usePreloadVisibleItems<T>(
  options: UsePreloadVisibleItemsOptions<T>
): void {
  const { items, visibleRange, preloadFn, enabled = true } = options;

  const preloadedIndicesRef = useRef<Set<number>>(new Set());
  const preloadQueueRef = useRef<Set<number>>(new Set());
  const isPreloadingRef = useRef(false);

  /**
   * Process preload queue
   */
  const processPreloadQueue = useCallback(async () => {
    if (isPreloadingRef.current || preloadQueueRef.current.size === 0) {
      return;
    }

    isPreloadingRef.current = true;

    // Get next item from queue
    const indices = Array.from(preloadQueueRef.current);
    const index = indices[0];
    preloadQueueRef.current.delete(index);

    try {
      const item = items[index];
      if (item) {
        await preloadFn(item, index);
        preloadedIndicesRef.current.add(index);
      }
    } catch (error) {
      console.error(`Failed to preload item at index ${index}:`, error);
    } finally {
      isPreloadingRef.current = false;
      
      // Process next item in queue
      if (preloadQueueRef.current.size > 0) {
        processPreloadQueue();
      }
    }
  }, [items, preloadFn]);

  /**
   * Update preload queue based on visible range
   */
  useEffect(() => {
    if (!enabled) return;

    const { overscanStartIndex, overscanEndIndex } = visibleRange;

    // Add visible items to preload queue if not already preloaded
    for (let i = overscanStartIndex; i <= overscanEndIndex; i++) {
      if (!preloadedIndicesRef.current.has(i) && !preloadQueueRef.current.has(i)) {
        preloadQueueRef.current.add(i);
      }
    }

    // Start processing queue
    processPreloadQueue();
  }, [visibleRange, enabled, processPreloadQueue]);

  /**
   * Clear preload queue on unmount
   */
  useEffect(() => {
    return () => {
      preloadQueueRef.current.clear();
    };
  }, []);
}
