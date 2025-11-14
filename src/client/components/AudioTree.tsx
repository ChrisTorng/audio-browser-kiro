import { useRef, useEffect, useCallback } from 'react';
import { List } from 'react-window';
import { AudioFile, DirectoryNode } from '../../shared/types';
import { useVirtualScrollOptimization } from '../hooks/useVirtualScrollOptimization';
import { AudioItem } from './AudioItem';

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
  audioProgress?: number; // 0-1, progress of currently playing audio
  onEditStart?: () => void;
  onEditComplete?: () => void;
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
  audioProgress = 0,
  onEditStart,
  onEditComplete,
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
    (props: { scrollOffset: number; scrollUpdateWasRequested: boolean }) => {
      virtualScroll.updateScrollPosition(props.scrollOffset);
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
      listRef.current.scrollToRow({ index: selectedIndex, align: 'smart' });
    }
  }, [selectedIndex, items.length]);

  /**
   * Row component for react-window v2
   */
  const RowComponent = useCallback(
    ({
      index,
      style,
      ariaAttributes,
    }: {
      index: number;
      style: React.CSSProperties;
      ariaAttributes: {
        'aria-posinset': number;
        'aria-setsize': number;
        role: 'listitem';
      };
    }) => {
      // Guard: Return empty div if style is invalid or index out of bounds
      if (!style || index < 0 || index >= items.length) {
        return <div style={style || {}} {...ariaAttributes} />;
      }

      const item = items[index];
      
      // Guard: Return empty div if item doesn't exist
      if (!item) {
        return <div style={style} {...ariaAttributes} />;
      }

      const isSelected = index === selectedIndex;
      const isInOverscan = virtualScroll.isItemInOverscan(index);

      // For file items, render AudioItem directly
      if (item.type === 'file' && item.file) {
        return (
          <div style={style} {...ariaAttributes}>
            <AudioItem
              file={item.file}
              isSelected={isSelected}
              isVisible={isInOverscan}
              level={item.level}
              filterText={filterText}
              onClick={() => onItemClick(index)}
              audioProgress={isSelected ? audioProgress : 0}
              onEditStart={onEditStart}
              onEditComplete={onEditComplete}
            />
          </div>
        );
      }

      // For directory items, render directory UI
      return (
        <div
          style={style}
          className={`audio-tree__item ${isSelected ? 'audio-tree__item--selected' : ''}`}
          onClick={() => {
            onItemClick(index);
            onExpandToggle(index);
          }}
          {...ariaAttributes}
        >
          <div
            className="audio-tree__item-content"
            style={{ paddingLeft: `${item.level * 20}px` }}
          >
            {item.type === 'directory' && item.directory && (
              <div className="audio-tree__directory">
                <span className="audio-tree__expand-icon">
                  {item.isExpanded ? '▼' : '▶'}
                </span>
                <span className="audio-tree__directory-name">
                  {highlightText(item.directory.name, filterText)}
                </span>
                <span className="audio-tree__directory-count">
                  {item.directory.totalFileCount}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    },
    [items, selectedIndex, onItemClick, onExpandToggle, filterText, virtualScroll, audioProgress, onEditStart, onEditComplete]
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
        listRef={listRef}
        rowComponent={RowComponent}
        rowCount={items.length}
        rowHeight={itemHeight}
        defaultHeight={height}
        overscanCount={5}
        rowProps={{}}
      />
    </div>
  );
}
