import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AudioBrowser } from '../../../src/client/components/AudioBrowser';
import { audioBrowserAPI } from '../../../src/client/services/api';
import { ToastProvider } from '../../../src/client/contexts/ToastContext';

// Mock the API
vi.mock('../../../src/client/services/api', () => ({
  audioBrowserAPI: {
    getTree: vi.fn(),
    getMetadata: vi.fn(),
    updateMetadata: vi.fn(),
  },
}));

// Mock audio player
vi.mock('../../../src/client/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    toggle: vi.fn(),
    seek: vi.fn(),
    isPlaying: false,
    progress: 0,
    duration: 0,
    currentTime: 0,
  }),
}));

describe('AudioBrowser - Initialization with Real API Data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle API response with empty files arrays', async () => {
    // This is the actual structure from /api/tree
    const mockTree = {
      name: 'music-player',
      path: '.',
      files: [],
      subdirectories: [
        {
          name: 'Liszt-Liebesträume-No.3',
          path: 'Liszt-Liebesträume-No.3',
          files: [],
          subdirectories: [
            {
              name: 'church',
              path: 'Liszt-Liebesträume-No.3/church',
              files: [],
              subdirectories: [
                {
                  name: 'audio',
                  path: 'Liszt-Liebesträume-No.3/church/audio',
                  files: [],
                  subdirectories: [
                    {
                      name: 'demucs4',
                      path: 'Liszt-Liebesträume-No.3/church/audio/demucs4',
                      files: [
                        {
                          name: 'Bass.mp3',
                          path: 'Liszt-Liebesträume-No.3/church/audio/demucs4/Bass.mp3',
                          size: 5768926,
                        },
                      ],
                      subdirectories: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'test',
          path: 'test',
          files: [],
          subdirectories: [
            {
              name: 'test',
              path: 'test/test',
              files: [],
              subdirectories: [],
            },
          ],
        },
      ],
    };

    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);
    vi.mocked(audioBrowserAPI.getMetadata).mockResolvedValue([]);

    const { container } = render(
      <ToastProvider>
        <AudioBrowser />
      </ToastProvider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading audio directory...')).not.toBeInTheDocument();
    });

    // Should render the tree without errors
    expect(container.querySelector('.audio-tree')).toBeInTheDocument();
    
    // Should show the root directory
    await waitFor(() => {
      expect(screen.getByText('music-player')).toBeInTheDocument();
    });
  });

  it('should handle completely empty tree', async () => {
    const mockTree = {
      name: 'empty',
      path: '.',
      files: [],
      subdirectories: [],
    };

    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);
    vi.mocked(audioBrowserAPI.getMetadata).mockResolvedValue([]);

    render(
      <ToastProvider>
        <AudioBrowser />
      </ToastProvider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading audio directory...')).not.toBeInTheDocument();
    });

    // Should show the root directory even if empty
    await waitFor(() => {
      expect(screen.getByText('empty')).toBeInTheDocument();
    });
  });

  it('should handle null or undefined tree gracefully', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockRejectedValue(new Error('Failed to load'));
    vi.mocked(audioBrowserAPI.getMetadata).mockResolvedValue([]);

    render(
      <ToastProvider>
        <AudioBrowser />
      </ToastProvider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading audio directory...')).not.toBeInTheDocument();
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to load audio directory/)).toBeInTheDocument();
    });
  });
});
