import { useState, useCallback, useEffect, useRef } from 'react';

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
  isEditingDescription: boolean;
  handleKeyDown: (event: KeyboardEvent) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  selectItem: (index: number) => void;
  toggleExpand: () => void;
  expandItem: () => void;
  collapseItem: () => void;
  setEditingDescription: (isEditing: boolean) => void;
}

/**
 * Keyboard navigation options
 */
export interface UseKeyboardNavigationOptions {
  items: NavigationItem[];
  onSelect?: (item: NavigationItem, index: number) => void;
  onTogglePlay?: () => void;
  onStop?: () => void;
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
    onStop,
    onExpand,
    onCollapse,
    onCollapseAndSelectParent,
    onRating,
    onEnterEdit,
    enabled = true,
  } = options;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // Get currently selected item
  const selectedItem = items[selectedIndex] || null;
  
  // Track previous item type to detect file -> directory transitions
  const prevItemTypeRef = useRef<'file' | 'directory' | null>(null);

  /**
   * Set editing description state
   */
  const setEditingDescription = useCallback((isEditing: boolean) => {
    setIsEditingDescription(isEditing);
  }, []);

  /**
   * Select next item in the list
   */
  const selectNext = useCallback(() => {
    if (items.length === 0) return;

    const nextIndex = Math.min(selectedIndex + 1, items.length - 1);
    const nextItem = items[nextIndex];
    
    // Stop playback if moving from file to directory
    if (prevItemTypeRef.current === 'file' && nextItem?.type === 'directory' && onStop) {
      onStop();
    }
    
    setSelectedIndex(nextIndex);

    if (onSelect && nextItem) {
      onSelect(nextItem, nextIndex);
    }
    
    // Update previous item type
    prevItemTypeRef.current = nextItem?.type || null;
  }, [selectedIndex, items, onSelect, onStop]);

  /**
   * Select previous item in the list
   */
  const selectPrevious = useCallback(() => {
    if (items.length === 0) return;

    const prevIndex = Math.max(selectedIndex - 1, 0);
    const prevItem = items[prevIndex];
    
    // Stop playback if moving from file to directory
    if (prevItemTypeRef.current === 'file' && prevItem?.type === 'directory' && onStop) {
      onStop();
    }
    
    setSelectedIndex(prevIndex);

    if (onSelect && prevItem) {
      onSelect(prevItem, prevIndex);
    }
    
    // Update previous item type
    prevItemTypeRef.current = prevItem?.type || null;
  }, [selectedIndex, items, onSelect, onStop]);

  /**
   * Select item by index
   */
  const selectItem = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return;

    const item = items[index];
    
    // Stop playback if moving from file to directory
    if (prevItemTypeRef.current === 'file' && item?.type === 'directory' && onStop) {
      onStop();
    }
    
    setSelectedIndex(index);

    if (onSelect && item) {
      onSelect(item, index);
    }
    
    // Update previous item type
    prevItemTypeRef.current = item?.type || null;
  }, [items, onSelect, onStop]);

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

    // When editing description, disable special key functions
    // Allow normal input behavior for space, arrows, and other keys
    if (isEditingDescription) {
      // Only handle Escape and Enter keys during editing
      // These are handled by DescriptionField component itself
      return;
    }

    // Check if focus is on an input element (e.g., FilterBar input, textarea)
    // If so, allow normal input behavior and don't handle navigation keys
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.getAttribute('contenteditable') === 'true'
    );

    if (isInputFocused) {
      // Don't intercept keyboard events when user is typing in an input field
      return;
    }

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
  }, [enabled, isEditingDescription, selectNext, selectPrevious, expandItem, collapseItem, selectedItem, selectedIndex, onTogglePlay, onRating, onCollapseAndSelectParent, onEnterEdit]);

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
    isEditingDescription,
    handleKeyDown,
    selectNext,
    selectPrevious,
    selectItem,
    toggleExpand,
    expandItem,
    collapseItem,
    setEditingDescription,
  };
}
