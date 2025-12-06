import { memo } from 'react';

/**
 * SpectrogramDisplay component props
 */
export interface SpectrogramDisplayProps {
  imageUrl: string | null;
  width?: number;
  height?: number;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * SpectrogramDisplay component
 * Displays audio spectrogram image from server
 */
export const SpectrogramDisplay = memo(function SpectrogramDisplay({
  imageUrl,
  width = 200,
  height = 40,
  isLoading = false,
  error = null,
}: SpectrogramDisplayProps) {
  if (error) {
    return (
      <div className="spectrogram-display spectrogram-display--error" style={{ width, height }}>
        <span className="spectrogram-display__error-icon">⚠️</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="spectrogram-display spectrogram-display--loading" style={{ width, height }}>
        <span className="spectrogram-display__loading-text">Loading...</span>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="spectrogram-display spectrogram-display--empty" style={{ width, height }}>
        <span className="spectrogram-display__empty-text">#</span>
      </div>
    );
  }

  return (
    <div className="spectrogram-display" style={{ width, height }}>
      <img
        src={imageUrl}
        alt="Spectrogram"
        className="spectrogram-display__image"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
});
