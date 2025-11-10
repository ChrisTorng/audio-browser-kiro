import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioTree, TreeItem } from '../../../src/client/components/AudioTree';

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

    render(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // Check directory is rendered
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('(2 files)')).toBeInTheDocument();

    // Check files are rendered
    expect(screen.getByText('song1.mp3')).toBeInTheDocument();
    expect(screen.getByText('song2.mp3')).toBeInTheDocument();
  });

  it('calls onItemClick when item is clicked', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    render(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // Click on a file item
    const fileItem = screen.getByText('song1.mp3').closest('.audio-tree__item');
    fireEvent.click(fileItem!);

    expect(onItemClick).toHaveBeenCalledWith(1);
  });

  it('calls onExpandToggle when expand button is clicked', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    render(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // Click on expand button
    const expandButton = screen.getByLabelText('Collapse');
    fireEvent.click(expandButton);

    expect(onExpandToggle).toHaveBeenCalledWith(0);
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('highlights selected item', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    render(
      <AudioTree
        items={mockItems}
        selectedIndex={1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    const fileItem = screen.getByText('song1.mp3').closest('.audio-tree__item');
    expect(fileItem).toHaveClass('audio-tree__item--selected');
  });

  it('highlights filter text in item names', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    render(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
        filterText="song1"
      />
    );

    // Check that the filter text is highlighted
    const highlights = document.querySelectorAll('.audio-tree__highlight');
    expect(highlights.length).toBeGreaterThan(0);
    expect(highlights[0].textContent).toBe('song1');
  });

  it('shows empty state when no items', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    render(
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

    const { rerender } = render(
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
      <AudioTree
        items={collapsedItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // Check collapsed icon
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('applies correct indentation based on level', () => {
    const onItemClick = vi.fn();
    const onExpandToggle = vi.fn();

    render(
      <AudioTree
        items={mockItems}
        selectedIndex={-1}
        onItemClick={onItemClick}
        onExpandToggle={onExpandToggle}
      />
    );

    // Check level 0 item (directory)
    const dirContent = screen.getByText('Music').closest('.audio-tree__item-content');
    expect(dirContent).toHaveStyle({ paddingLeft: '0px' });

    // Check level 1 item (file)
    const fileContent = screen.getByText('song1.mp3').closest('.audio-tree__item-content');
    expect(fileContent).toHaveStyle({ paddingLeft: '20px' });
  });
});
