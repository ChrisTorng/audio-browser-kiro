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
      console.log(`[useLazyVisualization] 📋 Load request for: ${filePath}`);
      
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
            console.log(`[useLazyVisualization] 📦 Using cached data (already loading): ${filePath}`);
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
        console.log(`[useLazyVisualization] 🚫 Cancelling previous task: ${currentTaskIdRef.current}`);
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
        console.log(`[useLazyVisualization] 📦 Using cached data: ${filePath}`);
        setWaveformData(cachedWaveform);
        setSpectrogramData(cachedSpectrogram);
        setIsLoading(false);
        setProgress(100);
        return;
      }

      console.log(`[useLazyVisualization] ➕ Adding task to queue: ${filePath} (priority: ${taskPriority})`);
      
      // Add task to queue
      const taskId = visualizationTaskQueue.addTask(
        filePath,
        audioUrl,
        priority,
        taskPriority
      );
      currentTaskIdRef.current = taskId;
      
      console.log(`[useLazyVisualization] ✅ Task added: ${taskId}`);
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
        console.log(`[useLazyVisualization] 📊 Progress update: ${task.filePath} - ${task.progress}%`);
        setProgress(task.progress);
      }
    });

    // Completion callback
    const unsubscribeComplete = visualizationTaskQueue.onComplete((task, result) => {
      if (task.id === currentTaskIdRef.current) {
        console.log(`[useLazyVisualization] ✅ Task completed: ${task.filePath}`, {
          waveformData: result.waveformData ? `${result.waveformData.length} points` : 'null',
          spectrogramData: result.spectrogramData ? `${result.spectrogramData.length}x${result.spectrogramData[0]?.length || 0}` : 'null'
        });
        
        if (result.waveformData) {
          setWaveformData(result.waveformData);
          console.log(`[useLazyVisualization] 🌊 Waveform data set for: ${task.filePath}`);
        } else {
          console.warn(`[useLazyVisualization] ⚠️ No waveform data received for: ${task.filePath}`);
        }
        
        if (result.spectrogramData) {
          setSpectrogramData(result.spectrogramData);
          console.log(`[useLazyVisualization] 📊 Spectrogram data set for: ${task.filePath}`);
        } else {
          console.warn(`[useLazyVisualization] ⚠️ No spectrogram data received for: ${task.filePath}`);
        }
        
        setIsLoading(false);
        setProgress(100);
        currentTaskIdRef.current = null;
        
        console.log(`[useLazyVisualization] 🎉 Display ready for: ${task.filePath}`);
      }
    });

    // Error callback
    const unsubscribeError = visualizationTaskQueue.onError((task, err) => {
      if (task.id === currentTaskIdRef.current) {
        console.error(`[useLazyVisualization] ❌ Task error: ${task.filePath}`, err);
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
