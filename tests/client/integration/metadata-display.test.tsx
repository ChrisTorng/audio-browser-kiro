import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { AudioFile } from '../../../src/shared/types';

// Mock hooks BEFORE imports
const mockLoadVisualization = vi.fn();
const mockClearVisualization = vi.fn();

vi.mock('../../../src/client/hooks', () => ({
  useAudioPlayer: vi.fn(() => ({
    isPlaying: false,
    progress: 0,
  })),
  useLazyVisualization: vi.fn(() => ({
    waveformData: null,
    spectrogramData: null,
    isLoading: false,
    error: null,
    loadVisualization: mockLoadVisualization,
    clearVisualization: mockClearVisualization,
  })),
}));

// Import components AFTER mocks
import { AudioMetadataProvider } from '../../../src/client/contexts/AudioMetadataContext';
import { AudioItem } from '../../../src/client/components/AudioItem';

/**
 * Integration test for metadata display after saving
 * Tests requirement 15.1: 確認星級和描述儲存後正確顯示
 * 
 * This test verifies that:
 * 1. Star ratings are saved and immediately displayed in the UI
 * 2. Descriptions are saved and immediately displayed in the UI
 * 3. Saved data doesn't disappear due to flickering issues
 */
describe('Metadata Display After Saving', () => {
  const mockFile: AudioFile = {
    name: 'test-song.mp3',
    path: '/music/test-song.mp3',
    size: 5242880,
  };

  // Mock fetch for API calls
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadVisualization.mockClear();
    mockClearVisualization.mockClear();
    
    // Mock successful metadata fetch (initially empty)
    global.fetch = vi.fn((url, options) => {
      // GET /api/metadata - initial fetch
      if (url === '/api/metadata' && (!options || options.method === undefined || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ metadata: {} }),
        } as Response);
      }
      
      // POST /api/metadata - update metadata
      if (url === '/api/metadata' && options && options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            metadata: {
              id: 1,
              filePath: body.filePath,
              rating: body.rating !== undefined ? body.rating : 0,
              description: body.description !== undefined ? body.description : '',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        } as Response);
      }
      
      return Promise.reject(new Error(`Unknown URL: ${url}`));
    }) as any;
  });

  it('displays star rating immediately after saving', async () => {
    const { container } = render(
      <AudioMetadataProvider>
        <AudioItem
          file={mockFile}
          isSelected={true}
          isVisible={true}
          level={1}
          onClick={vi.fn()}
        />
      </AudioMetadataProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('test-song.mp3')).toBeInTheDocument();
    });

    // Find star rating buttons
    const starButtons = container.querySelectorAll('.star-rating__star');
    expect(starButtons).toHaveLength(3);

    // Initially, all stars should be empty (rating = 0)
    starButtons.forEach((star) => {
      expect(star.textContent).toBe('☆');
    });

    // Click the third star to set rating to 3
    await act(async () => {
      fireEvent.click(starButtons[2]);
    });

    // Wait for the update to complete
    await waitFor(() => {
      // The third star should now be filled
      expect(starButtons[2].textContent).toBe('★');
    });

    // Verify all three stars are filled
    expect(starButtons[0].textContent).toBe('★');
    expect(starButtons[1].textContent).toBe('★');
    expect(starButtons[2].textContent).toBe('★');

    // Verify the rating persists (doesn't disappear)
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(starButtons[0].textContent).toBe('★');
    expect(starButtons[1].textContent).toBe('★');
    expect(starButtons[2].textContent).toBe('★');
  });

  it('displays description immediately after saving', async () => {
    const { container } = render(
      <AudioMetadataProvider>
        <AudioItem
          file={mockFile}
          isSelected={true}
          isVisible={true}
          level={1}
          onClick={vi.fn()}
        />
      </AudioMetadataProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('test-song.mp3')).toBeInTheDocument();
    });

    // Find description field
    const descriptionField = container.querySelector('.description-field');
    expect(descriptionField).toBeInTheDocument();

    // Click to enter edit mode
    await act(async () => {
      fireEvent.click(descriptionField!);
    });

    // Wait for input to appear
    await waitFor(() => {
      const input = container.querySelector('.description-field__input');
      expect(input).toBeInTheDocument();
    });

    // Type description
    const input = container.querySelector('.description-field__input') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Great track!' } });
    });

    // Press Enter to save
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    // Wait for the description to be displayed
    await waitFor(() => {
      expect(screen.getByText('Great track!')).toBeInTheDocument();
    });

    // Verify the description persists (doesn't disappear)
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByText('Great track!')).toBeInTheDocument();
  });

  it('maintains both rating and description after multiple updates', async () => {
    const { container } = render(
      <AudioMetadataProvider>
        <AudioItem
          file={mockFile}
          isSelected={true}
          isVisible={true}
          level={1}
          onClick={vi.fn()}
        />
      </AudioMetadataProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('test-song.mp3')).toBeInTheDocument();
    });

    // Set rating first
    const starButtons = container.querySelectorAll('.star-rating__star');
    await act(async () => {
      fireEvent.click(starButtons[1]); // Set to 2 stars
    });

    await waitFor(() => {
      expect(starButtons[1].textContent).toBe('★');
    });

    // Then set description
    const descriptionField = container.querySelector('.description-field');
    await act(async () => {
      fireEvent.click(descriptionField!);
    });

    await waitFor(() => {
      const input = container.querySelector('.description-field__input');
      expect(input).toBeInTheDocument();
    });

    const input = container.querySelector('.description-field__input') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Nice melody' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    // Verify both rating and description are displayed
    await waitFor(() => {
      expect(screen.getByText('Nice melody')).toBeInTheDocument();
    });

    // Rating should still be visible
    expect(starButtons[0].textContent).toBe('★');
    expect(starButtons[1].textContent).toBe('★');

    // Wait a bit and verify data persists
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByText('Nice melody')).toBeInTheDocument();
    expect(starButtons[0].textContent).toBe('★');
    expect(starButtons[1].textContent).toBe('★');
  });
});
