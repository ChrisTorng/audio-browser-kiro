import { memo } from 'react';

/**
 * WaveformDisplay component props
 */
export interface WaveformDisplayProps {
  imageUrl: string | null;
  width?: number;
  height?: number;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * WaveformDisplay component
 * Displays audio waveform image from server
 */
export const WaveformDisplay = memo(function WaveformDisplay({
  imageUrl,
  width = 200,
  height = 40,
  isLoading = false,
  error = null,
}: WaveformDisplayProps) {
  if (error) {
    return (
      <div className="waveform-display waveform-display--error" style={{ width, height }}>
        <span className="waveform-display__error-icon">⚠️</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="waveform-display waveform-display--loading" style={{ width, height }}>
        <span className="waveform-display__loading-text">Loading...</span>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="waveform-display waveform-display--empty" style={{ width, height }}>
        <span className="waveform-display__empty-text">~</span>
      </div>
    );
  }

  return (
    <div className="waveform-display" style={{ width, height }}>
      <img
        src={imageUrl}
        alt="Waveform"
        className="waveform-display__image"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
});
