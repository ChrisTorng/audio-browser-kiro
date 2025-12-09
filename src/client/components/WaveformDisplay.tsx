import { memo } from 'react';
import { createPortal } from 'react-dom';
import { useHoverPreview } from '../hooks';

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
  const previewFallbackWidth = width * 4;
  const previewFallbackHeight = height * 6;
  const previewEnabled = !!imageUrl && !isLoading && !error;

  const { anchorRef, isVisible, position, handleMouseEnter, handleMouseLeave, handlePreviewLoad } = useHoverPreview({
    imageUrl: previewEnabled ? imageUrl : null,
    disabled: !previewEnabled,
    fallbackWidth: previewFallbackWidth,
    fallbackHeight: previewFallbackHeight,
  });

  const stateClass = error
    ? 'waveform-display--error'
    : isLoading
    ? 'waveform-display--loading'
    : !imageUrl
    ? 'waveform-display--empty'
    : '';

  const showPreview = isVisible && previewEnabled && position;

  let content: JSX.Element;

  if (error) {
    content = <span className="waveform-display__error-icon">⚠️</span>;
  } else if (isLoading) {
    content = <span className="waveform-display__loading-text">Loading...</span>;
  } else if (!imageUrl) {
    content = <span className="waveform-display__empty-text">~</span>;
  } else {
    content = (
      <img
        src={imageUrl}
        alt="Waveform"
        className="waveform-display__image"
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <div
      className={`waveform-display ${stateClass}`.trim()}
      style={{ width, height }}
      ref={anchorRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {content}
      {showPreview &&
        position &&
        createPortal(
          <div
            className="visualization-preview"
            data-variant="waveform"
            data-placement={position.placement}
            data-testid="waveform-preview"
            style={{
              width: position.width,
              height: position.height,
              top: position.top,
              left: position.left,
            }}
          >
            <img
              src={imageUrl!}
              alt="Waveform preview"
              className="visualization-preview__image"
              onLoad={handlePreviewLoad}
              draggable={false}
              style={{
                width: position.width,
                height: position.height,
              }}
            />
          </div>,
          document.body
        )}
    </div>
  );
});
