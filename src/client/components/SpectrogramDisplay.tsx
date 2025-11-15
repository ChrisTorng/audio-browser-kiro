import { useEffect, useRef, memo, useCallback } from 'react';

/**
 * SpectrogramDisplay component props
 */
export interface SpectrogramDisplayProps {
  spectrogramData: number[][] | null;
  progress?: number; // 0-1
  width?: number;
  height?: number;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * SpectrogramDisplay component
 * Displays audio spectrogram with playback progress overlay
 * Optimized to only redraw progress indicator, not the entire spectrogram
 */
export const SpectrogramDisplay = memo(function SpectrogramDisplay({
  spectrogramData,
  progress = 0,
  width = 200,
  height = 40,
  isLoading = false,
  error = null,
}: SpectrogramDisplayProps) {
  const spectrogramCanvasRef = useRef<HTMLCanvasElement>(null);
  const progressCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrogramDrawnRef = useRef(false);

  /**
   * Convert frequency intensity to color
   */
  const intensityToColor = useCallback((intensity: number): string => {
    // Map intensity (0-1) to color gradient (blue -> green -> yellow -> red)
    const r = Math.floor(Math.min(255, intensity * 2 * 255));
    const g = Math.floor(Math.min(255, intensity * 1.5 * 255));
    const b = Math.floor(Math.max(0, (1 - intensity) * 255));
    return `rgb(${r}, ${g}, ${b})`;
  }, []);

  /**
   * Draw spectrogram on canvas (only when spectrogram data changes)
   */
  useEffect(() => {
    const canvas = spectrogramCanvasRef.current;
    if (!canvas || !spectrogramData || spectrogramData.length === 0) {
      spectrogramDrawnRef.current = false;
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw spectrogram - scale entire audio content to fixed canvas size
    const timeSlices = spectrogramData.length;
    const frequencyBins = spectrogramData[0]?.length || 0;

    if (frequencyBins === 0) return;

    // Calculate dimensions to fill entire canvas
    // Each time slice gets equal width, each frequency bin gets equal height
    const sliceWidth = width / timeSlices;
    const binHeight = height / frequencyBins;

    // Draw each time slice and frequency bin
    spectrogramData.forEach((slice, timeIndex) => {
      slice.forEach((intensity, freqIndex) => {
        // Calculate position - flip Y axis (low freq at bottom)
        const x = timeIndex * sliceWidth;
        const y = height - (freqIndex + 1) * binHeight;
        
        // Calculate size to ensure complete coverage without gaps
        const rectWidth = Math.ceil(sliceWidth + 0.5);
        const rectHeight = Math.ceil(binHeight + 0.5);

        ctx.fillStyle = intensityToColor(intensity);
        ctx.fillRect(Math.floor(x), Math.floor(y), rectWidth, rectHeight);
      });
    });

    spectrogramDrawnRef.current = true;
  }, [spectrogramData, width, height, intensityToColor]);

  /**
   * Draw progress overlay on separate canvas (updates frequently)
   */
  useEffect(() => {
    const canvas = progressCanvasRef.current;
    if (!canvas || !spectrogramDrawnRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw progress overlay only if playing
    if (progress > 0) {
      const progressX = width * progress;

      // Draw progress line
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
  }, [progress, width, height]);

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

  if (!spectrogramData || spectrogramData.length === 0) {
    return (
      <div className="spectrogram-display spectrogram-display--empty" style={{ width, height }}>
        <span className="spectrogram-display__empty-text">#</span>
      </div>
    );
  }

  return (
    <div className="spectrogram-display" style={{ width, height, position: 'relative' }}>
      {/* Base spectrogram canvas - only redraws when spectrogram data changes */}
      <canvas
        ref={spectrogramCanvasRef}
        width={width}
        height={height}
        className="spectrogram-display__canvas"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      {/* Progress overlay canvas - redraws frequently during playback */}
      <canvas
        ref={progressCanvasRef}
        width={width}
        height={height}
        className="spectrogram-display__progress-canvas"
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these props change
  // This prevents unnecessary re-renders when parent components update
  return (
    prevProps.spectrogramData === nextProps.spectrogramData &&
    prevProps.progress === nextProps.progress &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.error === nextProps.error
  );
});
