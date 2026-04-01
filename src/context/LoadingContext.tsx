import React, { createContext, useContext } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { View, StyleSheet } from 'react-native';
import LoadingIndicator from '../components/LoadingIndicator';

interface LoadingContextType {
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoadingContext() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingContext must be used within LoadingProvider');
  }
  return context;
}

interface LoadingProviderProps {
  children: React.ReactNode;
}

/**
 * Global Loading Provider
 * - Circular loading overlay when React Query is fetching
 */
export function LoadingProvider({ children }: LoadingProviderProps) {
  // React Query isFetching hook - sayfada veri yükleniyorsa true
  const isFetching = useIsFetching({ predicate: (query) => query.state.status === 'pending' });
  const isLoading = isFetching > 0;

  return (
    <LoadingContext.Provider value={{ isLoading }}>
      {children}

      {/* Global Loading Overlay */}
      {isLoading && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
          <LoadingIndicator type="circular" size={56} />
        </View>
      )}
    </LoadingContext.Provider>
  );
}


const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});
