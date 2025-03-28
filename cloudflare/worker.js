// Cloudflare Worker for bot detection and management
// This worker handles:
// 1. Allowing search engines to crawl the site
// 2. Detecting and redirecting bots to /paywall
// 3. Allowing visitors with a bypass token
// 4. Logging bot activity to our internal API

// Configuration
const CONFIG = {
  // Domains that are allowed to access the site
  allowedDomains: ['bunnylovesoaps.com'],
  
  // Search engine user agents that should be allowed
  searchEngines: [
    'googlebot',
    'bingbot',
    'yandexbot',
    'duckduckbot',
    'baiduspider',
    'facebookexternalhit',
    'twitterbot',
    'rogerbot',
    'linkedinbot',
    'embedly',
    'showyoubot',
    'outbrain',
    'pinterest',
    'slackbot',
    'vkShare',
    'W3C_Validator',
    'slurp',
    'yahoo'
  ],
  
  // Name of the cookie that contains the bypass token
  bypassCookieName: 'bot_bypass_token',
  
  // Secret value for the bypass token (change this to your own secret)
  bypassTokenValue: 'tomato-restaurant-bypass-8675309',
  
  // API endpoint to log bot visits
  logEndpoint: 'https://bunnylovesoaps.com/api/log',
  
  // Paywall URL to redirect bots to
  paywallUrl: '/paywall',
};

// Helper function to check if a user agent is from a known search engine
function isSearchEngine(userAgent) {
  if (!userAgent) return false;
  userAgent = userAgent.toLowerCase();
  
  return CONFIG.searchEngines.some(engine => userAgent.includes(engine));
}

// Helper function to check for a valid bypass token in cookies
function hasValidBypassToken(request) {
  const cookies = request.headers.get('Cookie') || '';
  const cookieMap = cookies.split(';').reduce((map, pair) => {
    const [key, value] = pair.trim().split('=');
    if (key) map[key] = value;
    return map;
  }, {});
  
  return cookieMap[CONFIG.bypassCookieName] === CONFIG.bypassTokenValue;
}

// Helper function to detect bots based on various signals
async function detectBot(request, userAgent) {
  // If it's a known search engine, it's not a "bad" bot
  if (isSearchEngine(userAgent)) {
    return false;
  }
  
  // Check for common bot signatures in user agent
  const botSignatures = [
    'bot', 'crawl', 'spider', 'headless', 'scrape', 'http', 'lighthouse',
    'slurp', 'archive', 'parse', 'phantom', 'detect', 'monitor',
    'whatsapp', 'facebook', 'twitter', 'slack', 'telegram'
  ];
  
  if (userAgent && botSignatures.some(sig => userAgent.toLowerCase().includes(sig))) {
    return true;
  }
  
  // Check missing or suspicious headers
  const acceptLanguage = request.headers.get('Accept-Language');
  const acceptEncoding = request.headers.get('Accept-Encoding');
  
  if (!acceptLanguage || !acceptEncoding) {
    return true;
  }
  
  // Additional checks could be added here
  
  // For this implementation, we'll do a simple check
  // More sophisticated bot detection would use more signals
  return false;
}

// Helper function to log bot visits to our API
async function logBotVisit(request, userAgent, isBotConfirmed) {
  // Gather information about the request
  const url = new URL(request.url);
  const cf = request.cf || {}; // Cloudflare-specific information
  
  // Prepare log data
  const logData = {
    timestamp: new Date().toISOString(),
    path: url.pathname,
    userAgent: userAgent || 'Not provided',
    ip: cf.ip || request.headers.get('CF-Connecting-IP') || 'Unknown',
    country: cf.country || 'Unknown',
    isBotConfirmed: isBotConfirmed,
    headers: {
      acceptLanguage: request.headers.get('Accept-Language') || 'Not provided',
      acceptEncoding: request.headers.get('Accept-Encoding') || 'Not provided',
      host: request.headers.get('Host') || 'Not provided',
      referer: request.headers.get('Referer') || 'Not provided',
    }
  };
  
  // Send log data to our API
  try {
    const response = await fetch(CONFIG.logEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add an API key or secret to secure the logging endpoint
        'X-API-Key': 'your-secret-api-key-here'
      },
      body: JSON.stringify(logData)
    });
    
    // Check if logging was successful
    if (!response.ok) {
      console.error('Failed to log bot visit:', await response.text());
    }
  } catch (error) {
    console.error('Error logging bot visit:', error);
  }
}

// Main handler for all requests
async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Skip bot detection for static assets and API routes
  if (
    url.pathname.startsWith('/assets/') || 
    url.pathname.startsWith('/api/') || 
    url.pathname === CONFIG.paywallUrl || 
    url.pathname.includes('.ico') ||
    url.pathname.includes('.png') ||
    url.pathname.includes('.jpg') ||
    url.pathname.includes('.svg') ||
    url.pathname.includes('.css') ||
    url.pathname.includes('.js')
  ) {
    return fetch(request);
  }
  
  // Get the user agent
  const userAgent = request.headers.get('User-Agent') || '';
  
  // Check if this is a search engine
  if (isSearchEngine(userAgent)) {
    // Allow search engines to crawl the site
    return fetch(request);
  }
  
  // Check if user has a valid bypass token
  if (hasValidBypassToken(request)) {
    // Allow users with a valid bypass token
    return fetch(request);
  }
  
  // Detect if the request is from a bot
  const isBot = await detectBot(request, userAgent);
  
  // If it's a bot, log the visit and redirect to the paywall
  if (isBot) {
    // Log the bot visit
    await logBotVisit(request, userAgent, true);
    
    // Redirect to paywall
    return Response.redirect(`${url.origin}${CONFIG.paywallUrl}`, 302);
  }
  
  // Forward the request to the origin
  return fetch(request);
}

// Entry point for the worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});