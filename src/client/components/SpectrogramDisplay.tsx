import { useEffect, useRef } from 'react';

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
 */
export function SpectrogramDisplay({
  spectrogramData,
  progress = 0,
  width = 200,
  height = 40,
  isLoading = false,
  error = null,
}: SpectrogramDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Convert frequency intensity to color
   */
  const intensityToColor = (intensity: number): string => {
    // Map intensity (0-1) to color gradient (blue -> green -> yellow -> red)
    const r = Math.floor(Math.min(255, intensity * 2 * 255));
    const g = Math.floor(Math.min(255, intensity * 1.5 * 255));
    const b = Math.floor(Math.max(0, (1 - intensity) * 255));
    return `rgb(${r}, ${g}, ${b})`;
  };

  /**
   * Draw spectrogram on canvas
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spectrogramData || spectrogramData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw spectrogram
    const timeSlices = spectrogramData.length;
    const frequencyBins = spectrogramData[0]?.length || 0;

    if (frequencyBins === 0) return;

    const sliceWidth = width / timeSlices;
    const binHeight = height / frequencyBins;

    spectrogramData.forEach((slice, timeIndex) => {
      slice.forEach((intensity, freqIndex) => {
        const x = timeIndex * sliceWidth;
        const y = height - (freqIndex + 1) * binHeight; // Flip Y axis (low freq at bottom)

        ctx.fillStyle = intensityToColor(intensity);
        ctx.fillRect(x, y, sliceWidth + 1, binHeight + 1);
      });
    });

    // Draw progress overlay
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
  }, [spectrogramData, progress, width, height]);

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
    <div className="spectrogram-display" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="spectrogram-display__canvas"
      />
    </div>
  );
}
