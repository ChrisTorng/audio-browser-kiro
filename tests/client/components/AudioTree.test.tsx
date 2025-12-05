import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioTree, TreeItem } from '../../../src/client/components/AudioTree';
import { AudioMetadataProvider } from '../../../src/client/contexts/AudioMetadataContext';

// Helper function to render with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AudioMetadataProvider>
      {ui}
    </AudioMetadataProvider>
  );
};

describe('AudioTree', () => {
  const mockItems: TreeItem[] = [
    {
      id: 'dir-1',
      type: 'directory',
      level: 0,
      isExpanded: true,
      directory: {
        name: 'Music',
        path: '/music',
        files: [
          { name: 'song1.mp3', path: '/music/song1.mp3', size: 1024 },
          { name: 'song2.mp3', path: '/music/song2.mp3', size: 2048 },
        ],
        subdirectories: [],
        totalFileCount: 2,
      },
    },
    {
      id: 'file-1',
      type: 'file',
      level: 1,
      file: {
        name: 'song1.mp3',
        path: '/music/song1.mp3',
        size: 1024,
      },
    },
    {
      id: 'file-2',
      type: 'file',
      level: 1,
      file: {
        name: 'song2.mp3',
        path: '/music/song2.mp3',
        size: 2048,
      },
    },
  ];

  it('renders tree items correctly', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    renderWithProviders(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // Check directory is rendered
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Check files are rendered
    expect(screen.getByText('song1.mp3')).toBeInTheDocument();
    expect(screen.getByText('song2.mp3')).toBeInTheDocument();
  });

  it('calls onItemClick when item is clicked', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    renderWithProviders(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // Click on a file item - AudioItem uses .audio-item class
    const fileItem = screen.getByText('song1.mp3').closest('.audio-item');
    fireEvent.click(fileItem!);

    expect(onItemClick).toHaveBeenCalledWith(1);
  });

  it('calls both onItemClick and onExpandToggle when directory is clicked', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    renderWithProviders(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // Click anywhere on the directory item
    const directoryItem = screen.getByText('Music').closest('.audio-tree__item');
    fireEvent.click(directoryItem!);

    expect(onItemClick).toHaveBeenCalledWith(0);
    expect(onExpandToggle).toHaveBeenCalledWith(0);
  });

  it('highlights selected item', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    renderWithProviders(
      <AudioTree
        items={mockItems}
        selectedIndex={1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // AudioItem uses .audio-item class with --selected modifier
    const fileItem = screen.getByText('song1.mp3').closest('.audio-item');
    expect(fileItem).toHaveClass('audio-item--selected');
  });

  it('highlights filter text in item names', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    renderWithProviders(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
        filterText="song1"
      />
    );

    // Check that the filter text is highlighted - AudioItem uses .audio-item__highlight
    const highlights = document.querySelectorAll('.audio-item__highlight');
    expect(highlights.length).toBeGreaterThan(0);
    expect(highlights[0].textContent).toBe('song1');
  });

  it('shows empty state when no items', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    renderWithProviders(
      <AudioTree
        items={[]}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    expect(screen.getByText('No items to display')).toBeInTheDocument();
  });

  it('displays expand/collapse icons correctly', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    const { rerender } = renderWithProviders(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // Check expanded icon
    expect(screen.getByText('▼')).toBeInTheDocument();

    // Update to collapsed state
    const collapsedItems: TreeItem[] = [
      {
        ...mockItems[0],
        isExpanded: false,
      },
    ];

    rerender(
      <AudioMetadataProvider>
        <AudioTree
          items={collapsedItems}
          selectedIndex={-1}
          onItemClick={onItemClick}
          onExpandToggle={onExpandToggle}
        />
      </AudioMetadataProvider>
    );

    // Check collapsed icon
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('applies correct indentation based on level', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    renderWithProviders(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // Check level 0 item (directory) - uses .audio-tree__item-content
    const dirContent = screen.getByText('Music').closest('.audio-tree__item-content');
    expect(dirContent).toHaveStyle({ paddingLeft: '0px' });

    // Check level 1 item (file) - AudioItem applies paddingLeft directly to .audio-item
    const fileItem = screen.getByText('song1.mp3').closest('.audio-item');
    expect(fileItem).toHaveStyle({ paddingLeft: '20px' });
  });
});
