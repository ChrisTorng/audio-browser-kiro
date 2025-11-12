import { useState, useCallback, useEffect } from 'react';

/**
 * Item type for keyboard navigation
 */
export interface NavigationItem {
  id: string;
  type: 'file' | 'directory';
  isExpanded?: boolean;
}

/**
 * Keyboard navigation hook return type
 */
export interface UseKeyboardNavigationReturn {
  selectedIndex: number;
  selectedItem: NavigationItem | null;
  handleKeyDown: (event: KeyboardEvent) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  selectItem: (index: number) => void;
  toggleExpand: () => void;
  expandItem: () => void;
  collapseItem: () => void;
}

/**
 * Keyboard navigation options
 */
export interface UseKeyboardNavigationOptions {
  items: NavigationItem[];
  onSelect?: (item: NavigationItem, index: number) => void;
  onTogglePlay?: () => void;
  onExpand?: (item: NavigationItem, index: number) => void;
  onCollapse?: (item: NavigationItem, index: number) => void;
  onCollapseAndSelectParent?: (item: NavigationItem, index: number) => void;
  onRating?: (item: NavigationItem, index: number, rating: number) => void;
  onEnterEdit?: (item: NavigationItem, index: number) => void;
  enabled?: boolean;
}

/**
 * Custom hook for keyboard navigation in audio browser
 * Handles arrow keys for selection, space for play/stop, and left/right for expand/collapse
 */
export function useKeyboardNavigation(options: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const {
    items,
    onSelect,
    onTogglePlay,
    onExpand,
    onCollapse,
    onCollapseAndSelectParent,
    onRating,
    onEnterEdit,
    enabled = true,
  } = options;

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get currently selected item
  const selectedItem = items[selectedIndex] || null;

  /**
   * Select next item in the list
   */
  const selectNext = useCallback(() => {
    if (items.length === 0) return;

    const nextIndex = Math.min(selectedIndex + 1, items.length - 1);
    setSelectedIndex(nextIndex);

    if (onSelect && items[nextIndex]) {
      onSelect(items[nextIndex], nextIndex);
    }
  }, [selectedIndex, items, onSelect]);

  /**
   * Select previous item in the list
   */
  const selectPrevious = useCallback(() => {
    if (items.length === 0) return;

    const prevIndex = Math.max(selectedIndex - 1, 0);
    setSelectedIndex(prevIndex);

    if (onSelect && items[prevIndex]) {
      onSelect(items[prevIndex], prevIndex);
    }
  }, [selectedIndex, items, onSelect]);

  /**
   * Select item by index
   */
  const selectItem = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return;

    setSelectedIndex(index);

    if (onSelect && items[index]) {
      onSelect(items[index], index);
    }
  }, [items, onSelect]);

  /**
   * Toggle expand/collapse for directory items
   */
  const toggleExpand = useCallback(() => {
    if (!selectedItem || selectedItem.type !== 'directory') return;

    if (selectedItem.isExpanded) {
      if (onCollapse) {
        onCollapse(selectedItem, selectedIndex);
      }
    } else {
      if (onExpand) {
        onExpand(selectedItem, selectedIndex);
      }
    }
  }, [selectedItem, selectedIndex, onExpand, onCollapse]);

  /**
   * Expand directory item
   */
  const expandItem = useCallback(() => {
    if (!selectedItem || selectedItem.type !== 'directory') return;

    if (!selectedItem.isExpanded && onExpand) {
      onExpand(selectedItem, selectedIndex);
    }
  }, [selectedItem, selectedIndex, onExpand]);

  /**
   * Collapse directory item
   */
  const collapseItem = useCallback(() => {
    if (!selectedItem || selectedItem.type !== 'directory') return;

    if (selectedItem.isExpanded && onCollapse) {
      onCollapse(selectedItem, selectedIndex);
    }
  }, [selectedItem, selectedIndex, onCollapse]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectNext();
        break;

      case 'ArrowUp':
        event.preventDefault();
        selectPrevious();
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (selectedItem?.type === 'directory') {
          expandItem();
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (selectedItem?.type === 'file') {
          // File selected: collapse parent folder and select it
          if (onCollapseAndSelectParent) {
            onCollapseAndSelectParent(selectedItem, selectedIndex);
          }
        } else if (selectedItem?.type === 'directory') {
          if (selectedItem.isExpanded) {
            // Expanded folder: collapse it
            collapseItem();
          } else {
            // Collapsed folder: collapse parent folder and select it
            if (onCollapseAndSelectParent) {
              onCollapseAndSelectParent(selectedItem, selectedIndex);
            }
          }
        }
        break;

      case ' ':
      case 'Spacebar':
        event.preventDefault();
        if (onTogglePlay) {
          onTogglePlay();
        }
        break;

      case '1':
      case '2':
      case '3':
        event.preventDefault();
        // Only allow rating for file items
        if (selectedItem?.type === 'file' && onRating) {
          const rating = parseInt(event.key, 10);
          onRating(selectedItem, selectedIndex, rating);
        }
        break;

      case 'Enter':
        event.preventDefault();
        // Only allow editing description for file items
        if (selectedItem?.type === 'file' && onEnterEdit) {
          onEnterEdit(selectedItem, selectedIndex);
        }
        break;

      default:
        break;
    }
  }, [enabled, selectNext, selectPrevious, expandItem, collapseItem, selectedItem, selectedIndex, onTogglePlay, onRating, onCollapseAndSelectParent, onEnterEdit]);

  /**
   * Attach keyboard event listener
   */
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  /**
   * Reset selection when items change
   */
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  return {
    selectedIndex,
    selectedItem,
    handleKeyDown,
    selectNext,
    selectPrevious,
    selectItem,
    toggleExpand,
    expandItem,
    collapseItem,
  };
}
