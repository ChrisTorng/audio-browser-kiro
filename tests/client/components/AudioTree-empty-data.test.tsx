import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AudioTree, TreeItem } from '../../../src/client/components/AudioTree';

describe('AudioTree - Empty Data Handling', () => {
  const mockOnItemClick = vi.fn();
  const mockOnExpandToggle = vi.fn();

  it('should handle empty items array without crashing', () => {
    const items: TreeItem[] = [];

    render(
      <AudioTree
        items={items}
        selectedIndex={-1}
        onItemClick={mockOnItemClick}
        onExpandToggle={mockOnExpandToggle}
      />
    );

    expect(screen.getByText('No items to display')).toBeInTheDocument();
  });

  it('should handle items with empty files and subdirectories', () => {
    const items: TreeItem[] = [
      {
        id: 'dir-root',
        type: 'directory',
        level: 0,
        isExpanded: true,
        directory: {
          name: 'Root',
          path: 'root',
          files: [],
          subdirectories: [],
        },
      },
    ];

    const { container } = render(
      <AudioTree
        items={items}
        selectedIndex={0}
        onItemClick={mockOnItemClick}
        onExpandToggle={mockOnExpandToggle}
      />
    );

    // Should render the directory item
    expect(container.querySelector('.audio-tree__directory')).toBeInTheDocument();
    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByText('(0 files)')).toBeInTheDocument();
  });

  it('should handle nested directories with empty arrays', () => {
    const items: TreeItem[] = [
      {
        id: 'dir-root',
        type: 'directory',
        level: 0,
        isExpanded: true,
        directory: {
          name: 'Root',
          path: 'root',
          files: [],
          subdirectories: [
            {
              name: 'SubDir',
              path: 'root/subdir',
              files: [],
              subdirectories: [],
            },
          ],
        },
      },
      {
        id: 'dir-subdir',
        type: 'directory',
        level: 1,
        isExpanded: false,
        directory: {
          name: 'SubDir',
          path: 'root/subdir',
          files: [],
          subdirectories: [],
        },
      },
    ];

    const { container } = render(
      <AudioTree
        items={items}
        selectedIndex={0}
        onItemClick={mockOnItemClick}
        onExpandToggle={mockOnExpandToggle}
      />
    );

    // Should render both directory items
    const directories = container.querySelectorAll('.audio-tree__directory');
    expect(directories).toHaveLength(2);
  });

  it('should handle real API response structure', () => {
    // This is based on actual API response from /api/tree
    const items: TreeItem[] = [
      {
        id: 'dir-.',
        type: 'directory',
        level: 0,
        isExpanded: true,
        directory: {
          name: 'music-player',
          path: '.',
          files: [],
          subdirectories: [
            {
              name: 'test',
              path: 'test',
              files: [],
              subdirectories: [],
            },
          ],
        },
      },
      {
        id: 'dir-test',
        type: 'directory',
        level: 1,
        isExpanded: false,
        directory: {
          name: 'test',
          path: 'test',
          files: [],
          subdirectories: [],
        },
      },
    ];

    const { container } = render(
      <AudioTree
        items={items}
        selectedIndex={0}
        onItemClick={mockOnItemClick}
        onExpandToggle={mockOnExpandToggle}
      />
    );

    // Should render without errors
    expect(container.querySelector('.audio-tree')).toBeInTheDocument();
    expect(screen.getByText('music-player')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
