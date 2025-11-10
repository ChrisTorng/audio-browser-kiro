import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioBrowser } from '../../../src/client/components/AudioBrowser';
import { audioBrowserAPI } from '../../../src/client/services/api';
import { ToastProvider } from '../../../src/client/contexts/ToastContext';
import type { DirectoryTree } from '../../../src/shared/types';

// Mock the API
vi.mock('../../../src/client/services/api', () => ({
  audioBrowserAPI: {
    scanDirectory: vi.fn(),
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
      },
    ],
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

  it('renders initial state with scan input', () => {
    render(<AudioBrowser />);

    expect(screen.getByText('Audio Browser')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter directory path...')).toBeInTheDocument();
    expect(screen.getByText('Scan')).toBeInTheDocument();
  });

  it('displays empty state message when no directory is scanned', () => {
    render(<AudioBrowser />);

    expect(screen.getByText('Enter a directory path and click Scan to begin')).toBeInTheDocument();
  });

  it('scans directory when scan button is clicked', async () => {
    vi.mocked(audioBrowserAPI.scanDirectory).mockResolvedValue(mockTree);

    render(<AudioBrowser />);

    const input = screen.getByPlaceholderText('Enter directory path...');
    const scanButton = screen.getByText('Scan');

    fireEvent.change(input, { target: { value: '/music' } });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(audioBrowserAPI.scanDirectory).toHaveBeenCalledWith('/music');
    });

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
    });
  });

  it('displays directory tree after successful scan', async () => {
    vi.mocked(audioBrowserAPI.scanDirectory).mockResolvedValue(mockTree);

    render(<AudioBrowser />);

    const input = screen.getByPlaceholderText('Enter directory path...');
    const scanButton = screen.getByText('Scan');

    fireEvent.change(input, { target: { value: '/music' } });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(screen.getByText('music')).toBeInTheDocument();
      expect(screen.getByText('song1.mp3')).toBeInTheDocument();
      expect(screen.getByText('song2.mp3')).toBeInTheDocument();
    });
  });

  it('displays error message when scan fails', async () => {
    vi.mocked(audioBrowserAPI.scanDirectory).mockRejectedValue(
      new Error('Permission denied')
    );

    render(<AudioBrowser />);

    const input = screen.getByPlaceholderText('Enter directory path...');
    const scanButton = screen.getByText('Scan');

    fireEvent.change(input, { target: { value: '/protected' } });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(screen.getByText(/Error:.*Permission denied/)).toBeInTheDocument();
    });
  });

  it('filters items by text', async () => {
    vi.mocked(audioBrowserAPI.scanDirectory).mockResolvedValue(mockTree);

    render(<AudioBrowser />);

    const input = screen.getByPlaceholderText('Enter directory path...');
    const scanButton = screen.getByText('Scan');

    fireEvent.change(input, { target: { value: '/music' } });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'song1.mp3';
      })).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText('Filter by name or description...');
    fireEvent.change(filterInput, { target: { value: 'song1' } });

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'song1.mp3';
      })).toBeInTheDocument();
      expect(screen.queryByText((content, element) => {
        return element?.textContent === 'song2.mp3';
      })).not.toBeInTheDocument();
    });
  });

  it('expands and collapses directories', async () => {
    vi.mocked(audioBrowserAPI.scanDirectory).mockResolvedValue(mockTree);

    render(<AudioBrowser />);

    const input = screen.getByPlaceholderText('Enter directory path...');
    const scanButton = screen.getByText('Scan');

    fireEvent.change(input, { target: { value: '/music' } });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'album1';
      })).toBeInTheDocument();
    });

    // Initially subdirectory is collapsed
    expect(screen.queryByText((content, element) => {
      return element?.textContent === 'track1.mp3';
    })).not.toBeInTheDocument();

    // Select the album directory using keyboard navigation
    const albumItem = screen.getByText((content, element) => {
      return element?.textContent === 'album1';
    }).closest('.audio-tree__item');
    fireEvent.click(albumItem!);

    // Simulate right arrow key to expand
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'track1.mp3';
      })).toBeInTheDocument();
    });
  });

  it('displays item count', async () => {
    vi.mocked(audioBrowserAPI.scanDirectory).mockResolvedValue(mockTree);

    render(<AudioBrowser />);

    const input = screen.getByPlaceholderText('Enter directory path...');
    const scanButton = screen.getByText('Scan');

    fireEvent.change(input, { target: { value: '/music' } });
    fireEvent.click(scanButton);

    await waitFor(() => {
      // Root directory + 2 files + 1 subdirectory = 4 items
      expect(screen.getByText(/4 items/)).toBeInTheDocument();
    });
  });

  it('disables scan button when no path is entered', () => {
    render(<AudioBrowser />);

    const scanButton = screen.getByText('Scan');
    expect(scanButton).toBeDisabled();
  });

  it('disables scan button while scanning', async () => {
    vi.mocked(audioBrowserAPI.scanDirectory).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockTree), 100))
    );

    render(<AudioBrowser />);

    const input = screen.getByPlaceholderText('Enter directory path...');
    const scanButton = screen.getByText('Scan');

    fireEvent.change(input, { target: { value: '/music' } });
    fireEvent.click(scanButton);

    expect(screen.getByText('Scanning...')).toBeInTheDocument();
    expect(scanButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
  });
});
