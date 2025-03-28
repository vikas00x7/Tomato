import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Since we couldn't install FingerprintJS through npm, we'll include it using a script tag in the head
// This will be loaded at runtime from CDN
declare global {
  interface Window {
    FingerprintJS: any;
  }
}

// Helper function to get a bypass token
const getBypassToken = () => {
  // This is a simplified implementation
  // In a real application, you might want to implement a more secure mechanism
  const token = 'tomato-restaurant-bypass-8675309';
  return token;
};

// Helper function to set a cookie
const setCookie = (name: string, value: string, days: number) => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  
  const cookieValue = `${name}=${value};expires=${expirationDate.toUTCString()};path=/;SameSite=Strict`;
  document.cookie = cookieValue;
};

const Paywall = () => {
  const [visitorInfo, setVisitorInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create and load FingerprintJS script
    const loadFingerprintJS = () => {
      return new Promise<void>((resolve) => {
        // Check if the script is already loaded
        if (window.FingerprintJS) {
          resolve();
          return;
        }
        
        // Create script element
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js';
        script.async = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    // Initialize FingerprintJS and get visitor information
    const getVisitorId = async () => {
      try {
        setIsLoading(true);
        
        // Load FingerprintJS from CDN
        await loadFingerprintJS();
        
        let visitorInfo;
        
        // Try to use FingerprintJS if it loaded successfully
        if (window.FingerprintJS) {
          const fp = await window.FingerprintJS.load();
          const result = await fp.get();
          visitorInfo = result;
        } else {
          // Fallback to basic browser information if FingerprintJS failed to load
          visitorInfo = {
            visitorId: Math.random().toString(36).substring(2, 15),
            components: {
              screenResolution: { value: `${window.screen.width}x${window.screen.height}` },
              userAgent: { value: navigator.userAgent },
              platform: { value: navigator.platform },
              language: { value: navigator.language },
              timezone: { value: Intl.DateTimeFormat().resolvedOptions().timeZone }
            }
          };
        }
        
        setVisitorInfo(visitorInfo);
        
        // Log visitor information to the server
        try {
          await fetch('/api/log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': 'your-secret-api-key-here'
            },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              path: window.location.pathname,
              userAgent: navigator.userAgent,
              referrer: document.referrer,
              fingerprint: visitorInfo,
              source: 'paywall_page',
              bypassAttempt: false
            }),
          });
        } catch (logError) {
          console.error('Error logging visitor info:', logError);
        }
      } catch (error) {
        console.error('Error getting visitor ID:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    getVisitorId();
  }, []);

  const handleBypassClick = async () => {
    try {
      setIsLoading(true);
      
      // Log this bypass attempt
      await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-secret-api-key-here'
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: window.location.pathname,
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          fingerprint: visitorInfo,
          source: 'paywall_page',
          bypassAttempt: true
        }),
      });
      
      // Set a bypass cookie
      const token = getBypassToken();
      setCookie('bot_bypass_token', token, 7); // Cookie expires in 7 days
      
      // Redirect to the home page
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging bypass attempt:', error);
      
      // Still redirect even if logging fails
      const token = getBypassToken();
      setCookie('bot_bypass_token', token, 7);
      window.location.href = '/';
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-6 md:p-8 bg-white shadow-lg">
        <div className="text-center mb-8">
          <div className="mb-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-16 h-16 mx-auto text-tomato-500"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Automated Access Detected</h1>
          <p className="text-lg text-gray-600">
            Our system has detected that you may be using automated tools to access this website.
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-medium text-gray-900 mb-2">Why am I seeing this page?</h2>
          <p className="text-gray-600 mb-3">
            This website is protected against automated scraping and bot traffic. We've detected signals that suggest your 
            browser might be:
          </p>
          <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-3">
            <li>A web scraping tool or bot</li>
            <li>Using automated browsing software</li>
            <li>Missing standard browser features</li>
            <li>Displaying unusual browsing patterns</li>
          </ul>
          <p className="text-gray-600">
            If you believe this is an error, you can request access using the button below.
          </p>
        </div>
        
        <div className="text-center">
          <Button 
            onClick={handleBypassClick}
            className="bg-tomato-500 hover:bg-tomato-600 text-white px-6 py-2 rounded-md"
            disabled={isLoading}
          >
            {isLoading ? "Checking browser..." : "I'm a real visitor - Grant me access"}
          </Button>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>If you continue to see this message, please contact us at support@bunnylovesoaps.com</p>
          </div>
        </div>
      </Card>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Protected by BunnyLoveSoaps Bot Protection</p>
        <p>© {new Date().getFullYear()} BunnyLoveSoaps - All rights reserved</p>
      </div>
    </div>
  );
};

export default Paywall;