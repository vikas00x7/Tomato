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
  
  // Common AI crawling services
  'diffbot', 'aimbot', 'botasaurus', 'intelli-bot', 'ai-crawler'
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
  LOW: 30,
  MEDIUM: 60,
  HIGH: 90,
  THRESHOLD: 70 // Confidence threshold to mark as a bot
};

// Cached timing data to detect behavioral patterns
const requestTimingCache = new Map<string, {
  lastRequestTime: number,
  requestTimes: number[],
  pageSequence: string[]
}>();

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
  
  // 5. Detect unusual timing patterns (AI browsing tends to be very consistent)
  const timing = checkRequestTiming(req, ip);
  if (timing.isUnnatural) {
    confidence += CONFIDENCE.MEDIUM;
    reasons.push(`Unnatural timing pattern: ${timing.reason}`);
    botType = botType || 'timing_anomaly';
  }
  
  // 6. Check for authorized bot signatures
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
  const isBot = confidence >= CONFIDENCE.THRESHOLD;
  
  return { 
    isBot, 
    authorized: isAuthorizedBot,
    confidence,
    reasons,
    botType
  };
};

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
    const forwardedIps = Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for'];
    
    // The x-forwarded-for header can contain multiple IPs separated by commas
    // The leftmost IP is the original client IP
    return forwardedIps.split(',')[0].trim();
  } else {
    // Fall back to the socket address if no proxy headers are present
    return req.socket.remoteAddress || 'unknown';
  }
}

// Check for unnatural timing patterns in requests
function checkRequestTiming(req: Request, ip: string): { isUnnatural: boolean, reason?: string } {
  const now = Date.now();
  const cacheKey = `${ip}-${req.headers['user-agent'] || ''}`;
  
  // Initialize or get existing timing data
  if (!requestTimingCache.has(cacheKey)) {
    requestTimingCache.set(cacheKey, {
      lastRequestTime: now,
      requestTimes: [],
      pageSequence: [req.path]
    });
    return { isUnnatural: false };
  }
  
  const timing = requestTimingCache.get(cacheKey)!;
  const timeSinceLastRequest = now - timing.lastRequestTime;
  
  // Update timing data
  timing.requestTimes.push(timeSinceLastRequest);
  timing.pageSequence.push(req.path);
  timing.lastRequestTime = now;
  
  // Keep only the last 10 requests
  if (timing.requestTimes.length > 10) {
    timing.requestTimes.shift();
    timing.pageSequence.shift();
  }
  
  // Not enough data to make a determination
  if (timing.requestTimes.length < 3) {
    return { isUnnatural: false };
  }
  
  // Check for unusually consistent timing patterns (often seen with AI bots)
  const timings = timing.requestTimes;
  const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
  const deviations = timings.map(t => Math.abs(t - avgTime));
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  
  // If timing is too consistent (low deviation) across multiple requests
  if (timings.length >= 5 && avgDeviation < 200 && avgTime < 5000) {
    return { 
      isUnnatural: true, 
      reason: 'Suspiciously consistent request timing' 
    };
  }
  
  // Check for sequential access pattern (going through pages in order)
  const uniquePages = new Set(timing.pageSequence).size;
  if (timing.pageSequence.length >= 5 && uniquePages === timing.pageSequence.length) {
    return { 
      isUnnatural: true, 
      reason: 'Sequential page access pattern' 
    };
  }
  
  return { isUnnatural: false };
}

// Bot detection middleware
export const botDetectionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip bot detection for static files and API endpoints
  if (req.path.includes('.') || req.path.startsWith('/api')) {
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
  
  // Special handling for AI assistants - we want to direct them to specific content
  if (botType === 'ai_assistant') {
    // Allow AI tools to access specific content to ensure they can summarize your site properly
    if (['/robots.txt', '/sitemap.xml', '/', '/about'].includes(req.path)) {
      return next();
    }
    
    // For all other paths, redirect to paywall with AI-specific messaging
    return res.redirect(`/paywall?source=ai_assistant&returnUrl=${encodeURIComponent(req.originalUrl || req.url)}&confidence=${confidence}`);
  }
  
  // If an unauthorized bot, redirect to paywall
  if (isBot && !authorized) {
    // Log the redirect for debugging
    console.log(`Redirecting unauthorized bot to paywall. Confidence: ${confidence}%. Type: ${botType}. Path: ${req.path}`);
    
    // Instead of blocking with 403, redirect to paywall
    return res.redirect(`/paywall?source=bot_detection&botType=${botType}&returnUrl=${encodeURIComponent(req.originalUrl || req.url)}&confidence=${confidence}`);
  }
  
  // If an authorized bot, check if path is allowed or needs paywall
  if (isBot && authorized) {
    // Allow access to certain paths for authorized bots
    if (ALLOWED_BOT_PATHS.includes(req.path)) {
      return next();
    }
    
    // For other paths, redirect to paywall
    return res.redirect(`/paywall?source=authorized_bot&returnPath=${encodeURIComponent(req.path)}`);
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
