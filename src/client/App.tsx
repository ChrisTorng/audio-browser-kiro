import React, { useEffect } from 'react';
import { AudioBrowser } from './components/AudioBrowser';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { ToastProvider } from './contexts/ToastContext';
import { AudioMetadataProvider } from './contexts/AudioMetadataContext';
import { useToast } from './hooks/useToast';
import { visualizationCache } from './utils/visualizationCache';

function AppContent() {
  const toast = useToast();

  // Initialize persistent storage on app start
  useEffect(() => {
    visualizationCache.initializePersistence().catch((error) => {
      console.warn('Failed to initialize visualization persistence:', error);
    });
  }, []);

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

function App() {
  return (
    <ToastProvider>
      <AudioMetadataProvider>
        <AppContent />
      </AudioMetadataProvider>
    </ToastProvider>
  );
}

export default App;
