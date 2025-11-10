import React from 'react';
import { AudioBrowser } from './components/AudioBrowser';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';

function App() {
  const toast = useToast();

  // Handle global errors
  const handleError = (error: Error) => {
    toast.error(`Application error: ${error.message}`);
  };

  return (
    <ErrorBoundary onError={handleError}>
      <div className="app">
        <AudioBrowser />
        <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
