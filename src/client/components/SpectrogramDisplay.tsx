import { useEffect, useRef, memo, useCallback } from 'react';

/**
 * SpectrogramDisplay component props
 */
export interface SpectrogramDisplayProps {
  spectrogramData: number[][] | null;
  width?: number;
  height?: number;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * SpectrogramDisplay component
 * Displays audio spectrogram with transparent background
 */
export const SpectrogramDisplay = memo(function SpectrogramDisplay({
  spectrogramData,
  width = 200,
  height = 40,
  isLoading = false,
  error = null,
}: SpectrogramDisplayProps) {
  const spectrogramCanvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Convert frequency intensity to color with transparency
   * Low intensity values are transparent, high intensity values are opaque
   */
  const intensityToColor = useCallback((intensity: number): string => {
    // Map intensity (0-1) to color gradient (blue -> green -> yellow -> red)
    const r = Math.floor(Math.min(255, intensity * 2 * 255));
    const g = Math.floor(Math.min(255, intensity * 1.5 * 255));
    const b = Math.floor(Math.max(0, (1 - intensity) * 255));
    // Use intensity as alpha channel for transparency
    return `rgba(${r}, ${g}, ${b}, ${intensity})`;
  }, []);

  /**
   * Draw spectrogram on canvas
   */
  useEffect(() => {
    const canvas = spectrogramCanvasRef.current;
    if (!canvas || !spectrogramData || spectrogramData.length === 0) {
      if (!spectrogramData) {
        console.log('[SpectrogramDisplay] No spectrogram data to display');
      } else if (spectrogramData.length === 0) {
        console.log('[SpectrogramDisplay] Empty spectrogram data array');
      }
      return;
    }

    console.log(`[SpectrogramDisplay] 🎨 Drawing spectrogram: ${spectrogramData.length}x${spectrogramData[0]?.length || 0}`);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with transparent background
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
    
    console.log('[SpectrogramDisplay] ✅ Spectrogram drawn successfully');
  }, [spectrogramData, width, height, intensityToColor]);

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
        ref={spectrogramCanvasRef}
        width={width}
        height={height}
        className="spectrogram-display__canvas"
      />
    </div>
  );
});
