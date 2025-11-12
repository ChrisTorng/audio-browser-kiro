import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SpectrogramDisplay } from '../../../src/client/components/SpectrogramDisplay';

describe('SpectrogramDisplay', () => {
  const mockSpectrogramData = [
    [0.1, 0.2, 0.3, 0.4],
    [0.5, 0.6, 0.7, 0.8],
    [0.2, 0.3, 0.4, 0.5],
  ];

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

  it('renders canvas when spectrogram data is provided', () => {
    const { container } = render(
      <SpectrogramDisplay spectrogramData={mockSpectrogramData} width={200} height={40} />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('displays loading state', () => {
    const { container } = render(
      <SpectrogramDisplay spectrogramData={null} isLoading={true} width={200} height={40} />
    );

    expect(container.querySelector('.spectrogram-display--loading')).toBeInTheDocument();
    expect(container.textContent).toContain('Loading...');
  });

  it('displays error state', () => {
    const error = new Error('Failed to load spectrogram');
    const { container } = render(
      <SpectrogramDisplay spectrogramData={null} error={error} width={200} height={40} />
    );

    expect(container.querySelector('.spectrogram-display--error')).toBeInTheDocument();
    expect(container.textContent).toContain('⚠️');
  });

  it('displays empty state when no data', () => {
    const { container } = render(
      <SpectrogramDisplay spectrogramData={null} width={200} height={40} />
    );

    expect(container.querySelector('.spectrogram-display--empty')).toBeInTheDocument();
    expect(container.textContent).toContain('#');
  });

  it('displays empty state when data is empty array', () => {
    const { container } = render(
      <SpectrogramDisplay spectrogramData={[]} width={200} height={40} />
    );

    expect(container.querySelector('.spectrogram-display--empty')).toBeInTheDocument();
  });

  it('sets correct canvas dimensions', () => {
    const { container } = render(
      <SpectrogramDisplay spectrogramData={mockSpectrogramData} width={300} height={60} />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('width', '300');
    expect(canvas).toHaveAttribute('height', '60');
  });

  it('uses default dimensions when not specified', () => {
    const { container } = render(<SpectrogramDisplay spectrogramData={mockSpectrogramData} />);

    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('width', '200');
    expect(canvas).toHaveAttribute('height', '40');
  });

  it('applies correct container styles', () => {
    const { container } = render(
      <SpectrogramDisplay spectrogramData={mockSpectrogramData} width={250} height={50} />
    );

    const display = container.querySelector('.spectrogram-display');
    expect(display).toHaveStyle({ width: '250px', height: '50px' });
  });

  it('renders progress indicator when progress is provided', () => {
    const mockContext = {
      clearRect: () => {},
      fillRect: () => {},
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
      <SpectrogramDisplay
        spectrogramData={mockSpectrogramData}
        progress={0.5}
        width={200}
        height={40}
      />
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
      fillRect: () => {},
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
      <SpectrogramDisplay
        spectrogramData={mockSpectrogramData}
        progress={0}
        width={200}
        height={40}
      />
    );

    // Progress line should not be drawn when progress is 0
    const beginPathCalls = mockContext.beginPath.mock.calls.length;
    expect(beginPathCalls).toBe(0); // No progress line drawn
  });

  it('renders progress line with correct color and width', () => {
    const mockContext = {
      clearRect: () => {},
      fillRect: () => {},
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = () => mockContext as any;

    render(
      <SpectrogramDisplay
        spectrogramData={mockSpectrogramData}
        progress={0.75}
        width={200}
        height={40}
      />
    );

    // Verify stroke was called (progress line drawn)
    expect(mockContext.stroke).toHaveBeenCalled();
    // The strokeStyle should be set to red (#ff6b6b) and lineWidth to 2
    expect(mockContext.strokeStyle).toBe('#ff6b6b');
    expect(mockContext.lineWidth).toBe(2);
  });
});
