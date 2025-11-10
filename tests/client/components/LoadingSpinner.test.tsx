import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingOverlay } from '../../../src/client/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders spinner with default size', () => {
    const { container } = render(<LoadingSpinner />);

    const spinner = container.querySelector('.loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('loading-spinner--medium');
  });

  it('renders spinner with custom size', () => {
    const { container } = render(<LoadingSpinner size="large" />);

    const spinner = container.querySelector('.loading-spinner');
    expect(spinner).toHaveClass('loading-spinner--large');
  });

  it('renders spinner with message', () => {
    render(<LoadingSpinner message="Loading data..." />);

    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders full screen spinner', () => {
    const { container } = render(<LoadingSpinner fullScreen />);

    expect(container.querySelector('.loading-spinner__overlay')).toBeInTheDocument();
  });
});

describe('LoadingOverlay', () => {
  it('renders children when not loading', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders spinner overlay when loading', () => {
    const { container } = render(
      <LoadingOverlay isLoading={true} message="Loading...">
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(container.querySelector('.loading-overlay__backdrop')).toBeInTheDocument();
  });
});
