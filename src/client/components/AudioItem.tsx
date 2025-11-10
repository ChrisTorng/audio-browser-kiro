import { useCallback, useMemo, useEffect, useRef } from 'react';
import { AudioFile } from '../../shared/types';
import { useAudioMetadata, useWaveform, useSpectrogram, useAudioPlayer } from '../hooks';
import { audioBrowserAPI } from '../services/api';
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
  level: number;
  filterText?: string;
  onClick: () => void;
}

/**
 * AudioItem component
 * Displays a single audio file in a compact single-line layout
 * Layout: StarRating | Filename | Waveform | Spectrogram | Description
 */
export function AudioItem({
  file,
  isSelected,
  level,
  filterText = '',
  onClick,
}: AudioItemProps) {
  // Hooks
  const audioMetadata = useAudioMetadata();
  const audioPlayer = useAudioPlayer();
  const waveform = useWaveform();
  const spectrogram = useSpectrogram();

  // Track if audio has been loaded for this file
  const audioLoadedRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Get metadata for this file
  const metadata = useMemo(() => {
    return audioMetadata.getMetadata(file.path);
  }, [audioMetadata, file.path]);

  const rating = metadata?.rating || 0;
  const description = metadata?.description || '';

  /**
   * Load audio file and generate waveform/spectrogram when selected
   */
  useEffect(() => {
    if (!isSelected || audioLoadedRef.current) {
      return;
    }

    const loadAudioAndGenerateVisualizations = async () => {
      try {
        // Download audio file
        const audioBlob = await audioBrowserAPI.getAudioFile(file.path);

        // Create AudioContext if not exists
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        // Convert blob to ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Decode audio data
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

        // Generate waveform and spectrogram
        waveform.generateWaveform(audioBuffer, 200);
        spectrogram.generateSpectrogram(audioBuffer, 200, 40);

        // Mark as loaded
        audioLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load audio and generate visualizations:', error);
      }
    };

    loadAudioAndGenerateVisualizations();
  }, [isSelected, file.path, waveform, spectrogram]);

  /**
   * Reset loaded state when file changes
   */
  useEffect(() => {
    audioLoadedRef.current = false;
  }, [file.path]);

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

  // Determine if this file is currently playing
  const isPlaying = isSelected && audioPlayer.isPlaying;
  const progress = isPlaying ? audioPlayer.progress : 0;

  return (
    <div
      className={`audio-item ${isSelected ? 'audio-item--selected' : ''}`}
      onClick={onClick}
      style={{ paddingLeft: `${level * 20}px` }}
    >
      <div className="audio-item__content">
        {/* Star Rating */}
        <div className="audio-item__rating">
          <StarRating rating={rating} onChange={handleRatingChange} />
        </div>

        {/* Filename */}
        <div className="audio-item__filename">
          {highlightText(file.name, filterText)}
        </div>

        {/* Waveform */}
        <div className="audio-item__waveform">
          <WaveformDisplay
            waveformData={waveform.waveformData}
            progress={progress}
            width={200}
            height={40}
            isLoading={waveform.isLoading}
            error={waveform.error}
          />
        </div>

        {/* Spectrogram */}
        <div className="audio-item__spectrogram">
          <SpectrogramDisplay
            spectrogramData={spectrogram.spectrogramData}
            progress={progress}
            width={200}
            height={40}
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
          />
        </div>
      </div>
    </div>
  );
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
