import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBotLogSchema } from "@shared/schema";
import { z } from "zod";

// API Key validation middleware
const validateApiKey = (req: Request, res: Response, next: Function) => {
  // Check for the API key in multiple formats
  let apiKey = req.query.key;
  
  if (!apiKey) {
    // Try headers if query param not found
    const headerKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
    apiKey = headerKey;
  }
  
  console.log('Validating API key:', apiKey);
  
  // Using the same API key as defined in the Cloudflare worker
  // This is a placeholder secret - store this securely in environment variables
  const validApiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
  
  // Make validation case-insensitive and trim whitespace
  if (!apiKey || (typeof apiKey === 'string' && apiKey.trim().toLowerCase() !== validApiKey.toLowerCase())) {
    console.log('Invalid API key, received:', apiKey);
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Test endpoint to add a sample log (development only)
  app.get('/api/add-test-log', validateApiKey, async (req: Request, res: Response) => {
    try {
      const testLog = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test User Agent',
        path: '/test-path',
        country: 'US',
        isBotConfirmed: Math.random() > 0.5,
        bypassAttempt: Math.random() > 0.7,
        source: 'test-endpoint',
        timestamp: new Date()
      };
      
      const log = await storage.createBotLog(testLog);
      res.status(200).json({ success: true, log });
    } catch (error) {
      console.error('Error creating test log:', error);
      res.status(500).json({ error: 'Failed to create test log' });
    }
  });

  // API endpoint to handle client-side navigation events
  app.post('/api/log-navigation', async (req: Request, res: Response) => {
    try {
      // Extract client IP
      const ip = req.headers['x-forwarded-for'] || 
                req.socket.remoteAddress || 
                'unknown';
      
      // We need to make sure ipAddress is always a string
      const ipAddress = typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : 'unknown';
      
      // Get data from request body
      const { path, source } = req.body;
      
      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }
      
      // Get country information from IP - same logic as in the middleware
      let country = 'unknown';
      try {
        const geoip = await import('geoip-lite');
        
        // Don't lookup for localhost/private IP addresses
        if (ipAddress !== 'unknown' && 
            !ipAddress.startsWith('127.') && 
            !ipAddress.startsWith('192.168.') &&
            !ipAddress.startsWith('10.')) {
          const geo = geoip.default.lookup(ipAddress);
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
      
      // Create log entry for the navigation
      const logData = {
        ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        path,
        timestamp: new Date(),
        country,
        isBotConfirmed: false, // Not a bot, just regular navigation
        bypassAttempt: false,
        source: source || 'client-navigation'
      };
      
      // Store the navigation log
      const log = await storage.createBotLog(logData);
      
      // Return minimal success response
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error logging client navigation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API endpoint to log bot visits
  app.post('/api/log', validateApiKey, async (req: Request, res: Response) => {
    try {
      // Extract client IP
      const ip = req.headers['x-forwarded-for'] || 
                req.headers['cf-connecting-ip'] || 
                req.socket.remoteAddress || 
                'unknown';
      
      // We need to make sure ipAddress is always a string
      const ipAddress = typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : 'unknown';
      
      // Merge request data with the IP address
      const logData = {
        ...req.body,
        ipAddress,
        timestamp: new Date(),
      };
      
      // Validate the data against our schema
      const validatedData = insertBotLogSchema.parse(logData);
      
      // Store the log in our database
      const log = await storage.createBotLog(validatedData);
      
      // Return success
      res.status(200).json({ success: true, id: log.id });
    } catch (error) {
      console.error('Error logging bot visit:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid data format',
          details: error.errors 
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to get recent bot logs (protected)
  app.get('/api/logs', validateApiKey, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getBotLogs(limit);
      
      res.status(200).json({ logs });
    } catch (error) {
      console.error('Error retrieving bot logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to get logs by IP (protected)
  app.get('/api/logs/ip/:ip', validateApiKey, async (req: Request, res: Response) => {
    try {
      const { ip } = req.params;
      const logs = await storage.getBotLogsByIp(ip);
      
      res.status(200).json({ logs });
    } catch (error) {
      console.error('Error retrieving bot logs by IP:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to download logs as JSON file
  app.get('/api/logs/export', validateApiKey, async (req: Request, res: Response) => {
    try {
      // Get all logs
      const logs = await storage.getBotLogs(1000); // Get up to 1000 logs
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=bot_logs_${new Date().toISOString().slice(0, 10)}.json`);
      
      // Send the logs as a JSON file
      res.status(200).json(logs);
    } catch (error) {
      console.error('Error exporting bot logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API endpoint to get logs
  app.get('/api/logs', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get logs from storage
      const logs = await storage.getLogs();
      
      // Get query parameters for filtering
      const country = req.query.country as string;
      const source = req.query.source as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const botStatus = req.query.botStatus as string;
      const bypassStatus = req.query.bypassStatus as string;
      
      // Apply filters if they exist
      let filteredLogs = [...logs];
      
      if (country) {
        filteredLogs = filteredLogs.filter(log => log.country === country);
      }
      
      if (source) {
        filteredLogs = filteredLogs.filter(log => log.source === source);
      }
      
      if (startDate) {
        const startDateTime = new Date(startDate).getTime();
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() >= startDateTime);
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate).getTime();
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() <= endDateTime);
      }
      
      if (botStatus === 'true') {
        filteredLogs = filteredLogs.filter(log => log.isBotConfirmed === true);
      } else if (botStatus === 'false') {
        filteredLogs = filteredLogs.filter(log => log.isBotConfirmed === false);
      }
      
      if (bypassStatus === 'true') {
        filteredLogs = filteredLogs.filter(log => log.bypassAttempt === true);
      } else if (bypassStatus === 'false') {
        filteredLogs = filteredLogs.filter(log => log.bypassAttempt === false);
      }
      
      res.json({ logs: filteredLogs });
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API endpoint to clear all logs
  app.delete('/api/logs', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key for log clearing:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Clear all logs
      await storage.clearLogs();
      res.json({ success: true, message: 'All logs have been cleared successfully' });
    } catch (error) {
      console.error('Error clearing logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to get IP blacklist
  app.get('/api/ip-blacklist', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const blacklist = await storage.getIPBlacklist();
      res.json({ blacklist });
    } catch (error) {
      console.error('Error fetching IP blacklist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to add IP to blacklist
  app.post('/api/ip-blacklist', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { ipAddress, reason } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }
      
      await storage.addToIPBlacklist(ipAddress, reason || 'Manually blocked');
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding to IP blacklist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to remove IP from blacklist
  app.delete('/api/ip-blacklist/:ip', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const ipAddress = req.params.ip;
      
      await storage.removeFromIPBlacklist(ipAddress);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing from IP blacklist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to get IP whitelist
  app.get('/api/ip-whitelist', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const whitelist = await storage.getIPWhitelist();
      res.json({ whitelist });
    } catch (error) {
      console.error('Error fetching IP whitelist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to add IP to whitelist
  app.post('/api/ip-whitelist', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { ipAddress, reason } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }
      
      await storage.addToIPWhitelist(ipAddress, reason || 'Manually whitelisted');
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding to IP whitelist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to remove IP from whitelist
  app.delete('/api/ip-whitelist/:ip', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const ipAddress = req.params.ip;
      
      await storage.removeFromIPWhitelist(ipAddress);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing from IP whitelist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to get bot policy
  app.get('/api/bot-policy', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const policy = await storage.getBotPolicy();
      res.json({ policy });
    } catch (error) {
      console.error('Error fetching bot policy:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to update bot policy
  app.post('/api/bot-policy', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Working_admin branch: Enhanced policy validation
      const { policy } = req.body;
      
      // Validate policy structure
      if (!policy || typeof policy !== 'object') {
        return res.status(400).json({ 
          error: 'Invalid policy format', 
          message: 'Policy must be a valid object with required fields'
        });
      }
      
      // Ensure required fields
      const requiredFields = ['enabled', 'threshold', 'challengeType', 'blockDuration', 'customMessages'];
      const missingFields = requiredFields.filter(field => !(field in policy));
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          missingFields 
        });
      }
      
      // Ensure customMessages structure
      if (!policy.customMessages || typeof policy.customMessages !== 'object') {
        return res.status(400).json({ 
          error: 'Invalid customMessages format',
          message: 'customMessages must be a valid object with message fields'
        });
      }
      
      const requiredMessages = ['detected', 'blocked', 'challenge', 'success'];
      const missingMessages = requiredMessages.filter(msg => !(msg in policy.customMessages));
      
      if (missingMessages.length > 0) {
        return res.status(400).json({ 
          error: 'Missing required message fields', 
          missingMessages 
        });
      }
      
      await storage.updateBotPolicy(policy);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating bot policy:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to get analytics data
  app.get('/api/analytics', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const logs = await storage.getLogs();
      
      // Calculate analytics data
      const analytics = {
        // Total counts
        totalVisits: logs.length,
        uniqueIPs: new Set(logs.map(log => log.ipAddress)).size,
        botCount: logs.filter(log => log.isBotConfirmed).length,
        humanCount: logs.filter(log => !log.isBotConfirmed).length,
        bypassAttempts: logs.filter(log => log.bypassAttempt).length,
        
        // Country distribution
        countryDistribution: logs.reduce((acc, log) => {
          const country = log.country || 'unknown';
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        // Page popularity
        pageVisits: logs.reduce((acc, log) => {
          const path = log.path || 'unknown';
          acc[path] = (acc[path] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        // Traffic by source
        sourceDistribution: logs.reduce((acc, log) => {
          const source = log.source || 'unknown';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        // Traffic over time (daily)
        dailyTraffic: logs.reduce((acc, log) => {
          const date = new Date(log.timestamp).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        // Most active IP addresses
        topIPs: Object.entries(
          logs.reduce((acc, log) => {
            acc[log.ipAddress] = (acc[log.ipAddress] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([ip, count]) => ({ ip, count })),
      };
      
      res.json({ analytics });
    } catch (error) {
      console.error('Error calculating analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // API endpoint to export logs in various formats
  app.get('/api/export-logs', async (req: Request, res: Response) => {
    try {
      // Validate API key
      const apiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
      console.log('Validating API key:', req.query.key);
      if (req.query.key !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const format = req.query.format as string || 'json';
      const logs = await storage.getLogs();
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=bot_logs.csv');
        
        // Convert logs to CSV
        const csv = await new Promise<string>((resolve, reject) => {
          const csvStringify = require('csv-stringify');
          const columns = {
            id: 'ID',
            timestamp: 'Timestamp',
            ipAddress: 'IP Address',
            userAgent: 'User Agent',
            path: 'Path',
            country: 'Country',
            isBotConfirmed: 'Is Bot',
            bypassAttempt: 'Bypass Attempt',
            source: 'Source'
          };
          
          csvStringify(logs, { header: true, columns }, (err: Error, output: string) => {
            if (err) reject(err);
            else resolve(output);
          });
        });
        
        res.send(csv);
      } else if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=bot_logs.xlsx');
        
        // Convert logs to Excel format
        // For simplicity, using CSV as Excel format
        const csv = await new Promise<string>((resolve, reject) => {
          const csvStringify = require('csv-stringify');
          const columns = {
            id: 'ID',
            timestamp: 'Timestamp',
            ipAddress: 'IP Address',
            userAgent: 'User Agent',
            path: 'Path',
            country: 'Country',
            isBotConfirmed: 'Is Bot',
            bypassAttempt: 'Bypass Attempt',
            source: 'Source'
          };
          
          csvStringify(logs, { header: true, columns }, (err: Error, output: string) => {
            if (err) reject(err);
            else resolve(output);
          });
        });
        
        res.send(csv);
      } else {
        // Default to JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=bot_logs.json');
        res.json({ logs });
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
