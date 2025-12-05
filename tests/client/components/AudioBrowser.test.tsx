import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioBrowser } from '../../../src/client/components/AudioBrowser';
import { audioBrowserAPI } from '../../../src/client/services/api';
import { ToastProvider } from '../../../src/client/contexts/ToastContext';
import { AudioMetadataProvider } from '../../../src/client/contexts/AudioMetadataContext';
import type { DirectoryTree } from '../../../src/shared/types';

// Mock the API
vi.mock('../../../src/client/services/api', () => ({
  audioBrowserAPI: {
    getTree: vi.fn(),
    getAllMetadata: vi.fn(),
  },
}));

// Helper function to render with required providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      <AudioMetadataProvider>
        {component}
      </AudioMetadataProvider>
    </ToastProvider>
  );
};

describe('AudioBrowser', () => {
  const mockTree: DirectoryTree = {
    name: 'music',
    path: '/music',
    files: [
      { name: 'song1.mp3', path: '/music/song1.mp3', size: 1024 },
      { name: 'song2.mp3', path: '/music/song2.mp3', size: 2048 },
    ],
    subdirectories: [
      {
        name: 'album1',
        path: '/music/album1',
        files: [
          { name: 'track1.mp3', path: '/music/album1/track1.mp3', size: 3072 },
        ],
        subdirectories: [],
        totalFileCount: 1,
      },
    ],
    totalFileCount: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders header with title and filter bar', () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);
    
    renderWithProviders(<AudioBrowser />);

    expect(screen.getByText('Audio Browser')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter by name or description...')).toBeInTheDocument();
  });

  it('loads directory tree on mount', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      expect(audioBrowserAPI.getTree).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });
    
    // Files are rendered in virtual scroll, check for directory structure
    expect(screen.getByText(/2 files/)).toBeInTheDocument();
  });

  it('displays loading state while fetching tree', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockTree), 100))
    );

    renderWithProviders(<AudioBrowser />);

    expect(screen.getByText('Loading audio directory...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });
  });

  it('displays error message when tree loading fails', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockRejectedValue(
      new Error('Failed to load directory')
    );

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText(/Load failed:.*Failed to load directory/)).toBeInTheDocument();
    });
  });

  it('filters items by text', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText('Filter by name or description...');
    fireEvent.change(filterInput, { target: { value: 'album1' } });

    // Wait for filter to apply (debounced - 300ms by default)
    await waitFor(() => {
      // Should show filtered results - album1 directory
      expect(screen.getByText('album1')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('filters with consecutive letters and expands root directory', async () => {
    // This test verifies the fix for the bug where filtering with consecutive letters
    // (like "as" to find "Bass.mp3") would not expand the root directory
    const treeWithNestedFiles: DirectoryTree = {
      name: 'music',
      path: '.',
      files: [],
      subdirectories: [
        {
          name: 'album',
          path: 'album',
          files: [
            { name: 'Bass.mp3', path: 'album/Bass.mp3', size: 1024 },
            { name: 'Drums.mp3', path: 'album/Drums.mp3', size: 2048 },
          ],
          subdirectories: [],
          totalFileCount: 2,
        },
      ],
      totalFileCount: 2,
    };

    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(treeWithNestedFiles);

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });

    // Filter with consecutive letters that match part of a filename
    const filterInput = screen.getByPlaceholderText('Filter by name or description...');
    fireEvent.change(filterInput, { target: { value: 'as' } });

    // Wait for filter to apply - should expand root and show nested folder with matching file
    await waitFor(() => {
      expect(screen.getByText('album')).toBeInTheDocument();
      expect(screen.getByText('1 file')).toBeInTheDocument(); // Only Bass.mp3 matches
    }, { timeout: 500 });
  });

  it('filters from all items including collapsed folders', async () => {
    const treeWithNestedFolders: DirectoryTree = {
      name: 'music',
      path: '/music',
      files: [],
      subdirectories: [
        {
          name: 'rock',
          path: '/music/rock',
          files: [],
          subdirectories: [
            {
              name: 'classic',
              path: '/music/rock/classic',
              files: [
                { name: 'song1.mp3', path: '/music/rock/classic/song1.mp3', size: 1024 },
              ],
              subdirectories: [],
              totalFileCount: 1,
            },
          ],
          totalFileCount: 1,
        },
        {
          name: 'jazz',
          path: '/music/jazz',
          files: [
            { name: 'smooth.mp3', path: '/music/jazz/smooth.mp3', size: 2048 },
          ],
          subdirectories: [],
          totalFileCount: 1,
        },
      ],
      totalFileCount: 2,
    };

    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(treeWithNestedFolders);

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });

    // Initially, subdirectories are collapsed (only root is expanded)
    expect(screen.queryByText('classic')).not.toBeInTheDocument();

    // Filter for a file in a collapsed nested folder
    const filterInput = screen.getByPlaceholderText('Filter by name or description...');
    fireEvent.change(filterInput, { target: { value: 'song1' } });

    // Wait for filter to apply and auto-expand parent folders (debounced - 300ms by default)
    await waitFor(() => {
      // Should auto-expand parent folders and show the nested folder
      expect(screen.getByText('rock')).toBeInTheDocument();
      expect(screen.getByText('classic')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('auto-expands all parent folders of matching files', async () => {
    const deepTree: DirectoryTree = {
      name: 'root',
      path: '/root',
      files: [],
      subdirectories: [
        {
          name: 'level1',
          path: '/root/level1',
          files: [],
          subdirectories: [
            {
              name: 'level2',
              path: '/root/level1/level2',
              files: [],
              subdirectories: [
                {
                  name: 'level3',
                  path: '/root/level1/level2/level3',
                  files: [
                    { name: 'deep.mp3', path: '/root/level1/level2/level3/deep.mp3', size: 1024 },
                  ],
                  subdirectories: [],
                  totalFileCount: 1,
                },
              ],
              totalFileCount: 1,
            },
          ],
          totalFileCount: 1,
        },
      ],
      totalFileCount: 1,
    };

    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(deepTree);

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText('root')).toBeInTheDocument();
    });

    // Filter for the deeply nested file
    const filterInput = screen.getByPlaceholderText('Filter by name or description...');
    fireEvent.change(filterInput, { target: { value: 'deep' } });

    // Wait for filter to apply and auto-expand all parent folders (debounced - 300ms by default)
    await waitFor(() => {
      expect(screen.getByText('level1')).toBeInTheDocument();
      expect(screen.getByText('level2')).toBeInTheDocument();
      expect(screen.getByText('level3')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('shows all contents when folder name matches filter', async () => {
    const treeWithMultipleFiles: DirectoryTree = {
      name: 'music',
      path: '/music',
      files: [],
      subdirectories: [
        {
          name: 'favorites',
          path: '/music/favorites',
          files: [
            { name: 'track1.mp3', path: '/music/favorites/track1.mp3', size: 1024 },
            { name: 'track2.mp3', path: '/music/favorites/track2.mp3', size: 2048 },
            { name: 'track3.mp3', path: '/music/favorites/track3.mp3', size: 3072 },
          ],
          subdirectories: [],
          totalFileCount: 3,
        },
        {
          name: 'other',
          path: '/music/other',
          files: [
            { name: 'song.mp3', path: '/music/other/song.mp3', size: 1024 },
          ],
          subdirectories: [],
          totalFileCount: 1,
        },
      ],
      totalFileCount: 4,
    };

    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(treeWithMultipleFiles);

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });

    // Filter by folder name
    const filterInput = screen.getByPlaceholderText('Filter by name or description...');
    fireEvent.change(filterInput, { target: { value: 'favorites' } });

    // Wait for filter to apply (debounced - 300ms by default)
    await waitFor(() => {
      // Should show the matching folder
      expect(screen.getByText('favorites')).toBeInTheDocument();
      // Should NOT show non-matching folder
      expect(screen.queryByText('other')).not.toBeInTheDocument();
      // Result count should show all 3 files in favorites folder
      expect(screen.getByText('3 files')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('filters by rating from all items including collapsed', async () => {
    const treeForRatingFilter: DirectoryTree = {
      name: 'music',
      path: '/music',
      files: [],
      subdirectories: [
        {
          name: 'rated',
          path: '/music/rated',
          files: [
            { name: 'good.mp3', path: '/music/rated/good.mp3', size: 1024 },
          ],
          subdirectories: [],
          totalFileCount: 1,
        },
      ],
      totalFileCount: 1,
    };

    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(treeForRatingFilter);

    // Mock metadata with rating
    global.fetch = vi.fn((url) => {
      if (url === '/api/metadata') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            metadata: {
              '/music/rated/good.mp3': { rating: 3, description: '' },
            },
          }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    });

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });

    // Root is expanded by default, but subdirectory 'rated' should be visible but collapsed
    // (it shows in the tree but its contents are not expanded)
    expect(screen.getByText('rated')).toBeInTheDocument();

    // Filter by rating
    const ratingSelect = screen.getByLabelText('Rating filter');
    fireEvent.change(ratingSelect, { target: { value: '3' } });

    // Wait for filter to apply and auto-expand parent folder (debounced - 300ms by default)
    await waitFor(() => {
      expect(screen.getByText('rated')).toBeInTheDocument();
      expect(screen.getByText('1 file')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('displays directory tree', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });

    // Should display root directory name
    expect(screen.getByText('music')).toBeInTheDocument();
  });

  it('displays file count', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      // Should display file count (initially shows visible files only)
      expect(screen.getByText(/\d+ files?/)).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);

    renderWithProviders(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });

    // Initially first item should be selected
    const selectedItems = document.querySelectorAll('.audio-tree__item--selected');
    expect(selectedItems.length).toBe(1);

    // Simulate arrow down key
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    // Selection should still exist (may move to next item)
    await waitFor(() => {
      const items = document.querySelectorAll('.audio-tree__item--selected');
      expect(items.length).toBe(1);
    });
  });
});
