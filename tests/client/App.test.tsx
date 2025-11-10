import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../src/client/App';

// Mock the API
vi.mock('../../src/client/services/api', () => ({
  audioBrowserAPI: {
    scanDirectory: vi.fn(),
    getAllMetadata: vi.fn(),
  },
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch for metadata
    global.fetch = vi.fn((url) => {
      if (url === '/api/metadata') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ metadata: {} }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('renders the AudioBrowser component', () => {
    render(<App />);
    expect(screen.getByText('Audio Browser')).toBeDefined();
  });

  it('renders the scan input', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('Enter directory path...')).toBeDefined();
  });

  it('renders the scan button', () => {
    render(<App />);
    expect(screen.getByText('Scan')).toBeDefined();
  });
});
