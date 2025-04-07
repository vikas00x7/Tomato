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

// Check if this visitor is likely a bot with a confidence score
export const detectBot = (req: Request): {
  isBot: boolean, 
  authorized: boolean,
  confidence: number,
  reasons: string[]
} => {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const referer = req.headers['referer'] || '';
  let confidence = 0;
  const reasons: string[] = [];
  
  // 1. Check for bot patterns in user agent (highest signal)
  const matchedPattern = BOT_USER_AGENT_PATTERNS.find(pattern => 
    userAgent.includes(pattern)
  );
  
  if (matchedPattern) {
    // Assign different confidence based on the matched pattern
    if (['googlebot', 'bingbot', 'yandexbot', 'baiduspider', 'slurp'].includes(matchedPattern)) {
      confidence += CONFIDENCE.HIGH;
      reasons.push(`Search engine bot user agent (${matchedPattern})`);
    } else if (['crawler', 'spider', 'ahrefsbot', 'semrushbot'].includes(matchedPattern)) {
      confidence += CONFIDENCE.HIGH;
      reasons.push(`Known crawler user agent (${matchedPattern})`);
    } else if (['puppeteer', 'selenium', 'headless', 'phantomjs'].includes(matchedPattern)) {
      confidence += CONFIDENCE.MEDIUM;
      reasons.push(`Automation tool detected (${matchedPattern})`);
    } else {
      confidence += CONFIDENCE.LOW;
      reasons.push(`Generic bot pattern (${matchedPattern})`);
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
  
  // 4. Rapid access pattern check
  // This would require session storage, using a placeholder for now
  
  // 5. Check for authorized bot signatures
  const isAuthorizedBot = AUTHORIZED_BOT_PATTERNS.some(pattern => 
    userAgent.includes(pattern)
  );
  
  // Authorized bots automatically get high confidence
  if (isAuthorizedBot) {
    confidence = CONFIDENCE.HIGH;
    if (!reasons.length) {
      reasons.push(`Authorized bot pattern detected (${userAgent})`);
    }
  }
  
  // Determine if this is a bot based on confidence threshold
  const isBot = confidence >= CONFIDENCE.THRESHOLD;
  
  return { 
    isBot, 
    authorized: isAuthorizedBot,
    confidence,
    reasons
  };
};

// Bot detection middleware
export const botDetectionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip bot detection for static files and API endpoints
  if (req.path.includes('.') || req.path.startsWith('/api')) {
    return next();
  }
  
  // Detect if visitor is a bot
  const { isBot, authorized, confidence, reasons } = detectBot(req);
  
  // Extract IP address with proper CloudFlare support
  let ip = 'unknown';
  
  // First check CloudFlare-specific headers
  if (req.headers['cf-connecting-ip']) {
    // If request comes through CloudFlare, use their provided header
    ip = Array.isArray(req.headers['cf-connecting-ip']) 
      ? req.headers['cf-connecting-ip'][0] 
      : req.headers['cf-connecting-ip'];
  } else if (req.headers['x-forwarded-for']) {
    // If using another proxy or load balancer, get the first IP in the chain
    const forwardedIps = Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for'];
    
    // The x-forwarded-for header can contain multiple IPs separated by commas
    // The leftmost IP is the original client IP
    ip = forwardedIps.split(',')[0].trim();
  } else {
    // Fall back to the socket address if no proxy headers are present
    ip = req.socket.remoteAddress || 'unknown';
  }
  
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
    reasons
  };
  
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
    const { isBot, authorized, confidence, reasons } = detectBot(req);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipAddress = typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : 'unknown';
    
    req.botInfo = { 
      isBot, 
      authorized, 
      ipAddress, 
      country: 'unknown',
      confidence,
      reasons
    };
  }
  
  const { isBot, authorized, confidence } = req.botInfo;
  
  // If not a bot, allow access immediately
  if (!isBot) {
    return next();
  }
  
  // If an unauthorized bot, redirect to paywall
  if (isBot && !authorized) {
    // Log the redirect for debugging
    console.log(`Redirecting unauthorized bot to paywall. Confidence: ${confidence}%. Path: ${req.path}`);
    
    // Instead of blocking with 403, redirect to paywall
    return res.redirect(`/paywall?source=bot_detection&returnUrl=${encodeURIComponent(req.originalUrl || req.url)}&confidence=${confidence}`);
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
      }
    }
  }
}
