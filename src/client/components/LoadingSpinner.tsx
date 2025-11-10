interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({
  size = 'medium',
  message,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`loading-spinner loading-spinner--${size}`}>
      <div className="loading-spinner__circle" />
      {message && <div className="loading-spinner__message">{message}</div>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-spinner__overlay">
        {spinner}
      </div>
    );
  }

  return spinner;
}

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

/**
 * Loading overlay that can wrap content
 */
export function LoadingOverlay({
  isLoading,
  message,
  children,
}: LoadingOverlayProps) {
  return (
    <div className="loading-overlay">
      {children}
      {isLoading && (
        <div className="loading-overlay__backdrop">
          <LoadingSpinner size="large" message={message} />
        </div>
      )}
    </div>
  );
}
