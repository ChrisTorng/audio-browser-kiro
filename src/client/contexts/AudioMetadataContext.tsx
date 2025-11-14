import { createContext, useContext, ReactNode } from 'react';
import { useAudioMetadata, UseAudioMetadataReturn } from '../hooks/useAudioMetadata';

/**
 * Audio metadata context
 */
const AudioMetadataContext = createContext<UseAudioMetadataReturn | null>(null);

/**
 * Audio metadata provider props
 */
export interface AudioMetadataProviderProps {
  children: ReactNode;
}

/**
 * Audio metadata provider
 * Provides a single instance of useAudioMetadata to all child components
 */
export function AudioMetadataProvider({ children }: AudioMetadataProviderProps) {
  const audioMetadata = useAudioMetadata();

  return (
    <AudioMetadataContext.Provider value={audioMetadata}>
      {children}
    </AudioMetadataContext.Provider>
  );
}

/**
 * Hook to access audio metadata context
 * Must be used within AudioMetadataProvider
 */
export function useAudioMetadataContext(): UseAudioMetadataReturn {
  const context = useContext(AudioMetadataContext);
  
  if (!context) {
    throw new Error('useAudioMetadataContext must be used within AudioMetadataProvider');
  }
  
  return context;
}
