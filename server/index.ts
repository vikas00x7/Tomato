import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { InsertBotLog } from "@shared/schema";
import fs from "fs";
import path from "path";
import { botDetectionMiddleware, accessControlMiddleware } from "./middleware/botDetection";
import cors from "cors";
import geoip from 'geoip-lite';

const app = express();

// Map to track recent requests to prevent duplicates
const RECENT_REQUESTS: Record<string, number> = {};

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS support for development
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002'],
  credentials: true,
  exposedHeaders: ['X-API-Key']
}));

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize bot_logs.json if it doesn't exist
const botLogsFile = path.join(logsDir, 'bot_logs.json');
if (!fs.existsSync(botLogsFile)) {
  fs.writeFileSync(botLogsFile, JSON.stringify([], null, 2));
}

// Step 1: Bot Detection - Identify if the visitor is a bot
app.use(botDetectionMiddleware);

// Step 2: Access Control - Based on bot detection results
app.use(accessControlMiddleware);

// Visitor tracking middleware for non-API routes
app.use(async (req, res, next) => {
  let reqPath = req.path;
  
  // Skip logging entirely for system paths
  if (reqPath.includes('/@vite') || 
      reqPath.includes('vite') || 
      reqPath.includes('.') ||
      reqPath.includes('__') ||
      reqPath.startsWith('/_') ||
      reqPath.startsWith('/@react-refresh') ||
      reqPath === '/admin') {
    return next();
  }
  
  // Extract the actual page path from refresh routes if possible
  const referrer = req.headers.referer as string;
  if (reqPath.startsWith('/react-refresh') || 
      reqPath.startsWith('/@react-refresh') || 
      reqPath.includes('refresh')) {
    if (referrer) {
      try {
        // Extract the path from the referrer URL
        const referrerUrl = new URL(referrer);
        // If this is a refresh request, use the referrer path instead
        reqPath = referrerUrl.pathname;
        console.log(`Extracted actual page path ${reqPath} from refresh request`);
        
        // Skip if the extracted path is also a system path
        if (reqPath.includes('/@vite') || 
            reqPath.includes('vite') || 
            reqPath.includes('.') ||
            reqPath.includes('__')) {
          return next();
        }
      } catch (e) {
        console.error('Error parsing referrer URL:', e);
        return next(); // Skip logging on error
      }
    } else {
      // No referrer - skip logging
      return next();
    }
  }

  // Only log main website pages and ignore system paths, admin, and API routes
  if (!reqPath.startsWith('/api') && !reqPath.startsWith('/admin') && req.method === 'GET') {
    try {
      // Extract IP address
      const ip = req.headers['x-forwarded-for'] || 
                req.socket.remoteAddress || 
                'unknown';
      
      const ipAddress = typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : 'unknown';
      
      // Skip logging if this was already handled by bot detection
      if (req.botInfo) {
        console.log(`Visit already logged by bot detection: ${reqPath}`);
        return next();
      }
      
      // For regular HTML requests (not AJAX/fetch), log as server-side navigation
      // Client-side navigation will be handled by the client hook for subsequent navigations
      const isHtmlRequest = req.headers.accept && req.headers.accept.includes('text/html');
      
      // Generate a unique request ID to prevent duplicate logs
      const requestId = `${ipAddress}:${reqPath}:${Date.now().toString().substring(0, 8)}`;
      
      // Check if we've logged this path from this IP very recently (last 3 seconds)
      // This helps prevent duplicate logs from server and client for the same navigation
      const recentRequestTimestamp = RECENT_REQUESTS[requestId];
      if (recentRequestTimestamp && Date.now() - recentRequestTimestamp < 3000) {
        console.log(`Skipping duplicate log for ${reqPath} from ${ipAddress}`);
        return next();
      }
      
      // Record this request to prevent duplicates
      RECENT_REQUESTS[requestId] = Date.now();
      
      // Clean up old entries every minute to prevent memory leaks
      setTimeout(() => {
        delete RECENT_REQUESTS[requestId];
      }, 60000);
      
      // Only log full page requests, not partial client-side navigations
      // This helps avoid duplicate logging between server and client
      if (!isHtmlRequest || req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return next(); // Skip logging for AJAX/fetch requests
      }
      
      // Get country information from IP
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
      
      console.log(`Logging server-side visit: ${reqPath}`);
      
      // Create bot log entry for the website visit
      const logData: InsertBotLog = {
        ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        path: reqPath,
        timestamp: new Date(),
        country,
        isBotConfirmed: false, // Default to false for regular visitors
        bypassAttempt: false,
        source: 'server-navigation',
      };
      
      // Send to storage after response is sent to not block the user
      const logPromise = storage.createBotLog(logData);
      res.on('finish', () => {
        logPromise.catch(err => console.error('Error logging visit:', err));
      });
    } catch (error) {
      console.error('Error in visitor tracking middleware:', error);
    }
  }
  
  next();
});

// API request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server error:", err);

    // Send response to client but don't throw the error again
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port} with bot protection enabled`);
  });
})();