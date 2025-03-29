import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBotLogSchema } from "@shared/schema";
import { z } from "zod";

// API Key validation middleware
const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  console.log('Validating API key...');
  const apiKey = req.query.key || req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY || 'tomato-api-key-9c8b7a6d5e4f3g2h1i';

  console.log('Received API key:', apiKey);
  console.log('Expected API key:', expectedApiKey);

  if (!apiKey || apiKey !== expectedApiKey) {
    console.log('API key validation failed');
    return res.status(401).json({ error: 'Invalid API key' });
  }

  console.log('API key validation successful');
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Registering routes...');

  // Test endpoint to add a sample log (development only)
  app.get('/api/add-test-log', validateApiKey, async (req: Request, res: Response) => {
    console.log('GET /api/add-test-log endpoint hit');
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
      console.log('Created test log:', log);
      res.status(200).json({ success: true, log });
    } catch (error) {
      console.error('Error creating test log:', error);
      res.status(500).json({ error: 'Failed to create test log', details: error.message });
    }
  });

  // API endpoint to log bot visits
  app.post('/api/log', validateApiKey, async (req: Request, res: Response) => {
    console.log('POST /api/log endpoint hit');
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
      console.log('Created log:', log);
      
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
      
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });
  
  // API endpoint to get recent bot logs (protected)
  app.get('/api/logs', validateApiKey, async (req: Request, res: Response) => {
    console.log('GET /api/logs endpoint hit');
    try {
      const logs = await storage.getBotLogs();
      console.log('Retrieved logs:', logs);
      res.status(200).json({ success: true, logs });
    } catch (error: unknown) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ 
        error: 'Failed to fetch logs', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // API endpoint to get logs by IP (protected)
  app.get('/api/logs/ip/:ip', validateApiKey, async (req: Request, res: Response) => {
    console.log('GET /api/logs/ip/:ip endpoint hit');
    try {
      const { ip } = req.params;
      const logs = await storage.getBotLogsByIp(ip);
      console.log('Retrieved logs by IP:', logs);
      
      res.status(200).json({ logs });
    } catch (error) {
      console.error('Error retrieving bot logs by IP:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });
  
  // API endpoint to download logs as JSON file
  app.get('/api/logs/export', validateApiKey, async (req: Request, res: Response) => {
    console.log('GET /api/logs/export endpoint hit');
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
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // API endpoint to create log
  app.post('/api/logs', validateApiKey, async (req: Request, res: Response) => {
    console.log('POST /api/logs endpoint hit');
    try {
      const log = await storage.createBotLog(req.body);
      console.log('Created log:', log);
      res.status(201).json({ success: true, log });
    } catch (error: unknown) {
      console.error('Error creating log:', error);
      res.status(500).json({ 
        error: 'Failed to create log', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test endpoint
  app.get('/api/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ 
      message: 'API is working', 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
