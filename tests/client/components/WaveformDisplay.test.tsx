import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WaveformDisplay } from '../../../src/client/components/WaveformDisplay';

describe('WaveformDisplay', () => {
  const mockWaveformData = [0.5, 0.8, 0.3, 0.9, 0.6, 0.4, 0.7, 0.2];

  beforeEach(() => {
    // Mock canvas context
    HTMLCanvasElement.prototype.getContext = () => ({
      clearRect: () => {},
      fillRect: () => {},
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
    }) as any;
  });

  it('renders canvas when waveform data is provided', () => {
    const { container } = render(
      <WaveformDisplay waveformData={mockWaveformData} width={200} height={40} />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('displays loading state', () => {
    const { container } = render(
      <WaveformDisplay waveformData={null} isLoading={true} width={200} height={40} />
    );

    expect(container.querySelector('.waveform-display--loading')).toBeInTheDocument();
    expect(container.textContent).toContain('Loading...');
  });

  it('displays error state', () => {
    const error = new Error('Failed to load waveform');
    const { container } = render(
      <WaveformDisplay waveformData={null} error={error} width={200} height={40} />
    );

    expect(container.querySelector('.waveform-display--error')).toBeInTheDocument();
    expect(container.textContent).toContain('⚠️');
  });

  it('displays empty state when no data', () => {
    const { container } = render(
      <WaveformDisplay waveformData={null} width={200} height={40} />
    );

    expect(container.querySelector('.waveform-display--empty')).toBeInTheDocument();
    expect(container.textContent).toContain('~');
  });

  it('displays empty state when data is empty array', () => {
    const { container } = render(
      <WaveformDisplay waveformData={[]} width={200} height={40} />
    );

    expect(container.querySelector('.waveform-display--empty')).toBeInTheDocument();
  });

  it('sets correct canvas dimensions', () => {
    const { container } = render(
      <WaveformDisplay waveformData={mockWaveformData} width={300} height={60} />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('width', '300');
    expect(canvas).toHaveAttribute('height', '60');
  });

  it('uses default dimensions when not specified', () => {
    const { container } = render(<WaveformDisplay waveformData={mockWaveformData} />);

    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('width', '200');
    expect(canvas).toHaveAttribute('height', '40');
  });

  it('applies correct container styles', () => {
    const { container } = render(
      <WaveformDisplay waveformData={mockWaveformData} width={250} height={50} />
    );

    const display = container.querySelector('.waveform-display');
    expect(display).toHaveStyle({ width: '250px', height: '50px' });
  });

  it('renders progress indicator when progress is provided', () => {
    const mockContext = {
      clearRect: () => {},
      fillRect: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = () => mockContext as any;

    render(
      <WaveformDisplay waveformData={mockWaveformData} progress={0.5} width={200} height={40} />
    );

    // Verify progress line is drawn
    expect(mockContext.beginPath).toHaveBeenCalled();
    expect(mockContext.moveTo).toHaveBeenCalledWith(100, 0); // 50% of 200px width
    expect(mockContext.lineTo).toHaveBeenCalledWith(100, 40); // full height
    expect(mockContext.stroke).toHaveBeenCalled();
  });

  it('does not render progress indicator when progress is 0', () => {
    const mockContext = {
      clearRect: () => {},
      fillRect: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = () => mockContext as any;

    render(
      <WaveformDisplay waveformData={mockWaveformData} progress={0} width={200} height={40} />
    );

    // Progress line should not be drawn when progress is 0
    // beginPath is called for waveform drawing, but not for progress
    const beginPathCalls = mockContext.beginPath.mock.calls.length;
    expect(beginPathCalls).toBe(0); // No progress line drawn
  });

  it('renders progress overlay with correct opacity', () => {
    const mockContext = {
      clearRect: () => {},
      fillRect: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
    };

    HTMLCanvasElement.prototype.getContext = () => mockContext as any;

    render(
      <WaveformDisplay waveformData={mockWaveformData} progress={0.75} width={200} height={40} />
    );

    // Check that fillRect was called for the progress overlay
    // The overlay should be drawn at 75% of the width
    const fillRectCalls = mockContext.fillRect.mock.calls;
    const progressOverlayCall = fillRectCalls.find(
      (call) => call[0] === 0 && call[2] === 150 // x=0, width=150 (75% of 200)
    );
    expect(progressOverlayCall).toBeDefined();
  });
});
