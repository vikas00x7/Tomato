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
  const validApiKey = 'tomato-api-key-9c8b7a6d5e4f3g2h1i';
  
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

  const httpServer = createServer(app);

  return httpServer;
}
