import { useState, useCallback, useEffect, useRef } from 'react';
import { visualizationCache } from '../utils/visualizationCache';
import { visualizationTaskQueue, TaskPriority } from '../services/visualizationTaskQueue';

/**
 * Lazy visualization hook return type
 */
export interface UseLazyVisualizationReturn {
  waveformData: number[] | null;
  spectrogramData: number[][] | null;
  isLoading: boolean;
  error: Error | null;
  progress: number; // 0-100
  loadVisualization: (filePath: string, audioUrl: string, priority?: TaskPriority) => void;
  clearVisualization: () => void;
}

/**
 * Options for lazy visualization
 */
export interface LazyVisualizationOptions {
  waveformWidth?: number;
  spectrogramWidth?: number;
  spectrogramHeight?: number;
  autoLoad?: boolean;
  priority?: 'waveform' | 'spectrogram' | 'both';
}

/**
 * Custom hook for lazy loading and on-demand generation of visualizations
 * Uses centralized task queue for optimized background processing
 */
export function useLazyVisualization(
  options: LazyVisualizationOptions = {}
): UseLazyVisualizationReturn {
  const {
    waveformWidth = 200,
    spectrogramWidth = 200,
    spectrogramHeight = 40,
    priority = 'both',
  } = options;

  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [spectrogramData, setSpectrogramData] = useState<number[][] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Track current file path and task ID
  const currentFilePathRef = useRef<string | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  /**
   * Load visualization data for a file using task queue
   * Checks cache first, then adds task to queue if needed
   */
  const loadVisualization = useCallback(
    (filePath: string, audioUrl: string, taskPriority: TaskPriority = 'normal') => {
      // Skip if already loading this file
      if (currentFilePathRef.current === filePath) {
        // Check if we already have the data
        const cachedWaveform = visualizationCache.getWaveform(filePath, waveformWidth);
        const cachedSpectrogram = visualizationCache.getSpectrogram(
          filePath,
          spectrogramWidth,
          spectrogramHeight
        );
        
        if (cachedWaveform && cachedSpectrogram) {
          // Update state with cached data if not already set
          if (!waveformData || !spectrogramData) {
            setWaveformData(cachedWaveform);
            setSpectrogramData(cachedSpectrogram);
            setIsLoading(false);
            setProgress(100);
          }
          return;
        }
      }

      // Cancel previous task if any
      if (currentTaskIdRef.current) {
        visualizationTaskQueue.cancelTask(currentTaskIdRef.current);
      }

      currentFilePathRef.current = filePath;
      setIsLoading(true);
      setError(null);
      setProgress(0);

      // Check cache first
      const cachedWaveform = visualizationCache.getWaveform(filePath, waveformWidth);
      const cachedSpectrogram = visualizationCache.getSpectrogram(
        filePath,
        spectrogramWidth,
        spectrogramHeight
      );

      // If both are cached, use them immediately
      if (cachedWaveform && cachedSpectrogram) {
        setWaveformData(cachedWaveform);
        setSpectrogramData(cachedSpectrogram);
        setIsLoading(false);
        setProgress(100);
        return;
      }

      // Add task to queue
      const taskId = visualizationTaskQueue.addTask(
        filePath,
        audioUrl,
        priority,
        taskPriority
      );
      currentTaskIdRef.current = taskId;
    },
    [waveformWidth, spectrogramWidth, spectrogramHeight, priority, waveformData, spectrogramData]
  );

  /**
   * Clear current visualization data
   */
  const clearVisualization = useCallback(() => {
    // Cancel current task if any
    if (currentTaskIdRef.current) {
      visualizationTaskQueue.cancelTask(currentTaskIdRef.current);
      currentTaskIdRef.current = null;
    }

    currentFilePathRef.current = null;
    setWaveformData(null);
    setSpectrogramData(null);
    setError(null);
    setIsLoading(false);
    setProgress(0);
  }, []);

  // Subscribe to task queue events
  useEffect(() => {
    // Progress callback
    const unsubscribeProgress = visualizationTaskQueue.onProgress((task) => {
      if (task.id === currentTaskIdRef.current) {
        setProgress(task.progress);
      }
    });

    // Completion callback
    const unsubscribeComplete = visualizationTaskQueue.onComplete((task, result) => {
      if (task.id === currentTaskIdRef.current) {
        if (result.waveformData) {
          setWaveformData(result.waveformData);
        }
        if (result.spectrogramData) {
          setSpectrogramData(result.spectrogramData);
        }
        setIsLoading(false);
        setProgress(100);
        currentTaskIdRef.current = null;
      }
    });

    // Error callback
    const unsubscribeError = visualizationTaskQueue.onError((task, err) => {
      if (task.id === currentTaskIdRef.current) {
        setError(err);
        setIsLoading(false);
        currentTaskIdRef.current = null;
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
      
      // Cancel current task
      if (currentTaskIdRef.current) {
        visualizationTaskQueue.cancelTask(currentTaskIdRef.current);
      }
    };
  }, []);

  return {
    waveformData,
    spectrogramData,
    isLoading,
    error,
    progress,
    loadVisualization,
    clearVisualization,
  };
}
