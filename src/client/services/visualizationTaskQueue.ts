/**
 * VisualizationTaskQueue - Centralized task queue for visualization generation
 * Manages background tasks with priority mechanism and prevents interference
 */

export type TaskPriority = 'high' | 'normal' | 'low';
export type TaskType = 'waveform' | 'spectrogram' | 'both';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Visualization task definition
 */
export interface VisualizationTask {
  id: string;
  filePath: string;
  audioUrl: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number; // 0-100
  error: Error | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  abortController: AbortController;
}

/**
 * Task queue options
 */
export interface TaskQueueOptions {
  maxConcurrent?: number; // Maximum concurrent tasks
  priorityEnabled?: boolean; // Enable priority-based scheduling
}

/**
 * Task progress callback
 */
export type TaskProgressCallback = (task: VisualizationTask) => void;

/**
 * Task completion callback
 */
export type TaskCompletionCallback = (task: VisualizationTask, result: {
  waveformData?: number[];
  spectrogramData?: number[][];
}) => void;

/**
 * Task error callback
 */
export type TaskErrorCallback = (task: VisualizationTask, error: Error) => void;

/**
 * Centralized visualization task queue manager
 * Handles task scheduling, priority, cancellation, and progress tracking
 */
export class VisualizationTaskQueue {
  private tasks: Map<string, VisualizationTask> = new Map();
  private runningTasks: Set<string> = new Set();
  private maxConcurrent: number;
  private priorityEnabled: boolean;
  
  // Callbacks
  private progressCallbacks: Set<TaskProgressCallback> = new Set();
  private completionCallbacks: Set<TaskCompletionCallback> = new Set();
  private errorCallbacks: Set<TaskErrorCallback> = new Set();

  constructor(options: TaskQueueOptions = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;
    this.priorityEnabled = options.priorityEnabled !== false;
  }

  /**
   * Add a task to the queue
   * @param filePath - File path for the audio file
   * @param audioUrl - URL to fetch the audio file
   * @param type - Type of visualization to generate
   * @param priority - Task priority (high, normal, low)
   * @returns Task ID
   */
  addTask(
    filePath: string,
    audioUrl: string,
    type: TaskType = 'both',
    priority: TaskPriority = 'normal'
  ): string {
    // Generate unique task ID
    const taskId = `${filePath}-${type}-${Date.now()}`;

    // Cancel existing task for the same file if any
    this.cancelTasksForFile(filePath);

    // Create new task
    const task: VisualizationTask = {
      id: taskId,
      filePath,
      audioUrl,
      type,
      priority,
      status: 'pending',
      progress: 0,
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      abortController: new AbortController(),
    };

    this.tasks.set(taskId, task);

    // Start processing queue
    this.processQueue();

    return taskId;
  }

  /**
   * Cancel a specific task
   * @param taskId - Task ID to cancel
   */
  cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Abort the task
    task.abortController.abort();
    task.status = 'cancelled';
    task.completedAt = Date.now();

    // Remove from running tasks
    this.runningTasks.delete(taskId);

    // Remove from queue
    this.tasks.delete(taskId);

    // Process next tasks
    this.processQueue();
  }

  /**
   * Cancel all tasks for a specific file
   * @param filePath - File path
   */
  cancelTasksForFile(filePath: string): void {
    const tasksToCancel: string[] = [];

    this.tasks.forEach((task) => {
      if (task.filePath === filePath) {
        tasksToCancel.push(task.id);
      }
    });

    tasksToCancel.forEach((taskId) => this.cancelTask(taskId));
  }

  /**
   * Cancel all pending tasks
   */
  cancelAllPendingTasks(): void {
    const tasksToCancel: string[] = [];

    this.tasks.forEach((task) => {
      if (task.status === 'pending') {
        tasksToCancel.push(task.id);
      }
    });

    tasksToCancel.forEach((taskId) => this.cancelTask(taskId));
  }

  /**
   * Cancel all tasks (including running)
   */
  cancelAllTasks(): void {
    const tasksToCancel = Array.from(this.tasks.keys());
    tasksToCancel.forEach((taskId) => this.cancelTask(taskId));
  }

  /**
   * Update task priority
   * @param taskId - Task ID
   * @param priority - New priority
   */
  updateTaskPriority(taskId: string, priority: TaskPriority): void {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return;

    task.priority = priority;

    // Re-process queue to respect new priority
    this.processQueue();
  }

  /**
   * Update priority for all tasks of a specific file
   * @param filePath - File path
   * @param priority - New priority
   */
  updateFilePriority(filePath: string, priority: TaskPriority): void {
    this.tasks.forEach((task) => {
      if (task.filePath === filePath && task.status === 'pending') {
        task.priority = priority;
      }
    });

    // Re-process queue to respect new priority
    this.processQueue();
  }

  /**
   * Get task by ID
   * @param taskId - Task ID
   * @returns Task or undefined
   */
  getTask(taskId: string): VisualizationTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks for a specific file
   * @param filePath - File path
   * @returns Array of tasks
   */
  getTasksForFile(filePath: string): VisualizationTask[] {
    const tasks: VisualizationTask[] = [];
    this.tasks.forEach((task) => {
      if (task.filePath === filePath) {
        tasks.push(task);
      }
    });
    return tasks;
  }

  /**
   * Get queue statistics
   * @returns Queue statistics
   */
  getQueueStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    let pending = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;
    let cancelled = 0;

    this.tasks.forEach((task) => {
      switch (task.status) {
        case 'pending':
          pending++;
          break;
        case 'running':
          running++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'cancelled':
          cancelled++;
          break;
      }
    });

    return {
      total: this.tasks.size,
      pending,
      running,
      completed,
      failed,
      cancelled,
    };
  }

  /**
   * Register progress callback
   * @param callback - Progress callback function
   */
  onProgress(callback: TaskProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Register completion callback
   * @param callback - Completion callback function
   */
  onComplete(callback: TaskCompletionCallback): () => void {
    this.completionCallbacks.add(callback);
    return () => this.completionCallbacks.delete(callback);
  }

  /**
   * Register error callback
   * @param callback - Error callback function
   */
  onError(callback: TaskErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Process the task queue
   * Starts pending tasks based on priority and concurrency limits
   */
  private processQueue(): void {
    // Check if we can start more tasks
    if (this.maxConcurrent === 0 || this.runningTasks.size >= this.maxConcurrent) {
      return;
    }

    // Get pending tasks
    const pendingTasks = Array.from(this.tasks.values()).filter(
      (task) => task.status === 'pending'
    );

    if (pendingTasks.length === 0) {
      return;
    }

    // Sort by priority if enabled
    if (this.priorityEnabled) {
      pendingTasks.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        
        // If same priority, sort by creation time (FIFO)
        if (priorityDiff === 0) {
          return a.createdAt - b.createdAt;
        }
        
        return priorityDiff;
      });
    } else {
      // FIFO order
      pendingTasks.sort((a, b) => a.createdAt - b.createdAt);
    }

    // Start tasks up to max concurrent limit
    const tasksToStart = pendingTasks.slice(0, this.maxConcurrent - this.runningTasks.size);
    tasksToStart.forEach((task) => this.startTask(task));
  }

  /**
   * Start executing a task
   * @param task - Task to start
   */
  private async startTask(task: VisualizationTask): Promise<void> {
    console.log(`[TaskQueue] 🚀 Starting task for: ${task.filePath}`);
    
    // Mark as running
    task.status = 'running';
    task.startedAt = Date.now();
    this.runningTasks.add(task.id);

    // Notify progress
    this.notifyProgress(task);

    try {
      // Import services dynamically to avoid circular dependencies
      const { waveformGenerator } = await import('./waveformGenerator');
      const { spectrogramGenerator } = await import('./spectrogramGenerator');
      const { visualizationCache } = await import('../utils/visualizationCache');

      // Check if task was cancelled
      if (task.abortController.signal.aborted) {
        console.log(`[TaskQueue] ❌ Task cancelled: ${task.filePath}`);
        throw new Error('Task cancelled');
      }

      // Update progress
      task.progress = 10;
      this.notifyProgress(task);

      // Check cache first
      const cachedWaveform = visualizationCache.getWaveform(task.filePath, 200);
      const cachedSpectrogram = visualizationCache.getSpectrogram(task.filePath, 200, 32);

      console.log(`[TaskQueue] 📦 Cache check for ${task.filePath}:`, {
        waveform: cachedWaveform ? 'cached' : 'not cached',
        spectrogram: cachedSpectrogram ? 'cached' : 'not cached'
      });

      let waveformData: number[] | undefined;
      let spectrogramData: number[][] | undefined;

      // If both are cached, use them
      if (cachedWaveform && cachedSpectrogram && task.type === 'both') {
        console.log(`[TaskQueue] ✅ Using cached data for: ${task.filePath}`);
        waveformData = cachedWaveform;
        spectrogramData = cachedSpectrogram;
        task.progress = 100;
        this.notifyProgress(task);
      } else {
        // Fetch audio if not cached
        let audioBuffer = visualizationCache.getAudioBuffer(task.filePath);

        if (!audioBuffer) {
          console.log(`[TaskQueue] 📥 Downloading audio: ${task.filePath}`);
          task.progress = 20;
          this.notifyProgress(task);

          const response = await fetch(task.audioUrl, {
            signal: task.abortController.signal,
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          console.log(`[TaskQueue] ✅ Download complete: ${task.filePath} (${arrayBuffer.byteLength} bytes)`);

          task.progress = 40;
          this.notifyProgress(task);

          console.log(`[TaskQueue] 🔊 Decoding audio: ${task.filePath}`);
          const audioContext = new AudioContext();
          audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          visualizationCache.setAudioBuffer(task.filePath, audioBuffer);
          await audioContext.close();
          console.log(`[TaskQueue] ✅ Audio decoded: ${task.filePath} (${audioBuffer.duration.toFixed(2)}s)`);
        } else {
          console.log(`[TaskQueue] 📦 Using cached audio buffer: ${task.filePath}`);
        }

        task.progress = 50;
        this.notifyProgress(task);

        // Generate visualizations based on task type
        if (task.type === 'waveform' || task.type === 'both') {
          if (!cachedWaveform) {
            console.log(`[TaskQueue] 🌊 Generating waveform: ${task.filePath}`);
            waveformData = await waveformGenerator.generateFromAudioBufferAsync(audioBuffer, 200);
            visualizationCache.setWaveform(task.filePath, 200, waveformData);
            console.log(`[TaskQueue] ✅ Waveform generated: ${task.filePath} (${waveformData.length} points)`);
          } else {
            waveformData = cachedWaveform;
            console.log(`[TaskQueue] 📦 Using cached waveform: ${task.filePath}`);
          }
          task.progress = task.type === 'waveform' ? 100 : 75;
          this.notifyProgress(task);
        }

        if (task.type === 'spectrogram' || task.type === 'both') {
          if (!cachedSpectrogram) {
            console.log(`[TaskQueue] 📊 Generating spectrogram: ${task.filePath}`);
            spectrogramData = await spectrogramGenerator.generateFromAudioBuffer(
              audioBuffer,
              200,
              32
            );
            visualizationCache.setSpectrogram(task.filePath, 200, 32, spectrogramData);
            console.log(`[TaskQueue] ✅ Spectrogram generated: ${task.filePath} (${spectrogramData.length}x${spectrogramData[0]?.length || 0})`);
          } else {
            spectrogramData = cachedSpectrogram;
            console.log(`[TaskQueue] 📦 Using cached spectrogram: ${task.filePath}`);
          }
          task.progress = 100;
          this.notifyProgress(task);
        }
      }

      // Verify data before completion
      if (!waveformData || !spectrogramData) {
        console.error(`[TaskQueue] ⚠️ Missing data for ${task.filePath}:`, {
          waveformData: waveformData ? `${waveformData.length} points` : 'null',
          spectrogramData: spectrogramData ? `${spectrogramData.length}x${spectrogramData[0]?.length || 0}` : 'null'
        });
      }

      // Mark as completed
      task.status = 'completed';
      task.completedAt = Date.now();
      this.runningTasks.delete(task.id);

      console.log(`[TaskQueue] ✅ Task completed: ${task.filePath} (${task.completedAt - task.startedAt!}ms)`);

      // Notify completion
      this.notifyCompletion(task, { waveformData, spectrogramData });

      // Clean up completed task after a delay
      setTimeout(() => {
        this.tasks.delete(task.id);
      }, 5000);
    } catch (error) {
      // Handle error
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      console.error(`[TaskQueue] ❌ Task error for ${task.filePath}:`, err.message);
      
      // Don't treat cancellation as error
      if (err.message.includes('cancelled') || err.message.includes('aborted')) {
        task.status = 'cancelled';
      } else {
        task.status = 'failed';
        task.error = err;
        this.notifyError(task, err);
      }

      task.completedAt = Date.now();
      this.runningTasks.delete(task.id);

      // Clean up failed task after a delay
      setTimeout(() => {
        this.tasks.delete(task.id);
      }, 10000);
    } finally {
      // Process next tasks in queue
      this.processQueue();
    }
  }

  /**
   * Notify progress callbacks
   * @param task - Task with updated progress
   */
  private notifyProgress(task: VisualizationTask): void {
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(task);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }

  /**
   * Notify completion callbacks
   * @param task - Completed task
   * @param result - Generation result
   */
  private notifyCompletion(
    task: VisualizationTask,
    result: { waveformData?: number[]; spectrogramData?: number[][] }
  ): void {
    console.log(`[TaskQueue] 📢 Notifying completion for: ${task.filePath}`, {
      waveformData: result.waveformData ? `${result.waveformData.length} points` : 'undefined',
      spectrogramData: result.spectrogramData ? `${result.spectrogramData.length}x${result.spectrogramData[0]?.length || 0}` : 'undefined',
      callbackCount: this.completionCallbacks.size
    });
    
    this.completionCallbacks.forEach((callback) => {
      try {
        callback(task, result);
      } catch (error) {
        console.error('Completion callback error:', error);
      }
    });
  }

  /**
   * Notify error callbacks
   * @param task - Failed task
   * @param error - Error that occurred
   */
  private notifyError(task: VisualizationTask, error: Error): void {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(task, error);
      } catch (error) {
        console.error('Error callback error:', error);
      }
    });
  }
}

// Export singleton instance
export const visualizationTaskQueue = new VisualizationTaskQueue({
  maxConcurrent: 3,
  priorityEnabled: true,
});
