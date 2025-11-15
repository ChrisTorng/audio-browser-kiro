import { useEffect, useRef, memo } from 'react';

/**
 * WaveformDisplay component props
 */
export interface WaveformDisplayProps {
  waveformData: number[] | null;
  progress?: number; // 0-1
  width?: number;
  height?: number;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * WaveformDisplay component
 * Displays audio waveform with playback progress overlay
 * Optimized to only redraw progress indicator, not the entire waveform
 */
export const WaveformDisplay = memo(function WaveformDisplay({
  waveformData,
  progress = 0,
  width = 200,
  height = 40,
  isLoading = false,
  error = null,
}: WaveformDisplayProps) {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const progressCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformDrawnRef = useRef(false);

  /**
   * Draw waveform on canvas (only when waveform data changes)
   */
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !waveformData || waveformData.length === 0) {
      waveformDrawnRef.current = false;
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    const barWidth = Math.max(1, width / waveformData.length);
    const centerY = height / 2;

    ctx.fillStyle = '#4a90e2';

    waveformData.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(1, amplitude * height * 0.9); // Use 90% of height for better visibility

      // Draw bar from center
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
    });

    waveformDrawnRef.current = true;
  }, [waveformData, width, height]);

  /**
   * Draw progress overlay on separate canvas (updates frequently)
   */
  useEffect(() => {
    const canvas = progressCanvasRef.current;
    if (!canvas || !waveformDrawnRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw progress overlay only if playing
    if (progress > 0) {
      const progressX = width * progress;
      
      // Draw semi-transparent overlay for played portion
      ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
      ctx.fillRect(0, 0, progressX, height);

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

  if (!waveformData || waveformData.length === 0) {
    return (
      <div className="waveform-display waveform-display--empty" style={{ width, height }}>
        <span className="waveform-display__empty-text">~</span>
      </div>
    );
  }

  return (
    <div className="waveform-display" style={{ width, height, position: 'relative' }}>
      {/* Base waveform canvas - only redraws when waveform data changes */}
      <canvas
        ref={waveformCanvasRef}
        width={width}
        height={height}
        className="waveform-display__canvas"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      {/* Progress overlay canvas - redraws frequently during playback */}
      <canvas
        ref={progressCanvasRef}
        width={width}
        height={height}
        className="waveform-display__progress-canvas"
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />
    </div>
  );
});
