import { useState, useCallback, useMemo, useEffect } from 'react';
import { DirectoryTree, DirectoryNode } from '../../shared/types';
import { audioBrowserAPI } from '../services/api';
import {
  useAudioPlayer,
  useKeyboardNavigation,
  useAudioMetadata,
  NavigationItem,
} from '../hooks';
import { FilterCriteria } from './FilterBar';
import { Header } from './Header';
import { AudioTree, TreeItem } from './AudioTree';
import { LoadingSpinner } from './LoadingSpinner';
import { useToastContext } from '../contexts/ToastContext';

/**
 * Flattened tree item for rendering (extends TreeItem for compatibility)
 */
interface FlatTreeItem extends TreeItem, NavigationItem {
  parentPath?: string;
}

/**
 * AudioBrowser main component
 * Manages global state, keyboard navigation, and integrates all sub-components
 */
export function AudioBrowser() {
  // Global state
  const [directoryTree, setDirectoryTree] = useState<DirectoryTree | null>(null);
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    text: '',
    rating: null,
  });
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Hooks
  const audioPlayer = useAudioPlayer();
  const audioMetadata = useAudioMetadata();
  const toast = useToastContext();

  /**
   * Flatten directory tree into a list for rendering and navigation
   */
  const flattenTree = useCallback(
    (node: DirectoryNode, level: number = 0, parentPath?: string): FlatTreeItem[] => {
      const items: FlatTreeItem[] = [];

      // Add directory itself
      const isExpanded = expandedPaths.has(node.path);
      items.push({
        id: `dir-${node.path}`,
        type: 'directory',
        isExpanded,
        directory: node,
        level,
        parentPath,
      });

      // If expanded, add children
      if (isExpanded) {
        // Add subdirectories
        node.subdirectories.forEach((subdir) => {
          items.push(...flattenTree(subdir, level + 1, node.path));
        });

        // Add files
        node.files.forEach((file) => {
          items.push({
            id: `file-${file.path}`,
            type: 'file',
            file,
            level: level + 1,
            parentPath: node.path,
          });
        });
      }

      return items;
    },
    [expandedPaths]
  );

  /**
   * Apply filters to flattened items
   */
  const applyFilters = useCallback(
    (items: FlatTreeItem[]): FlatTreeItem[] => {
      const { text, rating } = filterCriteria;

      // No filters applied
      if (!text && rating === null) {
        return items;
      }

      return items.filter((item) => {
        // For directories, check if name matches text filter
        if (item.type === 'directory' && item.directory) {
          if (text && !item.directory.name.toLowerCase().includes(text.toLowerCase())) {
            return false;
          }
          return true;
        }

        // For files, check text and rating filters
        if (item.type === 'file' && item.file) {
          const file = item.file;
          const meta = audioMetadata.getMetadata(file.path);

          // Text filter: check file name and description
          if (text) {
            const textLower = text.toLowerCase();
            const nameMatch = file.name.toLowerCase().includes(textLower);
            const descMatch = meta?.description.toLowerCase().includes(textLower) || false;

            if (!nameMatch && !descMatch) {
              return false;
            }
          }

          // Rating filter
          if (rating !== null) {
            const fileRating = meta?.rating || 0;
            if (fileRating !== rating) {
              return false;
            }
          }

          return true;
        }

        return true;
      });
    },
    [filterCriteria, audioMetadata]
  );

  /**
   * Get flattened and filtered items for display
   */
  const displayItems = useMemo(() => {
    if (!directoryTree) return [];

    const flattened = flattenTree(directoryTree);
    return applyFilters(flattened);
  }, [directoryTree, flattenTree, applyFilters]);

  /**
   * Convert display items to navigation items
   */
  const navigationItems: NavigationItem[] = useMemo(() => {
    return displayItems.map((item) => ({
      id: item.id,
      type: item.type,
      isExpanded: item.isExpanded,
    }));
  }, [displayItems]);

  /**
   * Handle item selection
   */
  const handleSelect = useCallback(
    (_item: NavigationItem, index: number) => {
      const displayItem = displayItems[index];

      // If it's a file, start playing
      if (displayItem.type === 'file' && displayItem.file) {
        const audioUrl = `/api/audio/${encodeURIComponent(displayItem.file.path)}`;
        audioPlayer.play(audioUrl);
      }
    },
    [displayItems, audioPlayer]
  );

  /**
   * Handle expand directory
   */
  const handleExpand = useCallback(
    (_item: NavigationItem, index: number) => {
      const displayItem = displayItems[index];

      if (displayItem.type === 'directory' && displayItem.directory) {
        setExpandedPaths((prev) => new Set(prev).add(displayItem.directory!.path));
      }
    },
    [displayItems]
  );

  /**
   * Handle collapse directory
   */
  const handleCollapse = useCallback(
    (_item: NavigationItem, index: number) => {
      const displayItem = displayItems[index];

      if (displayItem.type === 'directory' && displayItem.directory) {
        setExpandedPaths((prev) => {
          const newSet = new Set(prev);
          newSet.delete(displayItem.directory!.path);
          return newSet;
        });
      }
    },
    [displayItems]
  );

  /**
   * Handle collapse and select parent
   * Used for left arrow key navigation
   */
  const [pendingParentSelection, setPendingParentSelection] = useState<number | null>(null);
  
  const handleCollapseAndSelectParent = useCallback(
    (_item: NavigationItem, index: number) => {
      const displayItem = displayItems[index];
      
      if (!displayItem.parentPath) {
        // No parent, do nothing
        return;
      }

      // Find parent directory in display items
      const parentIndex = displayItems.findIndex(
        (item) => item.type === 'directory' && item.directory?.path === displayItem.parentPath
      );

      if (parentIndex === -1) {
        // Parent not found in display items, do nothing
        return;
      }

      // Collapse the parent directory
      setExpandedPaths((prev) => {
        const newSet = new Set(prev);
        newSet.delete(displayItem.parentPath!);
        return newSet;
      });

      // Mark parent for selection after re-render
      setPendingParentSelection(parentIndex);
    },
    [displayItems]
  );

  /**
   * Handle toggle play/stop
   */
  const handleTogglePlay = useCallback(() => {
    audioPlayer.toggle();
  }, [audioPlayer]);

  /**
   * Handle rating update via keyboard
   */
  const handleRating = useCallback(
    async (_item: NavigationItem, index: number, rating: number) => {
      const displayItem = displayItems[index];

      // Only allow rating for files
      if (displayItem.type === 'file' && displayItem.file) {
        try {
          await audioMetadata.updateRating(displayItem.file.path, rating);
          toast.success(`Rating updated to ${rating} star${rating !== 1 ? 's' : ''}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update rating';
          toast.error(`Rating update failed: ${errorMessage}`);
        }
      }
    },
    [displayItems, audioMetadata, toast]
  );

  // Keyboard navigation
  const navigation = useKeyboardNavigation({
    items: navigationItems,
    onSelect: handleSelect,
    onTogglePlay: handleTogglePlay,
    onExpand: handleExpand,
    onCollapse: handleCollapse,
    onCollapseAndSelectParent: handleCollapseAndSelectParent,
    onRating: handleRating,
    enabled: true,
  });

  /**
   * Handle pending parent selection after collapse
   */
  useEffect(() => {
    if (pendingParentSelection !== null) {
      navigation.selectItem(pendingParentSelection);
      setPendingParentSelection(null);
    }
  }, [pendingParentSelection, navigation]);

  /**
   * Load directory tree on mount
   * The backend scans the directory on startup, we just fetch the cached result
   */
  useEffect(() => {
    const loadTree = async () => {
      setIsLoading(true);

      try {
        const tree = await audioBrowserAPI.getTree();
        
        // Validate tree structure
        if (!tree || typeof tree !== 'object') {
          throw new Error('Invalid tree structure received from server');
        }
        
        setDirectoryTree(tree);
        
        // Expand root by default
        if (tree.path) {
          setExpandedPaths(new Set([tree.path]));
        }
        
        toast.success('Audio directory loaded successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load audio directory';
        toast.error(`Load failed: ${errorMessage}`);
        console.error('Load error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  /**
   * Update filter criteria
   */
  const handleFilterChange = useCallback((criteria: Partial<FilterCriteria>) => {
    setFilterCriteria((prev) => ({ ...prev, ...criteria }));
  }, []);

  return (
    <div className="audio-browser">
      {/* Header with title and filter bar */}
      <Header
        filterBarProps={{
          filterCriteria,
          onFilterChange: handleFilterChange,
          resultCount: displayItems.length,
        }}
      />

      {/* Audio tree */}
      <div className="audio-browser__tree">
        {isLoading && (
          <LoadingSpinner size="large" message="Loading audio directory..." />
        )}
        
        {audioMetadata.isLoading && !isLoading && (
          <LoadingSpinner size="medium" message="Loading metadata..." />
        )}
        
        {displayItems.length === 0 && !isLoading && !audioMetadata.isLoading && directoryTree && (
          <div className="audio-browser__empty">
            No items match the current filters
          </div>
        )}

        {displayItems.length === 0 && !isLoading && !audioMetadata.isLoading && !directoryTree && (
          <div className="audio-browser__empty">
            Failed to load audio directory. Please check server configuration.
          </div>
        )}

        {displayItems.length > 0 && !isLoading && (
          <AudioTree
            items={displayItems}
            selectedIndex={navigation.selectedIndex}
            onItemClick={(index) => navigation.selectItem(index)}
            onExpandToggle={(index) => {
              const item = displayItems[index];
              if (!item) return; // Guard against undefined items
              
              if (item.isExpanded) {
                handleCollapse(navigationItems[index], index);
              } else {
                handleExpand(navigationItems[index], index);
              }
            }}
            filterText={filterCriteria.text}
            height={600}
            itemHeight={40}
          />
        )}
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="audio-browser__debug">
          <p>Selected: {navigation.selectedIndex}</p>
          <p>Playing: {audioPlayer.isPlaying ? 'Yes' : 'No'}</p>
          <p>Progress: {Math.round(audioPlayer.progress * 100)}%</p>
        </div>
      )}
    </div>
  );
}
