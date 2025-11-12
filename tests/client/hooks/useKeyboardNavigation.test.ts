import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation, NavigationItem } from '../../../src/client/hooks/useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  const mockItems: NavigationItem[] = [
    { id: 'file1', type: 'file' },
    { id: 'dir1', type: 'directory', isExpanded: false },
    { id: 'file2', type: 'file' },
    { id: 'dir2', type: 'directory', isExpanded: true },
    { id: 'file3', type: 'file' },
  ];

  it('initializes with first item selected', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    expect(result.current.selectedIndex).toBe(0);
    expect(result.current.selectedItem).toEqual(mockItems[0]);
  });

  it('selects next item with selectNext', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    act(() => {
      result.current.selectNext();
    });

    expect(result.current.selectedIndex).toBe(1);
    expect(result.current.selectedItem).toEqual(mockItems[1]);
  });

  it('selects previous item with selectPrevious', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    // Start at index 0, move to 1, then to 2
    act(() => {
      result.current.selectNext();
    });
    
    act(() => {
      result.current.selectNext();
    });

    expect(result.current.selectedIndex).toBe(2);

    act(() => {
      result.current.selectPrevious();
    });

    expect(result.current.selectedIndex).toBe(1);
  });

  it('does not go below first item', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    act(() => {
      result.current.selectPrevious();
    });

    expect(result.current.selectedIndex).toBe(0);
  });

  it('does not go beyond last item', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    // Call selectNext multiple times
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.selectNext();
      });
    }

    expect(result.current.selectedIndex).toBe(mockItems.length - 1);
  });

  it('selects item by index', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    act(() => {
      result.current.selectItem(3);
    });

    expect(result.current.selectedIndex).toBe(3);
    expect(result.current.selectedItem).toEqual(mockItems[3]);
  });

  it('calls onSelect callback when item is selected', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onSelect })
    );

    act(() => {
      result.current.selectNext();
    });

    expect(onSelect).toHaveBeenCalledWith(mockItems[1], 1);
  });

  it('expands directory with expandItem', () => {
    const onExpand = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onExpand })
    );

    act(() => {
      result.current.selectItem(1); // Select directory
    });

    act(() => {
      result.current.expandItem();
    });

    expect(onExpand).toHaveBeenCalledWith(mockItems[1], 1);
  });

  it('collapses directory with collapseItem', () => {
    const onCollapse = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onCollapse })
    );

    act(() => {
      result.current.selectItem(3); // Select expanded directory
    });

    act(() => {
      result.current.collapseItem();
    });

    expect(onCollapse).toHaveBeenCalledWith(mockItems[3], 3);
  });

  it('does not expand/collapse file items', () => {
    const onExpand = vi.fn();
    const onCollapse = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onExpand, onCollapse })
    );

    act(() => {
      result.current.selectItem(0); // Select file
    });

    act(() => {
      result.current.expandItem();
      result.current.collapseItem();
    });

    expect(onExpand).not.toHaveBeenCalled();
    expect(onCollapse).not.toHaveBeenCalled();
  });

  it('toggles expand state', () => {
    const onExpand = vi.fn();
    const onCollapse = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onExpand, onCollapse })
    );

    // Select collapsed directory
    act(() => {
      result.current.selectItem(1);
    });

    act(() => {
      result.current.toggleExpand();
    });

    expect(onExpand).toHaveBeenCalledWith(mockItems[1], 1);

    // Select expanded directory
    act(() => {
      result.current.selectItem(3);
    });

    act(() => {
      result.current.toggleExpand();
    });

    expect(onCollapse).toHaveBeenCalledWith(mockItems[3], 3);
  });

  it('handles ArrowDown key', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(result.current.selectedIndex).toBe(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles ArrowUp key', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    act(() => {
      result.current.selectItem(2);
    });

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(result.current.selectedIndex).toBe(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles ArrowRight key for directories', () => {
    const onExpand = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onExpand })
    );

    act(() => {
      result.current.selectItem(1); // Select collapsed directory
    });

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(onExpand).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles ArrowRight key for files - does nothing', () => {
    const onExpand = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onExpand })
    );

    act(() => {
      result.current.selectItem(0); // Select file
    });

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    // Should not call onExpand for files
    expect(onExpand).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles ArrowLeft key for expanded directories - collapses them', () => {
    const onCollapse = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onCollapse })
    );

    act(() => {
      result.current.selectItem(3); // Select expanded directory
    });

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(onCollapse).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles ArrowLeft key for collapsed directories - collapses parent', () => {
    const onCollapseAndSelectParent = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onCollapseAndSelectParent })
    );

    act(() => {
      result.current.selectItem(1); // Select collapsed directory
    });

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(onCollapseAndSelectParent).toHaveBeenCalledWith(mockItems[1], 1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles ArrowLeft key for files - collapses parent folder', () => {
    const onCollapseAndSelectParent = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onCollapseAndSelectParent })
    );

    act(() => {
      result.current.selectItem(0); // Select file
    });

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(onCollapseAndSelectParent).toHaveBeenCalledWith(mockItems[0], 0);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles Space key', () => {
    const onTogglePlay = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onTogglePlay })
    );

    const event = new KeyboardEvent('keydown', { key: ' ' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(onTogglePlay).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onSelect, enabled: false })
    );

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    // Should not change selection when disabled
    expect(result.current.selectedIndex).toBe(0);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('resets selection when items change', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useKeyboardNavigation({ items }),
      { initialProps: { items: mockItems } }
    );

    act(() => {
      result.current.selectItem(4);
    });

    expect(result.current.selectedIndex).toBe(4);

    // Update with fewer items
    const newItems = mockItems.slice(0, 2);
    rerender({ items: newItems });

    expect(result.current.selectedIndex).toBe(1);
  });

  it('handles empty items array', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: [] })
    );

    expect(result.current.selectedIndex).toBe(0);
    expect(result.current.selectedItem).toBe(null);

    act(() => {
      result.current.selectNext();
      result.current.selectPrevious();
    });

    // Should not crash
    expect(result.current.selectedIndex).toBe(0);
  });

  it('handles number key 1 for rating', () => {
    const onRating = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onRating })
    );

    // Select a file
    act(() => {
      result.current.selectItem(0);
    });

    const event = new KeyboardEvent('keydown', { key: '1' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(onRating).toHaveBeenCalledWith(mockItems[0], 0, 1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles number key 2 for rating', () => {
    const onRating = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onRating })
    );

    // Select a file
    act(() => {
      result.current.selectItem(2);
    });

    const event = new KeyboardEvent('keydown', { key: '2' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(onRating).toHaveBeenCalledWith(mockItems[2], 2, 2);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles number key 3 for rating', () => {
    const onRating = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onRating })
    );

    // Select a file
    act(() => {
      result.current.selectItem(4);
    });

    const event = new KeyboardEvent('keydown', { key: '3' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(onRating).toHaveBeenCalledWith(mockItems[4], 4, 3);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not call onRating for directories', () => {
    const onRating = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onRating })
    );

    // Select a directory
    act(() => {
      result.current.selectItem(1);
    });

    const event = new KeyboardEvent('keydown', { key: '1' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    // Should not call onRating for directories
    expect(onRating).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not call onRating when callback is not provided', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    // Select a file
    act(() => {
      result.current.selectItem(0);
    });

    const event = new KeyboardEvent('keydown', { key: '1' });
    event.preventDefault = vi.fn();

    // Should not crash when onRating is not provided
    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles Enter key for files to trigger description edit', () => {
    const onEnterEdit = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onEnterEdit })
    );

    // Select a file
    act(() => {
      result.current.selectItem(0);
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(onEnterEdit).toHaveBeenCalledWith(mockItems[0], 0);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not call onEnterEdit for directories', () => {
    const onEnterEdit = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onEnterEdit })
    );

    // Select a directory
    act(() => {
      result.current.selectItem(1);
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    // Should not call onEnterEdit for directories
    expect(onEnterEdit).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not call onEnterEdit when callback is not provided', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    // Select a file
    act(() => {
      result.current.selectItem(0);
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    event.preventDefault = vi.fn();

    // Should not crash when onEnterEdit is not provided
    act(() => {
      result.current.handleKeyDown(event as any);
    });

    expect(event.preventDefault).toHaveBeenCalled();
  });
});
