import { useState, useCallback, useMemo, useEffect } from 'react';
import { DirectoryTree, DirectoryNode } from '../../shared/types';
import { audioBrowserAPI } from '../services/api';
import {
  useAudioPlayer,
  useKeyboardNavigation,
  NavigationItem,
} from '../hooks';
import { useAudioMetadataContext } from '../contexts/AudioMetadataContext';
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
  const audioMetadata = useAudioMetadataContext();
  const toast = useToastContext();

  /**
   * Flatten directory tree into a list for rendering and navigation
   * When forceExpand is true, ignores expandedPaths and expands everything
   */
  const flattenTree = useCallback(
    (node: DirectoryNode, level: number = 0, parentPath?: string, forceExpand: boolean = false): FlatTreeItem[] => {
      const items: FlatTreeItem[] = [];

      // Add directory itself
      const isExpanded = forceExpand || expandedPaths.has(node.path);
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
          items.push(...flattenTree(subdir, level + 1, node.path, forceExpand));
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
   * Check if an item matches the filter criteria
   */
  const itemMatchesFilter = useCallback(
    (item: FlatTreeItem): boolean => {
      const { text, rating } = filterCriteria;

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
    },
    [filterCriteria, audioMetadata]
  );

  /**
   * Get all parent paths for a given path
   */
  const getParentPaths = useCallback((path: string): string[] => {
    const parents: string[] = [];
    let currentPath = path;
    
    // Walk up the tree by removing the last segment
    while (currentPath) {
      const lastSlash = currentPath.lastIndexOf('/');
      if (lastSlash === -1) break;
      
      currentPath = currentPath.substring(0, lastSlash);
      if (currentPath) {
        parents.push(currentPath);
      }
    }
    
    return parents;
  }, []);

  /**
   * Check if a directory should be included (it or any descendant matches)
   */
  const shouldIncludeDirectory = useCallback(
    (node: DirectoryNode, allItems: FlatTreeItem[]): boolean => {
      // Check if directory itself matches
      const dirItem = allItems.find(
        (item) => item.type === 'directory' && item.directory?.path === node.path
      );
      if (dirItem && itemMatchesFilter(dirItem)) {
        return true;
      }

      // Check if any file in this directory matches
      const hasMatchingFile = allItems.some(
        (item) =>
          item.type === 'file' &&
          item.file &&
          item.parentPath === node.path &&
          itemMatchesFilter(item)
      );
      if (hasMatchingFile) {
        return true;
      }

      // Check if any subdirectory should be included
      return node.subdirectories.some((subdir) => shouldIncludeDirectory(subdir, allItems));
    },
    [itemMatchesFilter]
  );

  /**
   * Get flattened and filtered items for display
   */
  const displayItems = useMemo(() => {
    if (!directoryTree) return [];

    const { text, rating } = filterCriteria;

    // No filters applied - use normal expansion state
    if (!text && rating === null) {
      return flattenTree(directoryTree);
    }

    // Filters applied - need to filter from all items and auto-expand parents
    
    // Step 1: Flatten entire tree to get all items
    const allItems = flattenTree(directoryTree, 0, undefined, true);

    // Step 2: Find all matching items and collect paths to expand
    const pathsToExpand = new Set<string>();
    const matchingFilePaths = new Set<string>();
    const matchingDirPaths = new Set<string>();

    allItems.forEach((item) => {
      if (itemMatchesFilter(item)) {
        if (item.type === 'file' && item.file) {
          matchingFilePaths.add(item.file.path);
          // Add all parent paths to expansion set
          if (item.parentPath) {
            getParentPaths(item.parentPath).forEach((p) => pathsToExpand.add(p));
            pathsToExpand.add(item.parentPath);
          }
        } else if (item.type === 'directory' && item.directory) {
          matchingDirPaths.add(item.directory.path);
          // Add all parent paths to expansion set
          getParentPaths(item.directory.path).forEach((p) => pathsToExpand.add(p));
        }
      }
    });

    // Step 3: Build filtered tree with proper expansion
    const buildFilteredTree = (
      node: DirectoryNode,
      level: number = 0,
      parentPath?: string
    ): FlatTreeItem[] => {
      const items: FlatTreeItem[] = [];

      // Check if this directory or any descendant matches
      const dirMatches = matchingDirPaths.has(node.path);
      const shouldInclude = dirMatches || shouldIncludeDirectory(node, allItems);

      if (!shouldInclude) {
        return items;
      }

      // Add directory itself
      const shouldExpand = pathsToExpand.has(node.path) || dirMatches;
      items.push({
        id: `dir-${node.path}`,
        type: 'directory',
        isExpanded: shouldExpand,
        directory: node,
        level,
        parentPath,
      });

      // If directory matches, show all its contents
      if (dirMatches) {
        // Add all subdirectories
        node.subdirectories.forEach((subdir) => {
          items.push(...flattenTree(subdir, level + 1, node.path, true));
        });

        // Add all files
        node.files.forEach((file) => {
          items.push({
            id: `file-${file.path}`,
            type: 'file',
            file,
            level: level + 1,
            parentPath: node.path,
          });
        });
      } else if (shouldExpand) {
        // Only show matching subdirectories and files
        node.subdirectories.forEach((subdir) => {
          items.push(...buildFilteredTree(subdir, level + 1, node.path));
        });

        node.files.forEach((file) => {
          if (matchingFilePaths.has(file.path)) {
            items.push({
              id: `file-${file.path}`,
              type: 'file',
              file,
              level: level + 1,
              parentPath: node.path,
            });
          }
        });
      }

      return items;
    };

    return buildFilteredTree(directoryTree);
  }, [directoryTree, filterCriteria, flattenTree, itemMatchesFilter, getParentPaths, shouldIncludeDirectory]);

  /**
   * Count only audio files (not directories) in filtered results
   */
  const filteredFileCount = useMemo(() => {
    return displayItems.filter((item) => item.type === 'file').length;
  }, [displayItems]);

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
          // Success: no message needed
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update rating';
          toast.error(`Rating update failed: ${errorMessage}`);
        }
      }
    },
    [displayItems, audioMetadata, toast]
  );

  /**
   * Handle Enter key to edit description
   */
  const handleEnterEdit = useCallback(
    (_item: NavigationItem, index: number) => {
      const displayItem = displayItems[index];

      // Only allow editing description for files
      if (displayItem.type === 'file' && displayItem.file) {
        // Trigger edit mode by dispatching a custom event
        // The DescriptionField component will listen for this event
        const event = new CustomEvent('trigger-description-edit', {
          detail: { filePath: displayItem.file.path },
        });
        window.dispatchEvent(event);
      }
    },
    [displayItems]
  );

  // Keyboard navigation
  const navigation = useKeyboardNavigation({
    items: navigationItems,
    onSelect: handleSelect,
    onTogglePlay: handleTogglePlay,
    onStop: audioPlayer.stop,
    onExpand: handleExpand,
    onCollapse: handleCollapse,
    onCollapseAndSelectParent: handleCollapseAndSelectParent,
    onRating: handleRating,
    onEnterEdit: handleEnterEdit,
    enabled: true,
  });

  /**
   * Handle description edit start
   */
  const handleEditStart = useCallback(() => {
    navigation.setEditingDescription(true);
  }, [navigation]);

  /**
   * Handle description edit complete
   */
  const handleEditComplete = useCallback(() => {
    navigation.setEditingDescription(false);
  }, [navigation]);

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
        
        // Success: no message needed
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
          resultCount: filteredFileCount,
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
            itemHeight={32}
            onEditStart={handleEditStart}
            onEditComplete={handleEditComplete}
          />
        )}
      </div>

    </div>
  );
}
