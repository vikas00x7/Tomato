import React, { createContext, useContext, ReactNode } from 'react';
import { useFingerprint } from '@/hooks/useFingerprint';

interface FingerprintContextType {
  visitorId: string | null;
  requestId: string | null;
  isLoading: boolean;
  browserDetails: any | null;
}

const FingerprintContext = createContext<FingerprintContextType>({
  visitorId: null,
  requestId: null,
  isLoading: true,
  browserDetails: null
});

export const useFingerprintContext = () => useContext(FingerprintContext);

export const FingerprintProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { fingerprint, isLoading } = useFingerprint();
  
  return (
    <FingerprintContext.Provider 
      value={{ 
        visitorId: fingerprint?.visitorId || null,
        requestId: fingerprint?.requestId || null,
        isLoading,
        browserDetails: fingerprint?.browserDetails || null
      }}
    >
      {children}
    </FingerprintContext.Provider>
  );
};
