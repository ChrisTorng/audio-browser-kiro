import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaveformDisplay } from '../../../src/client/components/WaveformDisplay';
import { SpectrogramDisplay } from '../../../src/client/components/SpectrogramDisplay';

const TEST_TIMEOUT = 10000;

describe('Visualization thumbnails', () => {
  it(
    'fits waveform image within the thumbnail without cropping while keeping container size',
    () => {
      const { container } = render(<WaveformDisplay imageUrl="blob:waveform" width={180} height={48} />);

      const wrapper = container.querySelector('.waveform-display') as HTMLElement;
      expect(wrapper).toBeTruthy();
      expect(wrapper.style.width).toBe('180px');
      expect(wrapper.style.height).toBe('48px');

      const image = screen.getByAltText('Waveform') as HTMLImageElement;
      expect(image).toBeTruthy();
      expect(image.style.width).toBe('100%');
      expect(image.style.height).toBe('100%');
    },
    TEST_TIMEOUT
  );

  it(
    'fits spectrogram image within the thumbnail without cropping while keeping container size',
    () => {
      const { container } = render(<SpectrogramDisplay imageUrl="blob:spectrogram" width={180} height={48} />);

      const wrapper = container.querySelector('.spectrogram-display') as HTMLElement;
      expect(wrapper).toBeTruthy();
      expect(wrapper.style.width).toBe('180px');
      expect(wrapper.style.height).toBe('48px');

      const image = screen.getByAltText('Spectrogram') as HTMLImageElement;
      expect(image).toBeTruthy();
      expect(image.style.width).toBe('100%');
      expect(image.style.height).toBe('100%');
    },
    TEST_TIMEOUT
  );
});
