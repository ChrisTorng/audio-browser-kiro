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
    // Check if there's already a pending or running task for this file
    const existingTask = this.findTaskForFile(filePath);
    
    if (existingTask) {
      // If task is already running or pending, just update priority if higher
      if (existingTask.status === 'pending' || existingTask.status === 'running') {
        const priorityOrder: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };
        if (priorityOrder[priority] < priorityOrder[existingTask.priority]) {
          console.log(`[TaskQueue] ⬆️ Upgrading priority for existing task: ${filePath} (${existingTask.priority} -> ${priority})`);
          existingTask.priority = priority;
        } else {
          console.log(`[TaskQueue] ♻️ Reusing existing task: ${filePath} (Status: ${existingTask.status}, Priority: ${existingTask.priority})`);
        }
        return existingTask.id;
      }
    }

    // Generate unique task ID
    const taskId = `${filePath}-${type}-${Date.now()}`;
    
    console.log(`[TaskQueue] ➕ Adding new task: ${filePath} (Priority: ${priority}, Type: ${type})`);

    // Cancel existing completed/failed/cancelled tasks for the same file
    // (but not pending/running tasks, they were already checked above)
    const tasksToCancel: string[] = [];
    this.tasks.forEach((task) => {
      if (task.filePath === filePath && 
          task.status !== 'pending' && 
          task.status !== 'running') {
        tasksToCancel.push(task.id);
      }
    });
    tasksToCancel.forEach((id) => this.cancelTask(id));

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

    // Abort the task silently
    task.abortController.abort();
    task.status = 'cancelled';
    task.completedAt = Date.now();

    // Remove from running tasks
    this.runningTasks.delete(taskId);

    // Remove from queue immediately (no delay needed for cancelled tasks)
    this.tasks.delete(taskId);

    // Process next tasks only if this was a running task
    if (this.runningTasks.size < this.maxConcurrent) {
      this.processQueue();
    }
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
   * Find active task (pending or running) for a specific file
   * @param filePath - File path
   * @returns Active task or undefined
   */
  private findTaskForFile(filePath: string): VisualizationTask | undefined {
    for (const task of this.tasks.values()) {
      if (task.filePath === filePath && 
          (task.status === 'pending' || task.status === 'running')) {
        return task;
      }
    }
    return undefined;
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
        throw new Error('Task cancelled');
      }

      // Update progress
      task.progress = 10;
      this.notifyProgress(task);

      // Check memory cache first
      let cachedWaveform = visualizationCache.getWaveform(task.filePath, 200);
      let cachedSpectrogram = visualizationCache.getSpectrogram(task.filePath, 200, 32);

      // If not in memory cache, try loading from IndexedDB persistence
      if (!cachedWaveform || !cachedSpectrogram) {
        // Initialize persistence if needed
        await visualizationCache.initializePersistence();
        
        if (!cachedWaveform) {
          cachedWaveform = await visualizationCache.loadWaveformFromPersistence(task.filePath, 200);
        }
        if (!cachedSpectrogram) {
          cachedSpectrogram = await visualizationCache.loadSpectrogramFromPersistence(task.filePath, 200, 32);
        }
      }

      let waveformData: number[] | undefined;
      let spectrogramData: number[][] | undefined;

      // If both are cached, use them
      if (cachedWaveform && cachedSpectrogram && task.type === 'both') {
        waveformData = cachedWaveform;
        spectrogramData = cachedSpectrogram;
        task.progress = 100;
        this.notifyProgress(task);
      } else {
        // Fetch audio if not cached
        let audioBuffer = visualizationCache.getAudioBuffer(task.filePath);

        if (!audioBuffer) {
          task.progress = 20;
          this.notifyProgress(task);

          console.log(`[TaskQueue] 📥 Downloading audio: ${task.filePath}`);
          const response = await fetch(task.audioUrl, {
            signal: task.abortController.signal,
            cache: 'force-cache',
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          console.log(`[TaskQueue] ✅ Audio download completed: ${task.filePath}`);

          task.progress = 40;
          this.notifyProgress(task);

          console.log(`[TaskQueue] 🔊 Decoding audio: ${task.filePath}`);
          const audioContext = new AudioContext();
          audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          visualizationCache.setAudioBuffer(task.filePath, audioBuffer);
          await audioContext.close();
        }

        task.progress = 50;
        this.notifyProgress(task);

        // Generate visualizations based on task type
        if (task.type === 'waveform' || task.type === 'both') {
          if (!cachedWaveform) {
            console.log(`[TaskQueue] 📊 Generating waveform: ${task.filePath}`);
            waveformData = await waveformGenerator.generateFromAudioBufferAsync(audioBuffer, 200);
            visualizationCache.setWaveform(task.filePath, 200, waveformData);
            console.log(`[TaskQueue] ✅ Waveform generation completed: ${task.filePath}`);
          } else {
            waveformData = cachedWaveform;
          }
          task.progress = task.type === 'waveform' ? 100 : 75;
          this.notifyProgress(task);
        }

        if (task.type === 'spectrogram' || task.type === 'both') {
          if (!cachedSpectrogram) {
            console.log(`[TaskQueue] 🎵 Generating spectrogram: ${task.filePath} (Task ID: ${task.id.slice(-13)})`);
            spectrogramData = await spectrogramGenerator.generateFromAudioBuffer(
              audioBuffer,
              200,
              32
            );
            visualizationCache.setSpectrogram(task.filePath, 200, 32, spectrogramData);
            console.log(`[TaskQueue] ✅ Spectrogram generation completed: ${task.filePath} (Task ID: ${task.id.slice(-13)})`);
          } else {
            spectrogramData = cachedSpectrogram;
          }
          task.progress = 100;
          this.notifyProgress(task);
        }
      }

      // Verify data before completion (silently)

      // Mark as completed
      task.status = 'completed';
      task.completedAt = Date.now();
      this.runningTasks.delete(task.id);

      // Notify completion
      this.notifyCompletion(task, { waveformData, spectrogramData });

      // Clean up completed task after a delay
      setTimeout(() => {
        this.tasks.delete(task.id);
      }, 5000);
    } catch (error) {
      // Handle error
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't treat cancellation as error - it's a normal queue management behavior
      if (err.message.includes('cancelled') || err.message.includes('aborted')) {
        task.status = 'cancelled';
        // Silently handle cancellation - no error logging needed
      } else {
        // Only log actual errors, not cancellations
        console.error(`[TaskQueue] ❌ Task error for ${task.filePath}:`, err.message);
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
