import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook that logs navigation events to the server
 * This is necessary for SPA (Single Page Applications) because 
 * client-side navigation doesn't trigger server requests
 */
export const useNavigationLogger = () => {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  const isInitialRenderRef = useRef<boolean>(true);
  
  useEffect(() => {
    // Skip the first render - the server will handle initial page loads
    // This prevents duplicate logging between server and client
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      prevLocationRef.current = location;
      return;
    }
    
    // Don't log if this is navigating to the same page or admin routes
    if (prevLocationRef.current === location || location.startsWith('/admin')) {
      return;
    }

    // Update the previous location reference
    prevLocationRef.current = location;
    
    // Don't log navigation to certain paths 
    if (location.includes('.') || 
        location.includes('api') || 
        location.startsWith('/@vite') ||
        location.includes('__vite')) {
      return;
    }
    
    console.log(`Client navigation to: ${location}`);
    
    // Add a small delay to ensure this is actual user navigation
    // and not just a part of the initial page setup
    setTimeout(() => {
      // Send navigation data to server
      // The server will detect the IP address and country on its side
      fetch('/api/log-navigation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: location,
          timestamp: new Date(),
          source: 'client-navigation'
        }),
      }).catch(err => console.error('Error logging navigation:', err));
    }, 50);
    
  }, [location]); // Only run when location changes
};
