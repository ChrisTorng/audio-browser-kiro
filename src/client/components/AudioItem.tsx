import { useCallback, useMemo, useEffect, memo } from 'react';
import { AudioFile } from '../../shared/types';
import { useAudioMetadata, useAudioPlayer, useLazyVisualization } from '../hooks';
import { StarRating } from './StarRating';
import { WaveformDisplay } from './WaveformDisplay';
import { SpectrogramDisplay } from './SpectrogramDisplay';
import { DescriptionField } from './DescriptionField';

/**
 * AudioItem component props
 */
export interface AudioItemProps {
  file: AudioFile;
  isSelected: boolean;
  isVisible: boolean;
  level: number;
  filterText?: string;
  onClick: () => void;
  audioProgress?: number; // 0-1, only provided for selected playing item
}

/**
 * AudioItem component
 * Displays a single audio file in a compact single-line layout
 * Layout: StarRating | Filename | Waveform | Spectrogram | Description
 */
export const AudioItem = memo(function AudioItem({
  file,
  isSelected,
  isVisible,
  level,
  filterText = '',
  onClick,
  audioProgress = 0,
}: AudioItemProps) {
  // Hooks
  const audioMetadata = useAudioMetadata();
  
  // Use lazy visualization hook for on-demand loading
  // Memoize options to prevent unnecessary re-initialization
  const visualizationOptions = useMemo(() => ({
    waveformWidth: 200,
    spectrogramWidth: 200,
    spectrogramHeight: 28,
    priority: 'both' as const,
  }), []);
  
  const visualization = useLazyVisualization(visualizationOptions);

  // Get metadata for this file
  const metadata = useMemo(() => {
    return audioMetadata.getMetadata(file.path);
  }, [audioMetadata, file.path]);

  const rating = metadata?.rating || 0;
  const description = metadata?.description || '';

  /**
   * Load visualizations when item becomes visible
   * This enables lazy loading and on-demand generation
   */
  useEffect(() => {
    if (isVisible) {
      const audioUrl = `/api/audio/${encodeURIComponent(file.path)}`;
      visualization.loadVisualization(file.path, audioUrl);
    } else {
      // Clear visualization when not visible to save memory
      visualization.clearVisualization();
    }
  }, [isVisible, file.path, visualization.loadVisualization, visualization.clearVisualization]);

  // Memoize visualization data to prevent unnecessary re-renders
  const waveformData = useMemo(() => visualization.waveformData, [visualization.waveformData]);
  const spectrogramData = useMemo(() => visualization.spectrogramData, [visualization.spectrogramData]);
  const visualizationError = useMemo(() => visualization.error, [visualization.error]);
  const visualizationLoading = useMemo(() => visualization.isLoading, [visualization.isLoading]);

  /**
   * Handle rating change
   */
  const handleRatingChange = useCallback(
    async (newRating: number) => {
      try {
        await audioMetadata.updateRating(file.path, newRating);
      } catch (error) {
        console.error('Failed to update rating:', error);
      }
    },
    [audioMetadata, file.path]
  );

  /**
   * Handle description change
   */
  const handleDescriptionChange = useCallback(
    async (newDescription: string) => {
      try {
        await audioMetadata.updateDescription(file.path, newDescription);
      } catch (error) {
        console.error('Failed to update description:', error);
      }
    },
    [audioMetadata, file.path]
  );

  // Use the progress passed from parent (only non-zero for selected playing item)
  const progress = audioProgress;

  return (
    <div
      className={`audio-item ${isSelected ? 'audio-item--selected' : ''}`}
      onClick={onClick}
      style={{ paddingLeft: `${level * 20}px` }}
    >
      <div className="audio-item__content">
        {/* Star Rating */}
        <div className="audio-item__rating">
          <StarRating 
            rating={rating} 
            onChange={handleRatingChange}
            disabled={!isSelected}
          />
        </div>

        {/* Filename */}
        <div className="audio-item__filename">
          {highlightText(file.name, filterText)}
        </div>

        {/* Waveform */}
        <div className="audio-item__waveform">
          <WaveformDisplay
            waveformData={waveformData}
            progress={progress}
            width={200}
            height={28}
            isLoading={visualizationLoading}
            error={visualizationError}
          />
        </div>

        {/* Spectrogram */}
        <div className="audio-item__spectrogram">
          <SpectrogramDisplay
            spectrogramData={spectrogramData}
            progress={progress}
            width={200}
            height={28}
            isLoading={visualizationLoading}
            error={visualizationError}
          />
        </div>

        {/* Description */}
        <div className="audio-item__description">
          <DescriptionField
            description={description}
            onChange={handleDescriptionChange}
            filterText={filterText}
            placeholder="Add description..."
            filePath={file.path}
            disabled={!isSelected}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Only re-render if these props change
  
  // If selection state changed, always re-render
  if (prevProps.isSelected !== nextProps.isSelected) {
    return false;
  }
  
  // If selected, check if progress changed (allow re-render for progress updates)
  if (nextProps.isSelected && prevProps.audioProgress !== nextProps.audioProgress) {
    return false;
  }
  
  // Check other props
  return (
    prevProps.file.path === nextProps.file.path &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.level === nextProps.level &&
    prevProps.filterText === nextProps.filterText
  );
});

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
      <mark key={`mark-${index}`} className="audio-item__highlight">
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
