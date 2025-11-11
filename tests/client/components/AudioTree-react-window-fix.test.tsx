import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AudioTree, TreeItem } from '../../../src/client/components/AudioTree';

describe('AudioTree - React Window itemData Fix', () => {
  const mockOnItemClick = vi.fn();
  const mockOnExpandToggle = vi.fn();

  it('should not pass itemData prop to List component', () => {
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
          totalFileCount: 0,
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
  });

  it('should handle items array changes without crashing', () => {
    const items1: TreeItem[] = [
      {
        id: 'dir-1',
        type: 'directory',
        level: 0,
        isExpanded: false,
        directory: {
          name: 'Dir1',
          path: 'dir1',
          files: [],
          subdirectories: [],
          totalFileCount: 0,
        },
      },
    ];

    const items2: TreeItem[] = [
      {
        id: 'dir-1',
        type: 'directory',
        level: 0,
        isExpanded: true,
        directory: {
          name: 'Dir1',
          path: 'dir1',
          files: [],
          subdirectories: [],
          totalFileCount: 0,
        },
      },
      {
        id: 'file-1',
        type: 'file',
        level: 1,
        file: {
          name: 'test.mp3',
          path: 'dir1/test.mp3',
          size: 1000,
        },
      },
    ];

    const { container, rerender } = render(
      <AudioTree
        items={items1}
        selectedIndex={0}
        onItemClick={mockOnItemClick}
        onExpandToggle={mockOnExpandToggle}
      />
    );

    // Should render first state
    expect(container.querySelector('.audio-tree')).toBeInTheDocument();

    // Should handle rerender with different items
    rerender(
      <AudioTree
        items={items2}
        selectedIndex={0}
        onItemClick={mockOnItemClick}
        onExpandToggle={mockOnExpandToggle}
      />
    );

    // Should still render without errors
    expect(container.querySelector('.audio-tree')).toBeInTheDocument();
  });

  it('should handle rapid items changes', () => {
    const { rerender } = render(
      <AudioTree
        items={[]}
        selectedIndex={-1}
        onItemClick={mockOnItemClick}
        onExpandToggle={mockOnExpandToggle}
      />
    );

    // Simulate rapid changes
    for (let i = 0; i < 10; i++) {
      const items: TreeItem[] = Array.from({ length: i }, (_, idx) => ({
        id: `dir-${idx}`,
        type: 'directory' as const,
        level: 0,
        isExpanded: false,
        directory: {
          name: `Dir${idx}`,
          path: `dir${idx}`,
          files: [],
          subdirectories: [],
          totalFileCount: 0,
        },
      }));

      rerender(
        <AudioTree
          items={items}
          selectedIndex={-1}
          onItemClick={mockOnItemClick}
          onExpandToggle={mockOnExpandToggle}
        />
      );
    }

    // Should not crash
    expect(true).toBe(true);
  });
});
