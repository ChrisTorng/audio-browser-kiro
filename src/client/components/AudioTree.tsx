import { useRef, useEffect, useCallback } from 'react';
import { List } from 'react-window';
import { AudioFile, DirectoryNode } from '../../shared/types';
import { useVirtualScrollOptimization } from '../hooks/useVirtualScrollOptimization';

/**
 * Tree item type for rendering
 */
export interface TreeItem {
  id: string;
  type: 'directory' | 'file';
  level: number;
  isExpanded?: boolean;
  directory?: DirectoryNode;
  file?: AudioFile;
  parentPath?: string;
}

/**
 * AudioTree component props
 */
export interface AudioTreeProps {
  items: TreeItem[];
  selectedIndex: number;
  onItemClick: (index: number) => void;
  onExpandToggle: (index: number) => void;
  filterText?: string;
  height?: number;
  itemHeight?: number;
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
}

/**
 * Highlight text matching the filter
 */
function highlightText(text: string, filter: string): JSX.Element {
  if (!filter) {
    return <>{text}</>;
  }

  const parts: JSX.Element[] = [];
  const lowerText = text.toLowerCase();
  const lowerFilter = filter.toLowerCase();
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerFilter);

  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, index)}</span>);
    }

    // Add highlighted match
    parts.push(
      <mark key={`mark-${index}`} className="audio-tree__highlight">
        {text.substring(index, index + filter.length)}
      </mark>
    );

    lastIndex = index + filter.length;
    index = lowerText.indexOf(lowerFilter, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

/**
 * AudioTree component
 * Displays audio files and directories in a tree structure with virtual scrolling
 */
export function AudioTree({
  items,
  selectedIndex,
  onItemClick,
  onExpandToggle,
  filterText = '',
  height = 600,
  itemHeight = 40,
  onVisibleRangeChange,
}: AudioTreeProps) {
  const listRef = useRef<any>(null);

  // Virtual scroll optimization
  const virtualScroll = useVirtualScrollOptimization({
    itemCount: items.length,
    itemHeight,
    containerHeight: height,
    overscanCount: 5,
  });

  /**
   * Handle scroll events
   */
  const handleScroll = useCallback(
    ({ scrollOffset }: { scrollOffset: number }) => {
      virtualScroll.updateScrollPosition(scrollOffset);
    },
    [virtualScroll]
  );

  /**
   * Notify parent of visible range changes
   */
  useEffect(() => {
    if (onVisibleRangeChange) {
      const { overscanStartIndex, overscanEndIndex } = virtualScroll.visibleRange;
      onVisibleRangeChange(overscanStartIndex, overscanEndIndex);
    }
  }, [virtualScroll.visibleRange, onVisibleRangeChange]);

  /**
   * Scroll to selected item when selection changes
   */
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0 && selectedIndex < items.length) {
      listRef.current.scrollToItem(selectedIndex, 'smart');
    }
  }, [selectedIndex, items.length]);

  /**
   * Render a single tree item
   * Optimized to only render items in visible range
   */
  const renderRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = items[index];
      
      // Guard: Return empty div if item doesn't exist
      if (!item) {
        return <div style={style} />;
      }

      const isSelected = index === selectedIndex;
      const isInOverscan = virtualScroll.isItemInOverscan(index);

      // Skip rendering if not in overscan range (performance optimization)
      if (!isInOverscan) {
        return <div style={style} />;
      }

      return (
        <div
          style={style}
          className={`audio-tree__item ${isSelected ? 'audio-tree__item--selected' : ''}`}
          onClick={() => onItemClick(index)}
        >
          <div
            className="audio-tree__item-content"
            style={{ paddingLeft: `${item.level * 20}px` }}
          >
            {item.type === 'directory' && item.directory && (
              <div className="audio-tree__directory">
                <button
                  className="audio-tree__expand-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpandToggle(index);
                  }}
                  aria-label={item.isExpanded ? 'Collapse' : 'Expand'}
                >
                  <span className="audio-tree__expand-icon">
                    {item.isExpanded ? '▼' : '▶'}
                  </span>
                </button>
                <span className="audio-tree__directory-name">
                  {highlightText(item.directory.name, filterText)}
                </span>
                <span className="audio-tree__directory-count">
                  ({item.directory.files.length} files)
                </span>
              </div>
            )}

            {item.type === 'file' && item.file && (
              <div className="audio-tree__file">
                <span className="audio-tree__file-icon">🎵</span>
                <span className="audio-tree__file-name">
                  {highlightText(item.file.name, filterText)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    },
    [items, selectedIndex, onItemClick, onExpandToggle, filterText, virtualScroll]
  );

  if (items.length === 0) {
    return (
      <div className="audio-tree audio-tree--empty">
        <p>No items to display</p>
      </div>
    );
  }

  return (
    <div className="audio-tree">
      <List
        ref={listRef}
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        width="100%"
        onScroll={handleScroll}
        overscanCount={5}
      >
        {renderRow}
      </List>
    </div>
  );
}
