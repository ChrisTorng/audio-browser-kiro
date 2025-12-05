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

  it('calls onStop when moving from file to directory with selectNext', () => {
    const onStop = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onStop })
    );

    // Start at file (index 0)
    act(() => {
      result.current.selectItem(0);
    });

    // Move to directory (index 1)
    act(() => {
      result.current.selectNext();
    });

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('calls onStop when moving from file to directory with selectPrevious', () => {
    const onStop = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onStop })
    );

    // Start at file (index 2)
    act(() => {
      result.current.selectItem(2);
    });

    // Move to directory (index 1)
    act(() => {
      result.current.selectPrevious();
    });

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('calls onStop when moving from file to directory with selectItem', () => {
    const onStop = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onStop })
    );

    // Start at file (index 0)
    act(() => {
      result.current.selectItem(0);
    });

    // Move to directory (index 1)
    act(() => {
      result.current.selectItem(1);
    });

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('does not call onStop when moving from file to file', () => {
    const onStop = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onStop })
    );

    // Start at file (index 0)
    act(() => {
      result.current.selectItem(0);
    });

    // Move to another file (index 2)
    act(() => {
      result.current.selectItem(2);
    });

    expect(onStop).not.toHaveBeenCalled();
  });

  it('does not call onStop when moving from directory to file', () => {
    const onStop = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onStop })
    );

    // Start at directory (index 1)
    act(() => {
      result.current.selectItem(1);
    });

    // Move to file (index 2)
    act(() => {
      result.current.selectItem(2);
    });

    expect(onStop).not.toHaveBeenCalled();
  });

  it('does not call onStop when moving from directory to directory', () => {
    const onStop = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onStop })
    );

    // Start at directory (index 1)
    act(() => {
      result.current.selectItem(1);
    });

    // Move to another directory (index 3)
    act(() => {
      result.current.selectItem(3);
    });

    expect(onStop).not.toHaveBeenCalled();
  });

  it('does not call onStop when callback is not provided', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    // Start at file (index 0)
    act(() => {
      result.current.selectItem(0);
    });

    // Move to directory (index 1) - should not crash
    act(() => {
      result.current.selectNext();
    });

    expect(result.current.selectedIndex).toBe(1);
  });

  it('initializes with isEditingDescription as false', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    expect(result.current.isEditingDescription).toBe(false);
  });

  it('updates isEditingDescription when setEditingDescription is called', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems })
    );

    act(() => {
      result.current.setEditingDescription(true);
    });

    expect(result.current.isEditingDescription).toBe(true);

    act(() => {
      result.current.setEditingDescription(false);
    });

    expect(result.current.isEditingDescription).toBe(false);
  });

  it('disables space key when editing description', () => {
    const onTogglePlay = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onTogglePlay })
    );

    // Enable editing mode
    act(() => {
      result.current.setEditingDescription(true);
    });

    const event = new KeyboardEvent('keydown', { key: ' ' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    // Should not call onTogglePlay when editing
    expect(onTogglePlay).not.toHaveBeenCalled();
    // Should not prevent default to allow space input
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('disables arrow keys when editing description', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onSelect })
    );

    // Enable editing mode
    act(() => {
      result.current.setEditingDescription(true);
    });

    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    downEvent.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(downEvent as any);
    });

    // Should not change selection when editing
    expect(result.current.selectedIndex).toBe(0);
    expect(onSelect).not.toHaveBeenCalled();
    expect(downEvent.preventDefault).not.toHaveBeenCalled();

    const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    upEvent.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(upEvent as any);
    });

    expect(result.current.selectedIndex).toBe(0);
    expect(upEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('disables left arrow key when editing description', () => {
    const onCollapseAndSelectParent = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onCollapseAndSelectParent })
    );

    // Select a file
    act(() => {
      result.current.selectItem(0);
    });

    // Enable editing mode
    act(() => {
      result.current.setEditingDescription(true);
    });

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    // Should not collapse parent when editing
    expect(onCollapseAndSelectParent).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('disables right arrow key when editing description', () => {
    const onExpand = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onExpand })
    );

    // Select a directory
    act(() => {
      result.current.selectItem(1);
    });

    // Enable editing mode
    act(() => {
      result.current.setEditingDescription(true);
    });

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    // Should not expand directory when editing
    expect(onExpand).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('disables number keys when editing description', () => {
    const onRating = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onRating })
    );

    // Select a file
    act(() => {
      result.current.selectItem(0);
    });

    // Enable editing mode
    act(() => {
      result.current.setEditingDescription(true);
    });

    const event = new KeyboardEvent('keydown', { key: '1' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    // Should not call onRating when editing
    expect(onRating).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('disables Enter key when editing description', () => {
    const onEnterEdit = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onEnterEdit })
    );

    // Select a file
    act(() => {
      result.current.selectItem(0);
    });

    // Enable editing mode
    act(() => {
      result.current.setEditingDescription(true);
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    event.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event as any);
    });

    // Should not call onEnterEdit when already editing
    expect(onEnterEdit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('re-enables keys after editing is complete', () => {
    const onTogglePlay = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items: mockItems, onTogglePlay })
    );

    // Enable editing mode
    act(() => {
      result.current.setEditingDescription(true);
    });

    // Try space key while editing
    const event1 = new KeyboardEvent('keydown', { key: ' ' });
    event1.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event1 as any);
    });

    expect(onTogglePlay).not.toHaveBeenCalled();

    // Disable editing mode
    act(() => {
      result.current.setEditingDescription(false);
    });

    // Try space key after editing
    const event2 = new KeyboardEvent('keydown', { key: ' ' });
    event2.preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown(event2 as any);
    });

    // Should now call onTogglePlay
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
    expect(event2.preventDefault).toHaveBeenCalled();
  });

  describe('Input focus handling', () => {
    it('does not handle keyboard events when INPUT element is focused', () => {
      const onTogglePlay = vi.fn();
      const onRating = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items: mockItems, onTogglePlay, onRating })
      );

      // Create and focus an input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Try space key
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      spaceEvent.preventDefault = vi.fn();

      act(() => {
        result.current.handleKeyDown(spaceEvent as any);
      });

      expect(onTogglePlay).not.toHaveBeenCalled();
      expect(spaceEvent.preventDefault).not.toHaveBeenCalled();

      // Try number key for rating
      const numberEvent = new KeyboardEvent('keydown', { key: '1' });
      numberEvent.preventDefault = vi.fn();

      act(() => {
        result.current.handleKeyDown(numberEvent as any);
      });

      expect(onRating).not.toHaveBeenCalled();
      expect(numberEvent.preventDefault).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(input);
    });

    it('does not handle keyboard events when TEXTAREA element is focused', () => {
      const onTogglePlay = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items: mockItems, onTogglePlay })
      );

      // Create and focus a textarea element
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      // Try space key
      const event = new KeyboardEvent('keydown', { key: ' ' });
      event.preventDefault = vi.fn();

      act(() => {
        result.current.handleKeyDown(event as any);
      });

      expect(onTogglePlay).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(textarea);
    });

    it('does not handle arrow keys when INPUT element is focused', () => {
      const onSelect = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items: mockItems, onSelect })
      );

      // Create and focus an input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Try arrow down key
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      event.preventDefault = vi.fn();

      act(() => {
        result.current.handleKeyDown(event as any);
      });

      // Selection should not change
      expect(result.current.selectedIndex).toBe(0);
      expect(onSelect).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(input);
    });

    it('does not handle contenteditable elements', () => {
      const onTogglePlay = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items: mockItems, onTogglePlay })
      );

      // Create and focus a contenteditable element
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      document.body.appendChild(div);
      div.focus();

      // Try space key
      const event = new KeyboardEvent('keydown', { key: ' ' });
      event.preventDefault = vi.fn();

      act(() => {
        result.current.handleKeyDown(event as any);
      });

      expect(onTogglePlay).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(div);
    });

    it('handles keyboard events normally when no input is focused', () => {
      const onTogglePlay = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items: mockItems, onTogglePlay })
      );

      // Make sure no input is focused (focus on body)
      document.body.focus();

      // Try space key
      const event = new KeyboardEvent('keydown', { key: ' ' });
      event.preventDefault = vi.fn();

      act(() => {
        result.current.handleKeyDown(event as any);
      });

      expect(onTogglePlay).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });
});
