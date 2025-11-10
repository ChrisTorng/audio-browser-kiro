import { useEffect, useRef } from 'react';

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
 */
export function WaveformDisplay({
  waveformData,
  progress = 0,
  width = 200,
  height = 40,
  isLoading = false,
  error = null,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Draw waveform on canvas
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    const barWidth = width / waveformData.length;
    const centerY = height / 2;

    ctx.fillStyle = '#4a90e2';

    waveformData.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = amplitude * centerY;

      // Draw bar from center
      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
    });

    // Draw progress overlay
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
  }, [waveformData, progress, width, height]);

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
    <div className="waveform-display" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="waveform-display__canvas"
      />
    </div>
  );
}
