import { memo } from 'react';
import { createPortal } from 'react-dom';
import { useHoverPreview } from '../hooks';

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
    ? 'spectrogram-display--error'
    : isLoading
    ? 'spectrogram-display--loading'
    : !imageUrl
    ? 'spectrogram-display--empty'
    : '';

  const showPreview = isVisible && previewEnabled && position;

  let content: JSX.Element;

  if (error) {
    content = <span className="spectrogram-display__error-icon">⚠️</span>;
  } else if (isLoading) {
    content = <span className="spectrogram-display__loading-text">Loading...</span>;
  } else if (!imageUrl) {
    content = <span className="spectrogram-display__empty-text">#</span>;
  } else {
    content = (
      <img
        src={imageUrl}
        alt="Spectrogram"
        className="spectrogram-display__image"
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <div
      className={`spectrogram-display ${stateClass}`.trim()}
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
            data-variant="spectrogram"
            data-placement={position.placement}
            data-testid="spectrogram-preview"
            style={{
              width: position.width,
              height: position.height,
              top: position.top,
              left: position.left,
            }}
          >
            <img
              src={imageUrl!}
              alt="Spectrogram preview"
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
