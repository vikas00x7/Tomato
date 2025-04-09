import { useState, useEffect } from 'react';
import FingerprintJSPro from '@fingerprintjs/fingerprintjs-pro';

interface FingerprintResult {
  visitorId: string;
  requestId: string;
  confidence: number;
  browserDetails?: any;
  error?: string;
  timestamp: string;
}

export const useFingerprint = () => {
  const [fingerprint, setFingerprint] = useState<FingerprintResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getVisitorId = async () => {
      try {
        // Check for cached fingerprint first
        const cachedData = getCachedFingerprint();
        if (cachedData) {
          setFingerprint(cachedData);
          setIsLoading(false);
          
          // Still send the server log in the background to keep track of page views
          await logFingerprintToServer(cachedData);
          return;
        }
        
        setIsLoading(true);
        
        // Load FingerprintJS Pro with your public key
        const fpPromise = FingerprintJSPro.load({ 
          apiKey: 'YyZd7BoisT3YOSTejsVV'
        });
        
        const fp = await fpPromise;
        const result = await fp.get();
        
        const fingerprintData: FingerprintResult = {
          visitorId: result.visitorId,
          requestId: result.requestId,
          confidence: 100, // Pro version has high confidence
          browserDetails: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          timestamp: new Date().toISOString()
        };
        
        // Cache the fingerprint
        cacheFingerprint(fingerprintData);
        
        // Set state
        setFingerprint(fingerprintData);
        
        // Log to server
        await logFingerprintToServer(fingerprintData);
        
      } catch (error) {
        console.error('Error getting fingerprint:', error);
        const errorFingerprint: FingerprintResult = {
          visitorId: 'unknown',
          requestId: 'error',
          confidence: 0,
          browserDetails: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        };
        
        setFingerprint(errorFingerprint);
        
        // Still try to log the error to the server
        try {
          await logFingerprintToServer(errorFingerprint);
        } catch (logError) {
          console.error('Failed to log fingerprint error:', logError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    getVisitorId();
  }, []);

  // Cache fingerprint in localStorage with 24 hour expiry
  const cacheFingerprint = (data: FingerprintResult) => {
    try {
      localStorage.setItem('visitor_fingerprint', JSON.stringify({
        data,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Error caching fingerprint:', e);
    }
  };

  // Get cached fingerprint if still valid
  const getCachedFingerprint = (): FingerprintResult | null => {
    try {
      const cached = localStorage.getItem('visitor_fingerprint');
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const cacheTime = new Date(parsed.timestamp);
      const now = new Date();
      
      // Only use cache if it's less than 24 hours old
      if (now.getTime() - cacheTime.getTime() < 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
      
      // Clear invalid cache
      localStorage.removeItem('visitor_fingerprint');
      return null;
    } catch (e) {
      console.error('Error parsing cached fingerprint:', e);
      localStorage.removeItem('visitor_fingerprint');
      return null;
    }
  };

  // Log fingerprint to server
  const logFingerprintToServer = async (data: FingerprintResult) => {
    try {
      const response = await fetch('/api/log-fingerprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'tomato-api-key-9c8b7a6d5e4f3g2h1i'
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: window.location.pathname,
          fingerprint: data
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error logging fingerprint to server:', error);
      return false;
    }
  };

  return { fingerprint, isLoading };
};
