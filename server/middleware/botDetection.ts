import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import geoip from 'geoip-lite';

// Bot detection patterns
const BOT_USER_AGENT_PATTERNS = [
  'bot', 'spider', 'crawl', 'scrape', 'headless', 
  'puppeteer', 'nightmare', 'selenium', 'phantom', 
  'slurp', 'yahoo', 'bingbot', 'baiduspider', 'yandex'
];

// List of paths bots are allowed to access without paywall
const ALLOWED_BOT_PATHS = [
  '/', '/about', '/contact', // Public pages
  '/api/log-navigation'      // API endpoints bots need
];

// Check if this visitor is likely a bot
export const detectBot = (req: Request): {isBot: boolean, authorized: boolean} => {
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers['referer'] || '';
  
  // Basic bot detection via user agent
  const isBot = BOT_USER_AGENT_PATTERNS.some(pattern => 
    userAgent.toLowerCase().includes(pattern)
  );
  
  // Determine if this is an authorized bot
  // Authorized bots typically have verified user agents and valid referer patterns
  const authorizedBotPatterns = ['googlebot', 'bingbot', 'yandexbot'];
  const authorized = authorizedBotPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern)
  );
  
  return { isBot, authorized };
};

// Bot detection middleware
export const botDetectionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip bot detection for static files and API endpoints
  if (req.path.includes('.') || req.path.startsWith('/api')) {
    return next();
  }
  
  // Detect if visitor is a bot
  const { isBot, authorized } = detectBot(req);
  
  // Extract IP address
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ipAddress = typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : 'unknown';
  
  // Get country information from IP address
  let country = 'unknown';
  try {
    // Don't lookup for localhost/private IP addresses
    if (ipAddress !== 'unknown' && 
        !ipAddress.startsWith('127.') && 
        !ipAddress.startsWith('192.168.') &&
        !ipAddress.startsWith('10.')) {
      const geo = geoip.lookup(ipAddress);
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
    ipAddress,
    country 
  };
  
  // Log the visit with bot detection results
  const logData = {
    ipAddress,
    userAgent: req.headers['user-agent'] || 'unknown',
    path: req.path,
    timestamp: new Date(),
    country: country,
    isBotConfirmed: isBot,
    bypassAttempt: false,
    source: isBot ? (authorized ? 'authorized-bot' : 'unauthorized-bot') : 'server-navigation',
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
    const { isBot, authorized } = detectBot(req);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipAddress = typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : 'unknown';
    
    req.botInfo = { isBot, authorized, ipAddress, country: 'unknown' };
  }
  
  const { isBot, authorized } = req.botInfo;
  
  // If not a bot, allow access immediately
  if (!isBot) {
    return next();
  }
  
  // If an unauthorized bot, block access
  if (isBot && !authorized) {
    return res.status(403).render('blocked', { 
      reason: 'Unauthorized bot access is not permitted'
    });
  }
  
  // If an authorized bot, check if path is allowed or needs paywall
  if (isBot && authorized) {
    // Allow access to certain paths for authorized bots
    if (ALLOWED_BOT_PATHS.includes(req.path)) {
      return next();
    }
    
    // For other paths, redirect to paywall
    return res.redirect('/paywall?returnPath=' + encodeURIComponent(req.path));
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
      }
    }
  }
}
