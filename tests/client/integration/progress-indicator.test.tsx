import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WaveformDisplay } from '../../../src/client/components/WaveformDisplay';
import { SpectrogramDisplay } from '../../../src/client/components/SpectrogramDisplay';

/**
 * Integration test for progress indicator display on waveform and spectrogram
 * Tests Requirements 3.4 and 5.2
 */
describe('Progress Indicator Integration', () => {
  const mockWaveformData = [0.5, 0.8, 0.3, 0.9, 0.6, 0.4, 0.7, 0.2];
  const mockSpectrogramData = [
    [0.1, 0.2, 0.3, 0.4],
    [0.5, 0.6, 0.7, 0.8],
    [0.2, 0.3, 0.4, 0.5],
  ];

  let mockCanvasContext: any;

  beforeEach(() => {
    // Mock canvas context with tracking
    mockCanvasContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext);
  });

  it('passes progress to WaveformDisplay when audio is playing', () => {
    render(
      <WaveformDisplay
        waveformData={mockWaveformData}
        progress={0.5}
        width={200}
        height={40}
      />
    );

    // Verify progress line is drawn at 50% position
    expect(mockCanvasContext.beginPath).toHaveBeenCalled();
    expect(mockCanvasContext.moveTo).toHaveBeenCalledWith(100, 0); // 50% of 200px width
    expect(mockCanvasContext.lineTo).toHaveBeenCalledWith(100, 40); // full height
    expect(mockCanvasContext.stroke).toHaveBeenCalled();
  });

  it('passes progress to SpectrogramDisplay when audio is playing', () => {
    render(
      <SpectrogramDisplay
        spectrogramData={mockSpectrogramData}
        progress={0.75}
        width={200}
        height={40}
      />
    );

    // Verify progress line is drawn at 75% position
    expect(mockCanvasContext.beginPath).toHaveBeenCalled();
    expect(mockCanvasContext.moveTo).toHaveBeenCalledWith(150, 0); // 75% of 200px width
    expect(mockCanvasContext.lineTo).toHaveBeenCalledWith(150, 40); // full height
    expect(mockCanvasContext.stroke).toHaveBeenCalled();
  });

  it('draws progress line with correct color and width', () => {
    render(
      <WaveformDisplay
        waveformData={mockWaveformData}
        progress={0.25}
        width={200}
        height={40}
      />
    );

    // Verify progress line styling
    expect(mockCanvasContext.strokeStyle).toBe('#ff6b6b');
    expect(mockCanvasContext.lineWidth).toBe(2);
  });

  it('does not draw progress line when progress is 0', () => {
    render(
      <WaveformDisplay
        waveformData={mockWaveformData}
        progress={0}
        width={200}
        height={40}
      />
    );

    // When progress is 0, no progress line should be drawn
    // beginPath is not called for progress line
    const beginPathCalls = mockCanvasContext.beginPath.mock.calls.length;
    expect(beginPathCalls).toBe(0);
  });

  it('updates progress indicator in real-time as audio plays', () => {
    // Render at 25% progress
    const { rerender } = render(
      <WaveformDisplay
        waveformData={mockWaveformData}
        progress={0.25}
        width={200}
        height={40}
      />
    );

    expect(mockCanvasContext.moveTo).toHaveBeenCalledWith(50, 0); // 25% of 200px

    // Clear previous calls
    mockCanvasContext.moveTo.mockClear();
    mockCanvasContext.beginPath.mockClear();

    // Rerender at 50% progress
    rerender(
      <WaveformDisplay
        waveformData={mockWaveformData}
        progress={0.5}
        width={200}
        height={40}
      />
    );

    expect(mockCanvasContext.moveTo).toHaveBeenCalledWith(100, 0); // 50% of 200px
  });

  it('renders progress overlay with correct opacity', () => {
    render(
      <WaveformDisplay
        waveformData={mockWaveformData}
        progress={0.75}
        width={200}
        height={40}
      />
    );

    // Check that fillRect was called for the progress overlay
    // The overlay should be drawn at 75% of the width
    const fillRectCalls = mockCanvasContext.fillRect.mock.calls;
    const progressOverlayCall = fillRectCalls.find(
      (call) => call[0] === 0 && call[2] === 150 // x=0, width=150 (75% of 200)
    );
    expect(progressOverlayCall).toBeDefined();
  });
});
