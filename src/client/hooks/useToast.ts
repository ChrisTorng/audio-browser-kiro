import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../components/Toast';

/**
 * Hook for managing toast notifications
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  /**
   * Show a toast notification
   */
  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: ToastMessage = {
        id,
        type,
        message,
        duration,
      };

      setToasts((prev) => [...prev, toast]);
      return id;
    },
    []
  );

  /**
   * Show success toast
   */
  const success = useCallback(
    (message: string, duration?: number) => {
      return showToast(message, 'success', duration);
    },
    [showToast]
  );

  /**
   * Show error toast
   */
  const error = useCallback(
    (message: string, duration?: number) => {
      return showToast(message, 'error', duration);
    },
    [showToast]
  );

  /**
   * Show warning toast
   */
  const warning = useCallback(
    (message: string, duration?: number) => {
      return showToast(message, 'warning', duration);
    },
    [showToast]
  );

  /**
   * Show info toast
   */
  const info = useCallback(
    (message: string, duration?: number) => {
      return showToast(message, 'info', duration);
    },
    [showToast]
  );

  /**
   * Close a toast by ID
   */
  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Clear all toasts
   */
  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    success,
    error,
    warning,
    info,
    closeToast,
    clearAll,
  };
}
