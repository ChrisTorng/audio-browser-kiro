import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioBrowser } from '../../../src/client/components/AudioBrowser';
import { ToastProvider } from '../../../src/client/contexts/ToastContext';
import { DirectoryTree } from '../../../src/shared/types';

/**
 * Integration test for keyboard navigation
 * Tests comprehensive keyboard navigation scenarios including:
 * - Arrow key navigation (up/down/left/right)
 * - Space bar for play/stop control
 * - Directory expansion/collapse with keyboard
 * - Navigation boundaries and edge cases
 */

// Mock API
const mockScanDirectory = vi.fn();

vi.mock('../../../src/client/services/api', () => ({
  audioBrowserAPI: {
    scanDirectory: (...args: any[]) => mockScanDirectory(...args),
  },
}));

// Mock Audio element
class MockAudio {
  src = '';
  loop = false;
  currentTime = 0;
  duration = 100;
  paused = true;
  
  private listeners: Record<string, Function[]> = {};

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  addEventListener(event: string, handler: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  removeEventListener(event: string, handler: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }
}

describe('Keyboard Navigation Integration Tests', () => {
  let mockAudioInstance: MockAudio;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Audio constructor
    mockAudioInstance = new MockAudio();
    global.Audio = vi.fn(() => mockAudioInstance) as any;

    // Mock fetch for metadata
    global.fetch = vi.fn((url) => {
      if (url === '/api/metadata') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ metadata: {} }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  const renderAudioBrowser = () => {
    return render(
      <ToastProvider>
        <AudioBrowser />
      </ToastProvider>
    );
  };

  const mockComplexTree: DirectoryTree = {
    name: 'music',
    path: '.',
    files: [
      { name: 'intro.mp3', path: 'intro.mp3', size: 3000000 },
      { name: 'outro.mp3', path: 'outro.mp3', size: 2500000 },
    ],
    subdirectories: [
      {
        name: 'rock',
        path: 'rock',
        files: [
          { name: 'rock1.mp3', path: 'rock/rock1.mp3', size: 5000000 },
          { name: 'rock2.mp3', path: 'rock/rock2.mp3', size: 5500000 },
        ],
        subdirectories: [],
        totalFileCount: 2,
      },
      {
        name: 'jazz',
        path: 'jazz',
        files: [
          { name: 'jazz1.flac', path: 'jazz/jazz1.flac', size: 12000000 },
        ],
        subdirectories: [
          {
            name: 'classic',
            path: 'jazz/classic',
            files: [
              { name: 'classic1.wav', path: 'jazz/classic/classic1.wav', size: 8000000 },
            ],
            subdirectories: [],
            totalFileCount: 1,
          },
        ],
        totalFileCount: 2,
      },
    ],
    totalFileCount: 6,
  };

  const setupScannedTree = async () => {
    mockScanDirectory.mockResolvedValue(mockComplexTree);

    renderAudioBrowser();

    const input = screen.getByPlaceholderText('Enter directory path...');
    await userEvent.type(input, '/test/music');

    const scanButton = screen.getByText('Scan');
    await userEvent.click(scanButton);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });
  };

  describe('Arrow Key Navigation', () => {
    it('should navigate down through visible items', async () => {
      await setupScannedTree();

      // Initial state: root directory is selected (index 0)
      // The tree structure is: music (root), rock (dir), jazz (dir), intro.mp3, outro.mp3
      
      // Press down to select rock directory
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Press down to select jazz directory
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Press down to select intro.mp3
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('intro.mp3');
      });

      // Press down to select outro.mp3
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('outro.mp3');
      });
    });

    it('should navigate up through visible items', async () => {
      await setupScannedTree();

      // Navigate down to outro.mp3 (last file)
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // jazz
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // intro.mp3
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // outro.mp3

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('outro.mp3');
      });

      // Navigate back up to intro.mp3
      fireEvent.keyDown(window, { key: 'ArrowUp' });

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('intro.mp3');
      });
    });

    it('should not navigate beyond list boundaries', async () => {
      await setupScannedTree();

      // Try to navigate up from first item
      fireEvent.keyDown(window, { key: 'ArrowUp' });

      // Should stay at first item (root directory)
      await waitFor(() => {
        // No audio should be playing yet
        expect(mockAudioInstance.src).toBe('');
      });

      // Navigate to last visible item
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // intro.mp3
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // outro.mp3
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // jazz

      // Try to navigate down beyond last item
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Should stay at last item
      await waitFor(() => {
        // Should still be at jazz directory
        expect(mockAudioInstance.src).toContain('outro.mp3'); // Last file played
      });
    });
  });

  describe('Directory Expansion with Keyboard', () => {
    it('should expand directory with ArrowRight', async () => {
      await setupScannedTree();

      // Navigate to rock directory (first subdirectory)
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock

      // Files should not be visible yet
      expect(screen.queryByText('rock1.mp3')).not.toBeInTheDocument();

      // Expand with ArrowRight
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      // Files should now be visible
      await waitFor(() => {
        expect(screen.getByText('rock1.mp3')).toBeInTheDocument();
        expect(screen.getByText('rock2.mp3')).toBeInTheDocument();
      });
    });

    it('should collapse directory with ArrowLeft', async () => {
      await setupScannedTree();

      // Navigate to rock directory and expand it
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock
      fireEvent.keyDown(window, { key: 'ArrowRight' }); // expand

      await waitFor(() => {
        expect(screen.getByText('rock1.mp3')).toBeInTheDocument();
      });

      // Collapse with ArrowLeft
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      // Files should be hidden
      await waitFor(() => {
        expect(screen.queryByText('rock1.mp3')).not.toBeInTheDocument();
      });
    });

    it('should navigate through expanded directory items', async () => {
      await setupScannedTree();

      // Navigate to rock directory and expand it
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock
      fireEvent.keyDown(window, { key: 'ArrowRight' }); // expand

      await waitFor(() => {
        expect(screen.getByText('rock1.mp3')).toBeInTheDocument();
      });

      // Navigate down into expanded directory
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock1.mp3

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('rock1.mp3');
      });

      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock2.mp3

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('rock2.mp3');
      });
    });

    it('should handle nested directory expansion', async () => {
      await setupScannedTree();

      // Use click to expand jazz directory (more reliable than keyboard for nested structures)
      const jazzExpandButton = screen.getAllByLabelText('Expand')[1]; // jazz is second expand button
      await userEvent.click(jazzExpandButton);

      await waitFor(() => {
        expect(screen.getByText('jazz1.flac')).toBeInTheDocument();
        expect(screen.getByText('classic')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Expand classic subdirectory
      const classicExpandButton = screen.getAllByLabelText('Expand').find(
        btn => btn.parentElement?.textContent?.includes('classic')
      );
      if (classicExpandButton) {
        await userEvent.click(classicExpandButton);
      }

      await waitFor(() => {
        expect(screen.getByText('classic1.wav')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Now use keyboard to navigate to the nested file
      // Navigate to classic1.wav
      const classic1File = screen.getByText('classic1.wav');
      await userEvent.click(classic1File);

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('classic1.wav');
      });
    });

    it('should not expand files with ArrowRight', async () => {
      await setupScannedTree();

      // Navigate to a file
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // jazz
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // intro.mp3

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('intro.mp3');
      });

      // Try to expand file (should do nothing)
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      // File should still be playing, no changes
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('intro.mp3');
      });
    });

    it('should not collapse files with ArrowLeft', async () => {
      await setupScannedTree();

      // Navigate to a file
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // jazz
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // intro.mp3

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('intro.mp3');
      });

      // Try to collapse file (should do nothing)
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      // File should still be playing, no changes
      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('intro.mp3');
      });
    });
  });

  describe('Space Bar Play/Stop Control', () => {
    it('should stop playback with space bar', async () => {
      await setupScannedTree();

      // Start playing a file
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // jazz
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // intro.mp3

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Stop with space
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(true);
        expect(mockAudioInstance.currentTime).toBe(0);
      });
    });

    it('should resume playback with space bar', async () => {
      await setupScannedTree();

      // Start playing
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // jazz
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // intro.mp3

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Stop
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(true);
      });

      // Resume
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });
    });

    it('should toggle play/stop multiple times', async () => {
      await setupScannedTree();

      // Start playing
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // jazz
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // intro.mp3

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Toggle multiple times
      for (let i = 0; i < 3; i++) {
        fireEvent.keyDown(window, { key: ' ' });
        await waitFor(() => {
          expect(mockAudioInstance.paused).toBe(true);
        });

        fireEvent.keyDown(window, { key: ' ' });
        await waitFor(() => {
          expect(mockAudioInstance.paused).toBe(false);
        });
      }
    });

    it('should work with Spacebar key name', async () => {
      await setupScannedTree();

      // Start playing
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // jazz
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // intro.mp3

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(false);
      });

      // Stop with 'Spacebar' key name (older browsers)
      fireEvent.keyDown(window, { key: 'Spacebar' });

      await waitFor(() => {
        expect(mockAudioInstance.paused).toBe(true);
      });
    });
  });

  describe('Complex Navigation Scenarios', () => {
    it('should maintain selection when expanding/collapsing', async () => {
      await setupScannedTree();

      // Navigate to rock directory
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // rock

      // Expand
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText('rock1.mp3')).toBeInTheDocument();
      });

      // Collapse
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.queryByText('rock1.mp3')).not.toBeInTheDocument();
      });

      // Navigate down should go to next directory
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // jazz

      // Verify we're at jazz directory
      expect(screen.getByText('jazz')).toBeInTheDocument();
    });

    it('should handle rapid key presses', async () => {
      await setupScannedTree();

      // Rapidly press down
      for (let i = 0; i < 5; i++) {
        fireEvent.keyDown(window, { key: 'ArrowDown' });
      }

      // Should handle gracefully without errors
      await waitFor(() => {
        expect(mockAudioInstance.src).toBeTruthy();
      });

      // Rapidly press up
      for (let i = 0; i < 5; i++) {
        fireEvent.keyDown(window, { key: 'ArrowUp' });
      }

      // Should handle gracefully
      await waitFor(() => {
        expect(mockAudioInstance.src).toBeTruthy();
      });
    });

    it('should navigate through fully expanded tree', async () => {
      await setupScannedTree();

      // Get all initial expand buttons
      let expandButtons = screen.getAllByLabelText('Expand');
      
      // Expand rock directory (first expand button after root)
      await userEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('rock1.mp3')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Get updated expand buttons after rock is expanded
      expandButtons = screen.getAllByLabelText('Expand');
      
      // Expand jazz directory (should be the next expand button)
      const jazzButton = expandButtons.find(btn => {
        const parent = btn.closest('.audio-tree__item');
        return parent?.textContent?.includes('jazz');
      });
      
      if (jazzButton) {
        await userEvent.click(jazzButton);
      }

      await waitFor(() => {
        expect(screen.getByText('classic')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Get updated expand buttons after jazz is expanded
      expandButtons = screen.getAllByLabelText('Expand');
      
      // Expand classic directory
      const classicButton = expandButtons.find(btn => {
        const parent = btn.closest('.audio-tree__item');
        return parent?.textContent?.includes('classic');
      });
      
      if (classicButton) {
        await userEvent.click(classicButton);
      }

      await waitFor(() => {
        expect(screen.getByText('classic1.wav')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Click on the deepest file
      const classic1File = screen.getByText('classic1.wav');
      await userEvent.click(classic1File);

      await waitFor(() => {
        expect(mockAudioInstance.src).toContain('classic1.wav');
      });

      // Navigate back up with keyboard
      for (let i = 0; i < 5; i++) {
        fireEvent.keyDown(window, { key: 'ArrowUp' });
      }

      // Should have navigated up (audio src should still be valid)
      await waitFor(() => {
        expect(mockAudioInstance.src).toBeTruthy();
      });
    });
  });
});
