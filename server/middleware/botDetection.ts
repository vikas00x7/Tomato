import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import geoip from 'geoip-lite';

// Bot detection patterns - refined to reduce false positives
const BOT_USER_AGENT_PATTERNS = [
  // Search engine bots - high confidence
  'googlebot', 'bingbot', 'yandexbot', 'baiduspider', 'slurp',
  
  // Common crawlers - high confidence
  'crawler', 'spider', 'ahrefsbot', 'semrushbot',
  
  // Automation tools - medium confidence
  'puppeteer', 'selenium', 'headless', 'phantomjs',
  
  // Generic patterns - low confidence (require additional signals)
  'bot', 'scrape'
];

// AI-specific bot patterns - added for AI assistant detection
const AI_BOT_PATTERNS = [
  // Official AI assistant user agents
  'chatgpt', 'gptbot', 'claude-web', 'anthropic', 'bard', 'openai',
  'cohere', 'perplexity', 'browsergpt', 'ai-assisted', 'ai-browser',
  
  // New AI agents (2024-2025)
  'claude-3', 'gpt-4', 'gemini-pro', 'llama', 'mistral', 'pi.ai',
  'phind-bot', 'kagi-bot', 'you.com', 'neeva', 'codeium', 'copilot-browse',
  'anthropic-ai', 'meta-llama', 'vicuna', 'searxng', 'searx', 'golaxy',
  
  // Common AI crawling services
  'diffbot', 'aimbot', 'botasaurus', 'intelli-bot', 'ai-crawler',
  'ai-agent', 'web-agent', 'ai-search', 'web-intelligence'
];

// Professional scraping tools - added for commercial scraper detection
const SCRAPING_TOOLS_PATTERNS = [
  'firecrawl', 'octoparse', 'parsehub', 'scrapy', 'scrapinghub',
  'webscrapingapi', 'scrapingbee', 'brightdata', 'proxycrawl',
  'datahen', 'webscraper', 'crawlera', 'zyte', 'apify'
];

// Combine all detection patterns
const ALL_BOT_PATTERNS = [
  ...BOT_USER_AGENT_PATTERNS,
  ...AI_BOT_PATTERNS,
  ...SCRAPING_TOOLS_PATTERNS
];

// Search engine bots that should be authorized
const AUTHORIZED_BOT_PATTERNS = [
  'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'facebookexternalhit', 
  'twitterbot', 'linkedinbot', 'pinterestbot', 'slurp'
];

// List of paths bots are allowed to access without paywall
const ALLOWED_BOT_PATHS = [
  '/', '/about', '/contact', '/robots.txt', '/sitemap.xml', // Public pages
  '/api/log-navigation'      // API endpoints bots need
];

// Detection confidence levels
const CONFIDENCE = {
  LOW: 20,
  MEDIUM: 35,
  HIGH: 70,
  THRESHOLD: 90 // Raised threshold to reduce false positives
};

// Cached timing data to detect behavioral patterns
const requestTimingCache = new Map<string, {
  lastRequestTime: number,
  requestTimes: number[],
  pageSequence: string[],
  jsEnabled?: boolean,
  cookiesEnabled?: boolean,
  screenInfo?: string,
  timezone?: string,
  fingerprints: string[]
}>();

// Browser capabilities that legitimate browsers should support
const BROWSER_CAPABILITIES = [
  'navigator.webdriver',
  'window.chrome',
  'navigator.plugins',
  'navigator.languages',
  'navigator.productSub',
  'window.DeviceOrientationEvent',
  'window.DeviceMotionEvent'
];

// Check if this visitor is likely a bot with a confidence score
export const detectBot = (req: Request): {
  isBot: boolean, 
  authorized: boolean,
  confidence: number,
  reasons: string[],
  botType?: string
} => {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const referer = req.headers['referer'] || '';
  const ip = getClientIp(req);
  const accept = req.headers['accept'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const connection = req.headers['connection'] || '';
  const cookies = req.headers['cookie'] || '';
  
  let confidence = 0;
  const reasons: string[] = [];
  let botType: string | undefined;
  
  // 1. Check for bot patterns in user agent (highest signal)
  const matchedPattern = ALL_BOT_PATTERNS.find(pattern => 
    userAgent.includes(pattern)
  );
  
  if (matchedPattern) {
    // Assign different confidence based on the matched pattern type
    if (BOT_USER_AGENT_PATTERNS.includes(matchedPattern)) {
      if (['googlebot', 'bingbot', 'yandexbot', 'baiduspider', 'slurp'].includes(matchedPattern)) {
        confidence += CONFIDENCE.HIGH;
        reasons.push(`Search engine bot user agent (${matchedPattern})`);
        botType = 'search_engine';
      } else if (['crawler', 'spider', 'ahrefsbot', 'semrushbot'].includes(matchedPattern)) {
        confidence += CONFIDENCE.HIGH;
        reasons.push(`Known crawler user agent (${matchedPattern})`);
        botType = 'crawler';
      } else if (['puppeteer', 'selenium', 'headless', 'phantomjs'].includes(matchedPattern)) {
        confidence += CONFIDENCE.MEDIUM;
        reasons.push(`Automation tool detected (${matchedPattern})`);
        botType = 'automation';
      } else {
        confidence += CONFIDENCE.LOW;
        reasons.push(`Generic bot pattern (${matchedPattern})`);
        botType = 'generic_bot';
      }
    } else if (AI_BOT_PATTERNS.includes(matchedPattern)) {
      confidence += CONFIDENCE.HIGH;
      reasons.push(`AI assistant bot detected (${matchedPattern})`);
      botType = 'ai_assistant';
    } else if (SCRAPING_TOOLS_PATTERNS.includes(matchedPattern)) {
      confidence += CONFIDENCE.HIGH;
      reasons.push(`Professional scraping tool detected (${matchedPattern})`);
      botType = 'scraping_tool';
    }
  }
  
  // 2. Check for missing headers that browsers typically have
  if (!req.headers['accept-language']) {
    confidence += CONFIDENCE.LOW;
    reasons.push('Missing Accept-Language header');
  }
  
  // 3. Check for unusual request patterns
  if (req.headers['sec-fetch-mode'] === 'navigate' && !req.headers['sec-ch-ua']) {
    confidence += CONFIDENCE.MEDIUM;
    reasons.push('Missing modern browser identifiers');
  }
  
  // 4. AI-specific detection: Check for inconsistent header combinations
  // AI tools sometimes have unusual header combinations
  if (
    req.headers['accept'] && 
    req.headers['accept-language'] &&
    !req.headers['sec-ch-ua-platform'] && 
    !req.headers['sec-fetch-dest']
  ) {
    confidence += CONFIDENCE.MEDIUM;
    reasons.push('Inconsistent modern headers (possible AI browser)');
    botType = botType || 'possible_ai';
  }
  
  // 5. Enhanced AI bot detection: Check for additional AI-specific patterns
  if (!botType || botType === 'possible_ai') {
    // Check for AI-like behavior in referrers
    const referrerPatterns = ['ai.', 'gpt.', 'chat.', 'claude.', 'bing.com/search', 'bard.google'];
    if (referer && referrerPatterns.some(pattern => referer.toLowerCase().includes(pattern))) {
      confidence += CONFIDENCE.MEDIUM;
      reasons.push(`AI service referrer detected (${referer})`);
      botType = botType || 'ai_assistant';
    }
    
    // Detect anonymized or streamlined user agents (common in AI browsers)
    if (
      userAgent.length < 50 || // Unusually short user agent
      userAgent.includes('mozilla') && userAgent.split(' ').length <= 3 // Simplified Mozilla UA
    ) {
      confidence += CONFIDENCE.LOW;
      reasons.push('Simplified or anonymized user agent (possible AI browser)');
      botType = botType || 'possible_ai';
    }
  }
  
  // 6. Detect unusual timing patterns (AI browsing tends to be very consistent)
  const timing = checkRequestTiming(req, ip);
  if (timing.isUnnatural) {
    confidence += CONFIDENCE.MEDIUM;
    reasons.push(`Unnatural timing pattern: ${timing.reason}`);
    botType = botType || 'timing_anomaly';
  }
  
  // 7. Browser fingerprinting checks
  const fingerprint = req.query.fingerprint || req.headers['x-browser-fingerprint'];
  const clientHints = req.headers['sec-ch-ua-platform'] && req.headers['sec-ch-ua'];
  
  // Check for fingerprint inconsistencies
  if (fingerprint) {
    // Store fingerprint for this IP if we're tracking it
    const timingData = requestTimingCache.get(ip);
    if (timingData) {
      // If fingerprint changes for the same IP in a short time period, it's suspicious
      if (!timingData.fingerprints.includes(fingerprint as string)) {
        timingData.fingerprints.push(fingerprint as string);
        
        // Multiple different fingerprints from same IP is suspicious
        if (timingData.fingerprints.length > 2) {
          confidence += CONFIDENCE.MEDIUM;
          reasons.push(`Multiple different fingerprints from same IP (${timingData.fingerprints.length})`);
          botType = botType || 'possible_ai';
        }
      }
      
      // Store JS capability info if provided
      if (req.query.jsEnabled !== undefined) {
        timingData.jsEnabled = req.query.jsEnabled === 'true';
      }
      
      // Store cookie capability info if provided
      if (req.query.cookiesEnabled !== undefined) {
        timingData.cookiesEnabled = req.query.cookiesEnabled === 'true';
      }
      
      // If browser reports no JS or cookies, highly suspicious
      if (timingData.jsEnabled === false || timingData.cookiesEnabled === false) {
        confidence += CONFIDENCE.HIGH;
        reasons.push(`Limited browser capabilities: JS:${timingData.jsEnabled}, Cookies:${timingData.cookiesEnabled}`);
        botType = botType || 'automation';
      }
      
      // Store the timing data back
      requestTimingCache.set(ip, timingData);
    }
  } else if (req.method === 'GET' && !req.path.includes('/api/') && !req.path.includes('.')) {
    // For page requests, missing fingerprint is suspicious for modern browsers
    // But only for actual page requests, not API or asset requests
    if (clientHints) {
      // Modern browser with client hints but no fingerprint - unusual
      confidence += CONFIDENCE.LOW;
      reasons.push('Modern browser missing fingerprint data');
    }
  }
  
  // 8. Header consistency checks
  const headerConsistencyScore = checkHeaderConsistency(req);
  if (headerConsistencyScore > 0) {
    confidence += headerConsistencyScore;
    reasons.push(`Inconsistent header patterns (score: ${headerConsistencyScore})`);
    if (headerConsistencyScore >= CONFIDENCE.MEDIUM && !botType) {
      botType = 'possible_ai';
    }
  }
  
  // 9. Check for authorized bot signatures
  const isAuthorizedBot = AUTHORIZED_BOT_PATTERNS.some(pattern => 
    userAgent.includes(pattern)
  );
  
  // Authorized bots automatically get high confidence
  if (isAuthorizedBot) {
    confidence = CONFIDENCE.HIGH;
    if (!reasons.length) {
      reasons.push(`Authorized bot pattern detected (${userAgent})`);
    }
    botType = 'authorized_bot';
  }
  
  // Determine if this is a bot based on confidence threshold
  // Cap confidence at 100% for cleaner logging
  const cappedConfidence = Math.min(confidence, 100);
  const isBot = cappedConfidence >= CONFIDENCE.THRESHOLD;
  
  // Set explicit botType for humans if none was set but we confirmed it's not a bot
  if (!isBot && !botType) {
    botType = 'human';
  }
  
  return { 
    isBot, 
    authorized: isAuthorizedBot,
    confidence: cappedConfidence,
    reasons,
    botType
  };
};

// Check for inconsistencies in HTTP headers that might indicate bot activity
function checkHeaderConsistency(req: Request): number {
  let score = 0;
  const headers = req.headers;
  const userAgent = (headers['user-agent'] || '').toLowerCase();
  
  // Chrome browser checks
  if (userAgent.includes('chrome')) {
    // Chrome browsers should have these headers
    if (!headers['sec-ch-ua'] || !headers['sec-ch-ua-mobile'] || !headers['sec-ch-ua-platform']) {
      score += CONFIDENCE.MEDIUM;
    }
    
    // If claiming to be Chrome but missing Chrome-specific capabilities
    if (!headers['upgrade-insecure-requests'] && !headers['sec-fetch-site']) {
      score += CONFIDENCE.LOW;
    }
  }
  
  // Safari checks
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    // Safari typically includes these
    if (headers['sec-fetch-site'] || headers['sec-ch-ua']) {
      // Safari doesn't use these Chrome-specific headers, so this is inconsistent
      score += CONFIDENCE.MEDIUM;
    }
  }
  
  // Firefox checks
  if (userAgent.includes('firefox')) {
    if (headers['sec-ch-ua']) {
      // Firefox doesn't typically use this Chrome header
      score += CONFIDENCE.LOW;
    }
  }
  
  // Check accept headers
  const accept = headers['accept'];
  if (accept) {
    // Browsers typically have more complex accept headers
    if (accept === '*/*' && req.method === 'GET' && !req.path.includes('/api/')) {
      // Simple wildcard accept header for a page request is suspicious
      score += CONFIDENCE.LOW;
    }
  }
  
  // AI bots often have weird accept-language values
  const acceptLanguage = headers['accept-language'];
  if (acceptLanguage) {
    // Unusual patterns in accept-language
    if (acceptLanguage === 'en' || acceptLanguage === 'en-US' || acceptLanguage.length < 3) {
      score += CONFIDENCE.LOW;
    }
    
    // Real browsers typically send more detailed language preferences
    const langParts = acceptLanguage.split(',');
    if (langParts.length === 1 && !acceptLanguage.includes('q=')) {
      score += CONFIDENCE.LOW;
    }
  }
  
  return score;
}

// Extract client IP with CloudFlare and proxy support
function getClientIp(req: Request): string {
  // First check CloudFlare-specific headers
  if (req.headers['cf-connecting-ip']) {
    // If request comes through CloudFlare, use their provided header
    return Array.isArray(req.headers['cf-connecting-ip']) 
      ? req.headers['cf-connecting-ip'][0] 
      : req.headers['cf-connecting-ip'];
  } else if (req.headers['x-forwarded-for']) {
    // If using another proxy or load balancer, get the first IP in the chain
    const forwardedFor = req.headers['x-forwarded-for'];
    let forwardedIps: string;
    
    if (Array.isArray(forwardedFor)) {
      // If it's an array, take the first entry
      forwardedIps = forwardedFor[0];
    } else {
      // Otherwise convert to string
      forwardedIps = String(forwardedFor);
    }
    
    // The x-forwarded-for header can contain multiple IPs separated by commas
    // We want to ensure we only get the first IP (client's real IP)
    const firstIp = forwardedIps.split(',')[0].trim();
    console.log(`Extracted IP from x-forwarded-for: ${firstIp} (from full value: ${forwardedIps})`);
    return firstIp;
  } else {
    // Fall back to the socket address if no proxy headers are present
    return req.socket.remoteAddress || 'unknown';
  }
}

// Check for unnatural timing patterns in requests
function checkRequestTiming(req: Request, ip: string): { isUnnatural: boolean, reason?: string } {
  const now = Date.now();
  const path = req.path || '/';
  
  // Initialize timing data for this IP if not exists
  if (!requestTimingCache.has(ip)) {
    requestTimingCache.set(ip, {
      lastRequestTime: now,
      requestTimes: [],
      pageSequence: [path],
      fingerprints: []
    });
    return { isUnnatural: false };
  }
  
  // Get existing timing data
  const timingData = requestTimingCache.get(ip)!;
  
  // Calculate time since last request
  const timeSinceLastRequest = now - timingData.lastRequestTime;
  
  // Update timing data
  timingData.requestTimes.push(timeSinceLastRequest);
  timingData.lastRequestTime = now;
  timingData.pageSequence.push(path);
  
  // Limit the size of stored data
  if (timingData.requestTimes.length > 20) {
    timingData.requestTimes.shift();
  }
  if (timingData.pageSequence.length > 20) {
    timingData.pageSequence.shift();
  }
  
  // Check for unnatural patterns, but only if we have enough data
  if (timingData.requestTimes.length < 5) {  // Increased from 3 to 5
    return { isUnnatural: false };
  }
  
  // Analyze timing consistency - bots often have very consistent timing
  const timings = timingData.requestTimes;
  let isUnnatural = false;
  let reason = '';
  
  // Check for too-consistent timing (AI bots often have machine-precise timing)
  if (timings.length >= 8) {  // Increased from 5 to 8
    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
    
    // Calculate standard deviation
    const variance = timings.reduce((a, b) => a + Math.pow(b - avgTiming, 2), 0) / timings.length;
    const stdDev = Math.sqrt(variance);
    
    // Extremely low standard deviation suggests automated behavior
    // Human timing naturally varies considerably - made this less sensitive
    if (stdDev < 20 && avgTiming < 1000) {  // More restrictive conditions
      isUnnatural = true;
      reason = `Suspiciously consistent timing (stdDev: ${stdDev.toFixed(2)}ms)`;
    }
  }
  
  // Check for unnaturally fast navigation through many pages
  if (timingData.requestTimes.length >= 5) {  // Increased from 3 to 5
    const fastRequests = timingData.requestTimes.filter(t => t < 200).length;  // Reduced from 1000 to 200
    // If most requests are very quick in succession, it's suspicious
    if (fastRequests >= Math.min(8, timingData.requestTimes.length * 0.9)) {  // More restrictive
      isUnnatural = true;
      reason = `Too many rapid requests (${fastRequests} requests < 200ms)`;
    }
  }
  
  // Check for unusual navigation patterns
  const pages = timingData.pageSequence;
  if (pages.length >= 8) {  // Increased from 4 to 8
    // Check for exactly repeating patterns, which is highly unusual for humans
    const patternLength = 3;  // Increased from 2 to 3
    let hasRepeatingPattern = true;
    
    for (let i = 0; i < patternLength; i++) {
      if (pages[pages.length - 1 - i] !== pages[pages.length - 1 - patternLength - i]) {
        hasRepeatingPattern = false;
        break;
      }
    }
    
    if (hasRepeatingPattern) {
      isUnnatural = true;
      reason = `Repeating navigation pattern detected`;
    }
  }
  
  // Save the updated timing data
  requestTimingCache.set(ip, timingData);
  
  return { isUnnatural, reason };
}

// Bot detection middleware
export const botDetectionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip bot detection for static files, API endpoints, admin routes, and paywall
  if (
    req.path.includes('.') || 
    req.path.startsWith('/api') || 
    req.path.startsWith('/admin') || 
    req.path === '/login' ||
    req.path.startsWith('/paywall')
  ) {
    return next();
  }
  
  // Detect if visitor is a bot
  const { isBot, authorized, confidence, reasons, botType } = detectBot(req);
  
  // Extract IP address with proper CloudFlare support
  const ip = getClientIp(req);
  
  // Get country information from IP address
  let country = 'unknown';
  try {
    // Don't lookup for localhost/private IP addresses
    if (ip !== 'unknown' && 
        !ip.startsWith('127.') && 
        !ip.startsWith('192.168.') &&
        !ip.startsWith('10.')) {
      const geo = geoip.lookup(ip);
      if (geo && geo.country) {
        country = geo.country;
      }
    } else if (process.env.NODE_ENV === 'development') {
      // In development, use a placeholder country
      country = 'US';
    }
  } catch (error) {
    console.error('Error detecting country:', error);
  }
  
  // Store bot detection result in request for other middleware to use
  req.botInfo = { 
    isBot, 
    authorized, 
    ipAddress: ip,
    country,
    confidence,
    reasons,
    botType
  };
  
  // Add a subtle JavaScript-based detection for AI browsers
  // This helps identify sophisticated AI tools that execute JS
  if (!isBot && req.headers['accept'] && req.headers['accept'].includes('text/html')) {
    res.locals.runBotDetection = true;
  }
  
  // Log the visit with bot detection results
  const logData = {
    ipAddress: ip,
    userAgent: req.headers['user-agent'] || 'unknown',
    path: req.path,
    timestamp: new Date(),
    country: country,
    isBotConfirmed: isBot,
    confidence: confidence,
    reasons: reasons,
    botType: botType || 'unknown',
    bypassAttempt: false,
    source: isBot ? (authorized ? 'authorized-bot' : 'unauthorized-bot') : 'human-visitor',
  };
  
  try {
    // Log asynchronously but don't wait
    storage.createBotLog(logData)
      .catch(err => console.error('Error logging bot detection:', err));
  } catch (error) {
    console.error('Error in bot detection middleware:', error);
  }
  
  // Continue to next middleware
  next();
};

// Access control middleware based on bot detection
export const accessControlMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // If bot detection wasn't run, run it now
  if (!req.botInfo) {
    const { isBot, authorized, confidence, reasons, botType } = detectBot(req);
    const ip = getClientIp(req);
    
    req.botInfo = { 
      isBot, 
      authorized, 
      ipAddress: ip, 
      country: 'unknown',
      confidence,
      reasons,
      botType
    };
  }
  
  const { isBot, authorized, confidence, botType } = req.botInfo;
  
  // If not a bot, allow access immediately
  if (!isBot) {
    return next();
  }
  
  // Check if this is already a redirect to prevent loops
  const redirectCount = parseInt(req.query.redirect_count as string || '0');
  
  // Log the bot visit for analytics before any potential redirect
  // This ensures we capture all bot types in our analytics, even if they get redirected
  try {
    const logData = {
      ipAddress: req.botInfo.ipAddress,
      userAgent: req.headers['user-agent'] as string,
      path: req.path,
      timestamp: new Date(),
      country: req.botInfo.country,
      isBotConfirmed: true,
      botType: botType || 'unknown',
      bypassAttempt: false,
      source: botType === 'ai_assistant' ? 'ai-browser' : 'bot-visitor',
      redirectCount
    };

    // Log asynchronously but don't block the response
    storage.createBotLog(logData)
      .catch(err => console.error('Error logging bot in access control:', err));
  } catch (error) {
    console.error('Error logging bot visit:', error);
  }
  
  // If we've already redirected too many times, show the block page instead of redirecting again
  if (redirectCount > 2) {
    console.log(`Preventing redirect loop for ${botType} bot (redirect count: ${redirectCount})`);
    const blockPage = `
      <html>
        <head><title>Access Limited</title></head>
        <body>
          <h1>Access Limited</h1>
          <p>This content is not available to automated browsing tools.</p>
          <p>Bot type detected: ${botType || 'Unknown'}</p>
          <p>Confidence: ${confidence}%</p>
        </body>
      </html>
    `;
    return res.status(403).send(blockPage);
  }
  
  // Special handling for AI assistants - we want to direct them to specific content
  if (botType === 'ai_assistant') {
    // Allow AI tools to access specific content to ensure they can summarize your site properly
    if (['/robots.txt', '/sitemap.xml', '/', '/about'].includes(req.path)) {
      return next();
    }
    
    // For all other paths, redirect to paywall with AI-specific messaging and increment redirect count
    return res.redirect(`/paywall?source=ai_assistant&returnUrl=${encodeURIComponent(req.originalUrl || req.url)}&confidence=${confidence}&redirect_count=${redirectCount + 1}`);
  }
  
  // If an unauthorized bot, redirect to paywall
  if (isBot && !authorized) {
    // Log the redirect for debugging
    console.log(`Redirecting unauthorized bot to paywall. Confidence: ${confidence}%. Type: ${botType}. Path: ${req.path}`);
    
    // Instead of blocking with 403, redirect to paywall with redirect counter
    return res.redirect(`/paywall?source=bot_detection&botType=${botType}&returnUrl=${encodeURIComponent(req.originalUrl || req.url)}&confidence=${confidence}&redirect_count=${redirectCount + 1}`);
  }
  
  // If an authorized bot, check if path is allowed or needs paywall
  if (isBot && authorized) {
    // Allow access to certain paths for authorized bots
    if (ALLOWED_BOT_PATHS.includes(req.path)) {
      return next();
    }
    
    // For other paths, redirect to paywall with redirect counter
    return res.redirect(`/paywall?source=authorized_bot&returnPath=${encodeURIComponent(req.path)}&redirect_count=${redirectCount + 1}`);
  }
  
  // Default case - allow access
  next();
};

// Add types to Express Request
declare global {
  namespace Express {
    interface Request {
      botInfo?: {
        isBot: boolean;
        authorized: boolean;
        ipAddress: string;
        country: string;
        confidence: number;
        reasons: string[];
        botType?: string;
      }
    }
  }
}
