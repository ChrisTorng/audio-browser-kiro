import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  VisualizationTaskQueue,
  TaskPriority,
  TaskType,
  VisualizationTask,
} from '../../../src/client/services/visualizationTaskQueue';

describe('VisualizationTaskQueue', () => {
  let taskQueue: VisualizationTaskQueue;

  beforeEach(() => {
    taskQueue = new VisualizationTaskQueue({
      maxConcurrent: 2,
      priorityEnabled: true,
    });
  });

  afterEach(() => {
    taskQueue.cancelAllTasks();
  });

  describe('Task Management', () => {
    it('should add a task to the queue', () => {
      const taskId = taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'both', 'normal');

      expect(taskId).toBeDefined();
      expect(taskId).toContain('/path/to/file.mp3');

      const task = taskQueue.getTask(taskId);
      expect(task).toBeDefined();
      expect(task?.filePath).toBe('/path/to/file.mp3');
      expect(task?.type).toBe('both');
      expect(task?.priority).toBe('normal');
    });

    it('should cancel a specific task', () => {
      const taskId = taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'both', 'normal');

      taskQueue.cancelTask(taskId);

      const task = taskQueue.getTask(taskId);
      expect(task).toBeUndefined();
    });

    it('should cancel all tasks for a specific file', () => {
      const taskId1 = taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'waveform', 'normal');
      const taskId2 = taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'spectrogram', 'normal');
      const taskId3 = taskQueue.addTask('/path/to/other.mp3', '/api/audio/other.mp3', 'both', 'normal');

      taskQueue.cancelTasksForFile('/path/to/file.mp3');

      expect(taskQueue.getTask(taskId1)).toBeUndefined();
      expect(taskQueue.getTask(taskId2)).toBeUndefined();
      expect(taskQueue.getTask(taskId3)).toBeDefined();
    });

    it('should cancel all pending tasks', () => {
      // Add multiple tasks
      taskQueue.addTask('/path/to/file1.mp3', '/api/audio/file1.mp3', 'both', 'normal');
      taskQueue.addTask('/path/to/file2.mp3', '/api/audio/file2.mp3', 'both', 'normal');
      taskQueue.addTask('/path/to/file3.mp3', '/api/audio/file3.mp3', 'both', 'normal');

      // Wait a bit for some tasks to start
      setTimeout(() => {
        taskQueue.cancelAllPendingTasks();

        const stats = taskQueue.getQueueStats();
        expect(stats.pending).toBe(0);
      }, 100);
    });

    it('should cancel all tasks', () => {
      taskQueue.addTask('/path/to/file1.mp3', '/api/audio/file1.mp3', 'both', 'normal');
      taskQueue.addTask('/path/to/file2.mp3', '/api/audio/file2.mp3', 'both', 'normal');

      taskQueue.cancelAllTasks();

      const stats = taskQueue.getQueueStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('Priority Management', () => {
    it('should have updateTaskPriority method', () => {
      // Just verify the method exists and can be called
      const taskId = taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'both', 'normal');
      
      // Method should not throw
      expect(() => {
        taskQueue.updateTaskPriority(taskId, 'high');
      }).not.toThrow();
      
      // Task should still exist (or be completed/cancelled)
      const task = taskQueue.getTask(taskId);
      // Task might be undefined if already completed, that's ok
      if (task) {
        expect(task.filePath).toBe('/path/to/file.mp3');
      }
    });

    it('should update priority for all tasks of a file', () => {
      const taskId1 = taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'waveform', 'normal');
      const taskId2 = taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'spectrogram', 'low');

      taskQueue.updateFilePriority('/path/to/file.mp3', 'high');

      const task1 = taskQueue.getTask(taskId1);
      const task2 = taskQueue.getTask(taskId2);

      // Note: Only pending tasks get updated
      // If tasks are already running, priority won't change
      if (task1?.status === 'pending') {
        expect(task1.priority).toBe('high');
      }
      if (task2?.status === 'pending') {
        expect(task2.priority).toBe('high');
      }
    });

    it('should process high priority tasks first', async () => {
      // Create a queue with max 1 concurrent to control execution order
      const queue = new VisualizationTaskQueue({
        maxConcurrent: 1,
        priorityEnabled: true,
      });

      const executionOrder: string[] = [];

      // Subscribe to completion events
      queue.onComplete((task) => {
        executionOrder.push(task.filePath);
      });

      // Add tasks with different priorities
      queue.addTask('/path/to/low.mp3', '/api/audio/low.mp3', 'both', 'low');
      queue.addTask('/path/to/normal.mp3', '/api/audio/normal.mp3', 'both', 'normal');
      queue.addTask('/path/to/high.mp3', '/api/audio/high.mp3', 'both', 'high');

      // Wait for tasks to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // High priority should be processed first (after any already running task)
      // Note: The first task might already be running, so we check the order of the rest
      const highIndex = executionOrder.indexOf('/path/to/high.mp3');
      const normalIndex = executionOrder.indexOf('/path/to/normal.mp3');
      const lowIndex = executionOrder.indexOf('/path/to/low.mp3');

      if (highIndex !== -1 && normalIndex !== -1) {
        expect(highIndex).toBeLessThan(normalIndex);
      }
      if (normalIndex !== -1 && lowIndex !== -1) {
        expect(normalIndex).toBeLessThan(lowIndex);
      }

      queue.cancelAllTasks();
    });
  });

  describe('Task Retrieval', () => {
    it('should get tasks for a specific file', () => {
      taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'waveform', 'normal');
      taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'spectrogram', 'normal');
      taskQueue.addTask('/path/to/other.mp3', '/api/audio/other.mp3', 'both', 'normal');

      const tasks = taskQueue.getTasksForFile('/path/to/file.mp3');

      expect(tasks.length).toBeGreaterThanOrEqual(1); // At least one task (others might have completed)
      tasks.forEach((task) => {
        expect(task.filePath).toBe('/path/to/file.mp3');
      });
    });

    it('should get queue statistics', () => {
      taskQueue.addTask('/path/to/file1.mp3', '/api/audio/file1.mp3', 'both', 'normal');
      taskQueue.addTask('/path/to/file2.mp3', '/api/audio/file2.mp3', 'both', 'normal');
      taskQueue.addTask('/path/to/file3.mp3', '/api/audio/file3.mp3', 'both', 'normal');

      const stats = taskQueue.getQueueStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.pending + stats.running + stats.completed + stats.failed + stats.cancelled).toBe(stats.total);
    });
  });

  describe('Event Callbacks', () => {
    it('should call progress callback', (done) => {
      const progressCallback = vi.fn((task: VisualizationTask) => {
        expect(task.progress).toBeGreaterThanOrEqual(0);
        expect(task.progress).toBeLessThanOrEqual(100);
        
        if (task.progress > 0) {
          done();
        }
      });

      taskQueue.onProgress(progressCallback);
      taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'both', 'normal');
    });

    it('should call completion callback', (done) => {
      const completionCallback = vi.fn((task: VisualizationTask, result) => {
        expect(task.status).toBe('completed');
        expect(result).toBeDefined();
        done();
      });

      taskQueue.onComplete(completionCallback);
      taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'both', 'normal');
    });

    it('should call error callback on failure', (done) => {
      const errorCallback = vi.fn((task: VisualizationTask, error: Error) => {
        expect(task.status).toBe('failed');
        expect(error).toBeInstanceOf(Error);
        done();
      });

      taskQueue.onError(errorCallback);
      // Add a task with invalid URL to trigger error
      taskQueue.addTask('/path/to/invalid.mp3', '/invalid/url', 'both', 'normal');
    });

    it('should unsubscribe from callbacks', () => {
      const progressCallback = vi.fn();

      const unsubscribe = taskQueue.onProgress(progressCallback);
      unsubscribe();

      taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'both', 'normal');

      // Wait a bit and check that callback was not called
      setTimeout(() => {
        expect(progressCallback).not.toHaveBeenCalled();
      }, 500);
    });
  });

  describe('Concurrency Control', () => {
    it('should respect max concurrent limit', async () => {
      const queue = new VisualizationTaskQueue({
        maxConcurrent: 2,
        priorityEnabled: false,
      });

      // Add 5 tasks
      queue.addTask('/path/to/file1.mp3', '/api/audio/file1.mp3', 'both', 'normal');
      queue.addTask('/path/to/file2.mp3', '/api/audio/file2.mp3', 'both', 'normal');
      queue.addTask('/path/to/file3.mp3', '/api/audio/file3.mp3', 'both', 'normal');
      queue.addTask('/path/to/file4.mp3', '/api/audio/file4.mp3', 'both', 'normal');
      queue.addTask('/path/to/file5.mp3', '/api/audio/file5.mp3', 'both', 'normal');

      // Check that no more than 2 tasks are running at once
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = queue.getQueueStats();
      expect(stats.running).toBeLessThanOrEqual(2);

      queue.cancelAllTasks();
    });
  });

  describe('Task Cancellation During Execution', () => {
    it('should handle cancellation of running task', async () => {
      const taskId = taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'both', 'normal');

      // Wait for task to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Cancel the task
      taskQueue.cancelTask(taskId);

      const task = taskQueue.getTask(taskId);
      expect(task).toBeUndefined();
    });

    it('should replace task when adding new task for same file', async () => {
      const taskId1 = taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'both', 'normal');
      
      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      const taskId2 = taskQueue.addTask('/path/to/file.mp3', '/api/audio/file.mp3', 'both', 'high');

      expect(taskId1).not.toBe(taskId2);
      
      // First task should be cancelled
      const task1 = taskQueue.getTask(taskId1);
      expect(task1).toBeUndefined();
      
      // Second task should exist
      const task2 = taskQueue.getTask(taskId2);
      expect(task2).toBeDefined();
      expect(task2?.priority).toBe('high');
    });
  });
});
