import { useCallback, useMemo, memo } from 'react';
import { AudioFile } from '../../shared/types';
import { useWaveform, useSpectrogram } from '../hooks';
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
  onEditStart,
  onEditComplete,
}: AudioItemProps) {
  // Hooks
  const audioMetadata = useAudioMetadataContext();
  
  // Use visualization hooks to fetch images from server
  const waveform = useWaveform(isVisible ? file.path : null);
  const spectrogram = useSpectrogram(isVisible ? file.path : null);

  // Get metadata for this file
  const metadata = useMemo(() => {
    return audioMetadata.getMetadata(file.path);
  }, [audioMetadata, file.path]);

  const rating = metadata?.rating || 0;
  const description = metadata?.description || '';

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
            imageUrl={waveform.imageUrl}
            width={200}
            height={32}
            isLoading={waveform.isLoading}
            error={waveform.error}
          />
        </div>

        {/* Spectrogram */}
        <div className="audio-item__spectrogram">
          <SpectrogramDisplay
            imageUrl={spectrogram.imageUrl}
            width={200}
            height={32}
            isLoading={spectrogram.isLoading}
            error={spectrogram.error}
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
});
// Note: Removed custom memo comparison to allow visualization data updates to trigger re-renders
// The component will re-render when internal hook state (waveformData, spectrogramData) changes
// This ensures visualizations appear immediately after generation completes

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
