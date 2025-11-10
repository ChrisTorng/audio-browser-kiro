import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast, ToastContainer, ToastMessage } from '../../../src/client/components/Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders toast message correctly', () => {
    const toast: ToastMessage = {
      id: '1',
      type: 'info',
      message: 'Test message',
    };
    const onClose = vi.fn();

    render(<Toast toast={toast} onClose={onClose} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const toast: ToastMessage = {
      id: '1',
      type: 'info',
      message: 'Test message',
    };
    const onClose = vi.fn();

    render(<Toast toast={toast} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close notification');
    closeButton.click();

    expect(onClose).toHaveBeenCalledWith('1');
  });

  it('auto-closes after duration', () => {
    const toast: ToastMessage = {
      id: '1',
      type: 'info',
      message: 'Test message',
      duration: 3000,
    };
    const onClose = vi.fn();

    render(<Toast toast={toast} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(onClose).toHaveBeenCalledWith('1');
  });

  it('renders different toast types with correct styling', () => {
    const types: Array<ToastMessage['type']> = ['success', 'error', 'warning', 'info'];
    const onClose = vi.fn();

    types.forEach((type) => {
      const toast: ToastMessage = {
        id: `${type}-1`,
        type,
        message: `${type} message`,
      };

      const { container } = render(<Toast toast={toast} onClose={onClose} />);
      const toastElement = container.querySelector('.toast');

      expect(toastElement).toHaveClass(`toast--${type}`);
    });
  });
});

describe('ToastContainer', () => {
  it('renders multiple toasts', () => {
    const toasts: ToastMessage[] = [
      { id: '1', type: 'info', message: 'Message 1' },
      { id: '2', type: 'success', message: 'Message 2' },
      { id: '3', type: 'error', message: 'Message 3' },
    ];
    const onClose = vi.fn();

    render(<ToastContainer toasts={toasts} onClose={onClose} />);

    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 2')).toBeInTheDocument();
    expect(screen.getByText('Message 3')).toBeInTheDocument();
  });

  it('renders empty container when no toasts', () => {
    const onClose = vi.fn();

    const { container } = render(<ToastContainer toasts={[]} onClose={onClose} />);

    expect(container.querySelector('.toast-container')).toBeInTheDocument();
    expect(container.querySelector('.toast')).not.toBeInTheDocument();
  });
});
