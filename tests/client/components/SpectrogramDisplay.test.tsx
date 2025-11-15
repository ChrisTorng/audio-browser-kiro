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

  it('renders spectrogram with transparent background', () => {
    const mockContext = {
      clearRect: vi.fn(),
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
      <SpectrogramDisplay
        spectrogramData={mockSpectrogramData}
        width={200}
        height={40}
      />
    );

    // Verify canvas is cleared (transparent background)
    expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 200, 40);
    // Verify spectrogram is drawn
    expect(mockContext.fillRect).toHaveBeenCalled();
  });
});
