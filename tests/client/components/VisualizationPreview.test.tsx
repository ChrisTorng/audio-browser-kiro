import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaveformDisplay } from '../../../src/client/components/WaveformDisplay';
import { SpectrogramDisplay } from '../../../src/client/components/SpectrogramDisplay';

const TEST_TIMEOUT = 10000;

const defaultRect: DOMRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  toJSON: () => ({}),
};

function setViewportSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

function mockBoundingRect(element: HTMLElement, rect: { top: number; left: number; width: number; height: number }) {
  const domRect: DOMRect = {
    ...defaultRect,
    ...rect,
    x: rect.left,
    y: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
    }),
  };

  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => domRect,
  });
}

function loadPreviewImage(alt: string, naturalWidth: number, naturalHeight: number) {
  const image = screen.getByAltText(alt) as HTMLImageElement;
  Object.defineProperty(image, 'naturalWidth', { value: naturalWidth, configurable: true });
  Object.defineProperty(image, 'naturalHeight', { value: naturalHeight, configurable: true });
  fireEvent.load(image);
  return image;
}

describe('Visualization hover preview', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    setViewportSize(originalInnerWidth, originalInnerHeight);
  });

  afterEach(() => {
    setViewportSize(originalInnerWidth, originalInnerHeight);
  });

  it(
    'positions waveform preview below when there is more space under the thumbnail',
    async () => {
      setViewportSize(1200, 900);

      const { container } = render(
        <WaveformDisplay imageUrl="blob:waveform" width={200} height={32} isLoading={false} error={null} />
      );

      const display = container.querySelector('.waveform-display') as HTMLElement;
      mockBoundingRect(display, { top: 200, left: 420, width: 200, height: 32 });

      fireEvent.mouseEnter(display);

      loadPreviewImage('Waveform preview', 800, 200);

      const preview = await screen.findByTestId('waveform-preview');

      await waitFor(() => {
        expect(preview.getAttribute('data-placement')).toBe('bottom');
        expect(preview.style.top).toBe('244px');
        expect(preview.style.height).toBe('200px');
        expect(preview.style.left).toBe('120px');
      });
    },
    TEST_TIMEOUT
  );

  it(
    'positions spectrogram preview above when the upper area is larger',
    async () => {
      setViewportSize(1200, 900);

      const { container } = render(
        <SpectrogramDisplay imageUrl="blob:spectrogram" width={200} height={32} isLoading={false} error={null} />
      );

      const display = container.querySelector('.spectrogram-display') as HTMLElement;
      mockBoundingRect(display, { top: 740, left: 420, width: 200, height: 32 });

      fireEvent.mouseEnter(display);

      loadPreviewImage('Spectrogram preview', 800, 200);

      const preview = await screen.findByTestId('spectrogram-preview');

      await waitFor(() => {
        expect(preview.getAttribute('data-placement')).toBe('top');
        expect(preview.style.top).toBe('528px');
        expect(preview.style.height).toBe('200px');
        expect(preview.style.left).toBe('120px');
      });
    },
    TEST_TIMEOUT
  );

  it(
    'scales preview down to fit within the visible viewport',
    async () => {
      setViewportSize(900, 600);

      const { container } = render(
        <WaveformDisplay imageUrl="blob:waveform" width={200} height={32} isLoading={false} error={null} />
      );

      const display = container.querySelector('.waveform-display') as HTMLElement;
      mockBoundingRect(display, { top: 200, left: 300, width: 200, height: 32 });

      fireEvent.mouseEnter(display);

      loadPreviewImage('Waveform preview', 1600, 600);

      const preview = await screen.findByTestId('waveform-preview');

      await waitFor(() => {
        expect(preview.getAttribute('data-placement')).toBe('bottom');
        expect(parseFloat(preview.style.width)).toBeCloseTo(876);
        expect(parseFloat(preview.style.height)).toBeCloseTo(328.5);
        expect(preview.style.top).toBe('244px');
        expect(parseFloat(preview.style.left)).toBeCloseTo(12);
      });
    },
    TEST_TIMEOUT
  );
});
