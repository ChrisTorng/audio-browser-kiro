import { useState, useCallback, useMemo } from 'react';
import { DirectoryTree, AudioFile, DirectoryNode } from '../../shared/types';
import { audioBrowserAPI } from '../services/api';
import {
  useAudioPlayer,
  useKeyboardNavigation,
  useAudioMetadata,
  NavigationItem,
} from '../hooks';
import { FilterBar, FilterCriteria } from './FilterBar';
import { AudioTree, TreeItem } from './AudioTree';

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
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [rootPath, setRootPath] = useState<string>('');

  // Hooks
  const audioPlayer = useAudioPlayer();
  const audioMetadata = useAudioMetadata();

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
   * Handle toggle play/stop
   */
  const handleTogglePlay = useCallback(() => {
    audioPlayer.toggle();
  }, [audioPlayer]);

  // Keyboard navigation
  const navigation = useKeyboardNavigation({
    items: navigationItems,
    onSelect: handleSelect,
    onTogglePlay: handleTogglePlay,
    onExpand: handleExpand,
    onCollapse: handleCollapse,
    enabled: true,
  });

  /**
   * Scan directory
   */
  const handleScan = useCallback(async (path: string) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const tree = await audioBrowserAPI.scanDirectory(path);
      setDirectoryTree(tree);
      setRootPath(path);
      
      // Expand root by default
      setExpandedPaths(new Set([tree.path]));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan directory';
      setScanError(errorMessage);
      console.error('Scan error:', error);
    } finally {
      setIsScanning(false);
    }
  }, []);

  /**
   * Update filter criteria
   */
  const handleFilterChange = useCallback((criteria: Partial<FilterCriteria>) => {
    setFilterCriteria((prev) => ({ ...prev, ...criteria }));
  }, []);

  return (
    <div className="audio-browser">
      <div className="audio-browser__header">
        <h1>Audio Browser</h1>
        
        {/* Scan controls */}
        <div className="audio-browser__scan">
          <input
            type="text"
            placeholder="Enter directory path..."
            value={rootPath}
            onChange={(e) => setRootPath(e.target.value)}
            disabled={isScanning}
          />
          <button onClick={() => handleScan(rootPath)} disabled={isScanning || !rootPath}>
            {isScanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        {scanError && (
          <div className="audio-browser__error">
            Error: {scanError}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <FilterBar
        filterCriteria={filterCriteria}
        onFilterChange={handleFilterChange}
        resultCount={displayItems.length}
      />

      {/* Audio tree */}
      <div className="audio-browser__tree">
        {audioMetadata.isLoading && <div>Loading metadata...</div>}
        
        {displayItems.length === 0 && !isScanning && directoryTree && (
          <div className="audio-browser__empty">
            No items match the current filters
          </div>
        )}

        {displayItems.length === 0 && !isScanning && !directoryTree && (
          <div className="audio-browser__empty">
            Enter a directory path and click Scan to begin
          </div>
        )}

        {displayItems.length > 0 && (
          <AudioTree
            items={displayItems}
            selectedIndex={navigation.selectedIndex}
            onItemClick={(index) => navigation.selectItem(index)}
            onExpandToggle={(index) => {
              const item = displayItems[index];
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
