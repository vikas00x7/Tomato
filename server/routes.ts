import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBotLogSchema } from "@shared/schema";
import { z } from "zod";

// API Key validation middleware
const validateApiKey = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers['x-api-key'];
  
  // Simple API key validation - in production, use a more secure approach
  // This is a placeholder secret - store this securely in environment variables
  const validApiKey = 'your-secret-api-key-here';
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);

  return httpServer;
}
