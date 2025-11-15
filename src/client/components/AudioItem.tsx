import { useCallback, useMemo, useEffect, memo } from 'react';
import { AudioFile } from '../../shared/types';
import { useAudioPlayer, useLazyVisualization } from '../hooks';
import { useAudioMetadataContext } from '../contexts/AudioMetadataContext';
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
  onEditStart?: () => void;
  onEditComplete?: () => void;
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
  onEditStart,
  onEditComplete,
}: AudioItemProps) {
  // Hooks
  const audioMetadata = useAudioMetadataContext();
  
  // Use lazy visualization hook for on-demand loading
  // Memoize options to prevent unnecessary re-initialization
  const visualizationOptions = useMemo(() => ({
    waveformWidth: 200,
    spectrogramWidth: 200,
    spectrogramHeight: 32,
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
            height={32}
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
            height={32}
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
            onEditStart={onEditStart}
            onEditComplete={onEditComplete}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Only re-render if these props change
  
  // CRITICAL: Minimize re-renders to prevent DescriptionField focus loss
  // BUT: Allow re-renders when metadata might have changed
  
  // If file path changed, always re-render (different file)
  if (prevProps.file.path !== nextProps.file.path) {
    return false;
  }
  
  // If selection state changed, always re-render
  if (prevProps.isSelected !== nextProps.isSelected) {
    return false;
  }
  
  // If visibility changed, re-render (affects lazy loading)
  if (prevProps.isVisible !== nextProps.isVisible) {
    return false;
  }
  
  // If level changed, re-render (affects indentation)
  if (prevProps.level !== nextProps.level) {
    return false;
  }
  
  // If filterText changed, re-render (affects highlighting)
  if (prevProps.filterText !== nextProps.filterText) {
    return false;
  }
  
  // If onClick handler changed, re-render
  if (prevProps.onClick !== nextProps.onClick) {
    return false;
  }
  
  // If onEditStart or onEditComplete changed, re-render
  if (prevProps.onEditStart !== nextProps.onEditStart || 
      prevProps.onEditComplete !== nextProps.onEditComplete) {
    return false;
  }
  
  // For progress updates, be very conservative to prevent flicker
  // The WaveformDisplay and SpectrogramDisplay components handle progress updates
  // internally via their own useEffect hooks, so AudioItem doesn't need to re-render
  // for every progress change.
  
  // Only re-render for progress if:
  // 1. Progress went from 0 to non-zero (playback started)
  // 2. Progress went from non-zero to 0 (playback stopped)
  const prevPlaying = (prevProps.audioProgress || 0) > 0;
  const nextPlaying = (nextProps.audioProgress || 0) > 0;
  
  if (prevPlaying !== nextPlaying) {
    // Playback state changed (started or stopped)
    return false;
  }
  
  // If both are playing, don't re-render AudioItem for progress updates
  // The canvas components will update themselves via their useEffect hooks
  // This prevents the entire AudioItem from flickering during playback
  
  // All props are effectively the same, skip re-render
  return true;
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
