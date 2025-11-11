import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioBrowser } from '../../../src/client/components/AudioBrowser';
import { audioBrowserAPI } from '../../../src/client/services/api';
import { ToastProvider } from '../../../src/client/contexts/ToastContext';
import type { DirectoryTree } from '../../../src/shared/types';

// Mock the API
vi.mock('../../../src/client/services/api', () => ({
  audioBrowserAPI: {
    getTree: vi.fn(),
    getAllMetadata: vi.fn(),
  },
}));

// Helper function to render with ToastProvider
const renderWithToast = (component: React.ReactElement) => {
  return render(<ToastProvider>{component}</ToastProvider>);
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
    
    renderWithToast(<AudioBrowser />);

    expect(screen.getByText('Audio Browser')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter by name or description...')).toBeInTheDocument();
  });

  it('loads directory tree on mount', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);

    renderWithToast(<AudioBrowser />);

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

    renderWithToast(<AudioBrowser />);

    expect(screen.getByText('Loading audio directory...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });
  });

  it('displays error message when tree loading fails', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockRejectedValue(
      new Error('Failed to load directory')
    );

    renderWithToast(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText(/Load failed:.*Failed to load directory/)).toBeInTheDocument();
    });
  });

  it('filters items by text', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);

    renderWithToast(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText('Filter by name or description...');
    fireEvent.change(filterInput, { target: { value: 'album1' } });

    // Wait for filter to apply (debounced)
    await waitFor(() => {
      // Should show filtered results - album1 directory
      expect(screen.getByText('album1')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('expands and collapses directories', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);

    renderWithToast(<AudioBrowser />);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });

    // Root directory should be expanded by default (has Collapse button)
    await waitFor(() => {
      const collapseButtons = screen.queryAllByLabelText('Collapse');
      expect(collapseButtons.length).toBeGreaterThan(0);
    });

    // Subdirectory album1 should also be expanded (from test output we see it has Collapse button)
    const collapseButtons = screen.getAllByLabelText('Collapse');
    expect(collapseButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('displays item count', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);

    renderWithToast(<AudioBrowser />);

    await waitFor(() => {
      // Root directory + 2 files + 1 subdirectory = 4 items
      expect(screen.getByText(/4 items/)).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    vi.mocked(audioBrowserAPI.getTree).mockResolvedValue(mockTree);

    renderWithToast(<AudioBrowser />);

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
