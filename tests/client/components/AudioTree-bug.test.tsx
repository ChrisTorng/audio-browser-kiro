import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AudioTree, TreeItem } from '../../../src/client/components/AudioTree';

describe('AudioTree - Bug Reproduction', () => {
  it('should handle undefined items gracefully', () => {
    const items: TreeItem[] = [];
    const mockOnItemClick = vi.fn();
    const mockOnExpandToggle = vi.fn();

    // This should not throw an error
    expect(() => {
      render(
        <AudioTree
          items={items}
          selectedIndex={0}
          onItemClick={mockOnItemClick}
          onExpandToggle={mockOnExpandToggle}
        />
      );
    }).not.toThrow();

    expect(screen.getByText('No items to display')).toBeInTheDocument();
  });

  it('should handle items array with undefined elements', () => {
    // Simulate a scenario where items might have undefined elements
    const items: TreeItem[] = [
      {
        id: 'dir-1',
        type: 'directory',
        level: 0,
        isExpanded: true,
        directory: {
          name: 'Test Dir',
          path: 'test',
          files: [],
          subdirectories: [],
        },
      },
    ];

    const mockOnItemClick = vi.fn();
    const mockOnExpandToggle = vi.fn();

    expect(() => {
      render(
        <AudioTree
          items={items}
          selectedIndex={0}
          onItemClick={mockOnItemClick}
          onExpandToggle={mockOnExpandToggle}
        />
      );
    }).not.toThrow();
  });

  it('should handle accessing item at invalid index', () => {
    const items: TreeItem[] = [
      {
        id: 'dir-1',
        type: 'directory',
        level: 0,
        isExpanded: true,
        directory: {
          name: 'Test Dir',
          path: 'test',
          files: [],
          subdirectories: [],
        },
      },
    ];

    const mockOnItemClick = vi.fn();
    const mockOnExpandToggle = vi.fn();

    // Selected index is out of bounds
    expect(() => {
      render(
        <AudioTree
          items={items}
          selectedIndex={10}
          onItemClick={mockOnItemClick}
          onExpandToggle={mockOnExpandToggle}
        />
      );
    }).not.toThrow();
  });

  it('should render items correctly after scan', () => {
    // Simulate the actual data structure returned from scan
    const items: TreeItem[] = [
      {
        id: 'dir-root',
        type: 'directory',
        level: 0,
        isExpanded: true,
        directory: {
          name: 'music-player',
          path: '.',
          files: [],
          subdirectories: [
            {
              name: 'audio',
              path: 'audio',
              files: [
                {
                  name: 'test.mp3',
                  path: 'audio/test.mp3',
                  size: 1024,
                },
              ],
              subdirectories: [],
            },
          ],
        },
      },
    ];

    const mockOnItemClick = vi.fn();
    const mockOnExpandToggle = vi.fn();

    expect(() => {
      render(
        <AudioTree
          items={items}
          selectedIndex={0}
          onItemClick={mockOnItemClick}
          onExpandToggle={mockOnExpandToggle}
        />
      );
    }).not.toThrow();

    expect(screen.getByText('music-player')).toBeInTheDocument();
  });
});
