import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertBotLogSchema, 
  botPolicySchema, 
  cloudflareCredentialsSchema, 
  cloudflareLogSchema, 
  type CloudflareCredentials,
  fastlyCredentialsSchema
} from "@shared/schema";
import { z } from "zod";
import fetch from "node-fetch";
import * as fs from 'fs';
import { LOG_FILE_PATH } from './constants';

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
      console.error('Error adding test log:', error);
      res.status(500).json({ error: 'Failed to add test log' });
    }
  });

  // API endpoint to handle client-side navigation events
  app.post('/api/log-navigation', async (req: Request, res: Response) => {
    try {
      // Extract client IP with proper CloudFlare support
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
      
      // Log all headers for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Client navigation request headers:', {
          cf: req.headers['cf-connecting-ip'],
          xForwardedFor: req.headers['x-forwarded-for'],
          remoteAddr: req.socket.remoteAddress
        });
      }
      
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
        if (ip !== 'unknown' && 
            !ip.startsWith('127.') && 
            !ip.startsWith('192.168.') &&
            !ip.startsWith('10.')) {
          const geo = geoip.default.lookup(ip);
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
        ipAddress: ip,
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
      const botType = req.query.botType as string;
      const ipAddress = req.query.ipAddress as string;
      
      // Apply filters if they exist
      let filteredLogs = [...logs];
      
      if (country) {
        filteredLogs = filteredLogs.filter(log => log.country === country);
      }
      
      if (source) {
        filteredLogs = filteredLogs.filter(log => log.source === source);
      }
      
      if (ipAddress) {
        filteredLogs = filteredLogs.filter(log => log.ipAddress === ipAddress);
      }
      
      if (botType) {
        filteredLogs = filteredLogs.filter(log => log.botType === botType);
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
  app.get('/api/analytics', validateApiKey, async (req: Request, res: Response) => {
    try {
      // Get all logs to generate analytics
      const logs = await storage.getLogs();
      
      // Calculate analytics
      const analytics = {
        totalVisits: logs.length,
        uniqueIPs: new Set(logs.map(log => log.ipAddress)).size,
        botCount: logs.filter(log => log.isBotConfirmed).length,
        humanCount: logs.filter(log => !log.isBotConfirmed).length,
        bypassAttempts: logs.filter(log => log.bypassAttempt).length,
        
        // AI Bot analytics
        aiBotAnalytics: {
          // Count by AI bot type
          typeDistribution: logs
            .filter(log => log.isBotConfirmed && log.botType === 'ai_assistant')
            .reduce((acc, log) => {
              // Extract the specific bot name from user agent
              const userAgent = (log.userAgent || '').toLowerCase();
              let botName = 'other';
              
              if (userAgent.includes('gptbot') || userAgent.includes('chatgpt')) {
                botName = 'gptbot';
              } else if (userAgent.includes('perplexity')) {
                botName = 'perplexity';
              } else if (userAgent.includes('claude') || userAgent.includes('anthropic')) {
                botName = 'claude';
              } else if (userAgent.includes('bard') || userAgent.includes('gemini')) {
                botName = 'gemini';
              } else if (userAgent.includes('cohere')) {
                botName = 'cohere';
              } else if (userAgent.includes('bing')) {
                botName = 'bing';
              }
              
              acc[botName] = (acc[botName] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            
          // Count by action taken
          actionDistribution: logs
            .filter(log => log.isBotConfirmed && log.botType === 'ai_assistant')
            .reduce((acc, log) => {
              // Determine the action based on response in the log
              let action = 'allowed';
              
              // Check path to determine if it was redirected to paywall
              const path = (log.path || '').toLowerCase();
              if (path.includes('/paywall') || path.includes('/subscribe')) {
                action = 'paywall';
              } 
              // Check if it was blocked based on bypass attempt flag
              else if (log.bypassAttempt) {
                action = 'blocked';
              }
              
              acc[action] = (acc[action] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            
          // Count of total AI bots
          total: logs.filter(log => log.isBotConfirmed && log.botType === 'ai_assistant').length,
          
          // Count by source (where they came from)
          sourceDistribution: logs
            .filter(log => log.isBotConfirmed && log.botType === 'ai_assistant')
            .reduce((acc, log) => {
              if (log.source) {
                acc[log.source] = (acc[log.source] || 0) + 1;
              }
              return acc;
            }, {} as Record<string, number>),
            
          // Daily trend of AI bot visits
          dailyTrend: logs
            .filter(log => log.isBotConfirmed && log.botType === 'ai_assistant')
            .reduce((acc, log) => {
              const date = new Date(log.timestamp).toISOString().split('T')[0];
              acc[date] = (acc[date] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
        },
        
        // Country distribution
        countryDistribution: logs.reduce((acc, log) => {
          if (log.country) {
            acc[log.country] = (acc[log.country] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        
        // Page visits
        pageVisits: logs.reduce((acc, log) => {
          if (log.path) {
            acc[log.path] = (acc[log.path] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        
        // Source distribution
        sourceDistribution: logs.reduce((acc, log) => {
          if (log.source) {
            acc[log.source] = (acc[log.source] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        
        // Daily traffic
        dailyTraffic: logs.reduce((acc, log) => {
          const date = new Date(log.timestamp).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        // Top IPs
        topIPs: Object.entries(
          logs.reduce((acc, log) => {
            acc[log.ipAddress] = (acc[log.ipAddress] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        )
          .map(([ip, count]) => ({ ip, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      };
      
      res.status(200).json({ analytics });
    } catch (error) {
      console.error('Error generating analytics:', error);
      res.status(500).json({ error: 'Failed to generate analytics' });
    }
  });

  // API endpoint to export logs in various formats
  app.get('/api/export-logs', validateApiKey, async (req: Request, res: Response) => {
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

  // Get logs endpoint
  app.get('/api/logs', validateApiKey, async (req: Request, res: Response) => {
    try {
      let logs;
      const { ipAddress, botType } = req.query;
      
      if (ipAddress && typeof ipAddress === 'string') {
        // Filter logs by IP address
        logs = await storage.getBotLogsByIp(ipAddress);
      } else {
        // Get all logs
        logs = await storage.getLogs();
      }
      
      // Apply botType filter if provided
      if (botType && typeof botType === 'string') {
        logs = logs.filter(log => log.botType === botType);
      }
      
      res.status(200).json({ logs });
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  // Clear logs endpoint
  app.delete('/api/logs', validateApiKey, async (req: Request, res: Response) => {
    try {
      await storage.clearLogs();
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error clearing logs:', error);
      res.status(500).json({ error: 'Failed to clear logs' });
    }
  });

  // Add a log endpoint
  app.post('/api/logs', validateApiKey, async (req: Request, res: Response) => {
    try {
      // Extract IP from request (if available through a forwarded header)
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
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
      console.error('Error adding log:', error);
      res.status(500).json({ error: 'Failed to add log', details: error });
    }
  });
  
  // ===== IP BLACKLIST ENDPOINTS =====
  
  // Get IP blacklist
  app.get('/api/ip-blacklist', validateApiKey, async (req: Request, res: Response) => {
    try {
      const blacklist = await storage.getIPBlacklist();
      res.status(200).json({ blacklist });
    } catch (error) {
      console.error('Error fetching IP blacklist:', error);
      res.status(500).json({ error: 'Failed to fetch IP blacklist' });
    }
  });
  
  // Add IP to blacklist
  app.post('/api/ip-blacklist', validateApiKey, async (req: Request, res: Response) => {
    try {
      const { ipAddress, reason } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }
      
      await storage.addToIPBlacklist(ipAddress, reason);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error adding IP to blacklist:', error);
      res.status(500).json({ error: 'Failed to add IP to blacklist' });
    }
  });
  
  // Remove IP from blacklist
  app.delete('/api/ip-blacklist/:ipAddress', validateApiKey, async (req: Request, res: Response) => {
    try {
      const { ipAddress } = req.params;
      
      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }
      
      await storage.removeFromIPBlacklist(ipAddress);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error removing IP from blacklist:', error);
      res.status(500).json({ error: 'Failed to remove IP from blacklist' });
    }
  });
  
  // ===== IP WHITELIST ENDPOINTS =====
  
  // Get IP whitelist
  app.get('/api/ip-whitelist', validateApiKey, async (req: Request, res: Response) => {
    try {
      const whitelist = await storage.getIPWhitelist();
      res.status(200).json({ whitelist });
    } catch (error) {
      console.error('Error fetching IP whitelist:', error);
      res.status(500).json({ error: 'Failed to fetch IP whitelist' });
    }
  });
  
  // Add IP to whitelist
  app.post('/api/ip-whitelist', validateApiKey, async (req: Request, res: Response) => {
    try {
      const { ipAddress, reason } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }
      
      await storage.addToIPWhitelist(ipAddress, reason);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error adding IP to whitelist:', error);
      res.status(500).json({ error: 'Failed to add IP to whitelist' });
    }
  });
  
  // Remove IP from whitelist
  app.delete('/api/ip-whitelist/:ipAddress', validateApiKey, async (req: Request, res: Response) => {
    try {
      const { ipAddress } = req.params;
      
      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }
      
      await storage.removeFromIPWhitelist(ipAddress);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error removing IP from whitelist:', error);
      res.status(500).json({ error: 'Failed to remove IP from whitelist' });
    }
  });
  
  // ===== BOT POLICY ENDPOINTS =====
  
  // Get bot policy
  app.get('/api/bot-policy', validateApiKey, async (req: Request, res: Response) => {
    try {
      const policy = await storage.getBotPolicy();
      res.status(200).json({ policy });
    } catch (error) {
      console.error('Error fetching bot policy:', error);
      res.status(500).json({ error: 'Failed to fetch bot policy' });
    }
  });
  
  // Update bot policy
  app.post('/api/bot-policy', validateApiKey, async (req: Request, res: Response) => {
    try {
      const { policy } = req.body;
      
      if (!policy) {
        return res.status(400).json({ error: 'Policy is required' });
      }
      
      // Validate policy against schema
      const validatedPolicy = botPolicySchema.parse(policy);
      
      await storage.updateBotPolicy(validatedPolicy);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating bot policy:', error);
      res.status(500).json({ error: 'Failed to update bot policy', details: error });
    }
  });
  
  // ===== ANALYTICS ENDPOINT =====
  
  // Get analytics data
  app.get('/api/analytics', validateApiKey, async (req: Request, res: Response) => {
    try {
      // Get all logs to generate analytics
      const logs = await storage.getLogs();
      
      // Calculate analytics
      const analytics = {
        totalVisits: logs.length,
        uniqueIPs: new Set(logs.map(log => log.ipAddress)).size,
        botCount: logs.filter(log => log.isBotConfirmed).length,
        humanCount: logs.filter(log => !log.isBotConfirmed).length,
        bypassAttempts: logs.filter(log => log.bypassAttempt).length,
        
        // Country distribution
        countryDistribution: logs.reduce((acc, log) => {
          if (log.country) {
            acc[log.country] = (acc[log.country] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        
        // Page visits
        pageVisits: logs.reduce((acc, log) => {
          if (log.path) {
            acc[log.path] = (acc[log.path] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        
        // Source distribution
        sourceDistribution: logs.reduce((acc, log) => {
          if (log.source) {
            acc[log.source] = (acc[log.source] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        
        // Daily traffic
        dailyTraffic: logs.reduce((acc, log) => {
          const date = new Date(log.timestamp).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        // Top IPs
        topIPs: Object.entries(
          logs.reduce((acc, log) => {
            acc[log.ipAddress] = (acc[log.ipAddress] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        )
          .map(([ip, count]) => ({ ip, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      };
      
      res.status(200).json({ analytics });
    } catch (error) {
      console.error('Error generating analytics:', error);
      res.status(500).json({ error: 'Failed to generate analytics' });
    }
  });

  // ===== CLOUDFLARE ENDPOINTS =====

  // Get Cloudflare credentials
  app.get('/api/cloudflare/credentials', validateApiKey, async (req: Request, res: Response) => {
    try {
      const credentials = await storage.getCloudflareCredentials();
      
      // Only return if credentials exist, mask the API key for security
      if (credentials) {
        const { apiKey, ...rest } = credentials;
        const maskedKey = apiKey.substring(0, 4) + '********' + apiKey.substring(apiKey.length - 4);
        res.status(200).json({ 
          credentials: { 
            ...rest, 
            apiKey: maskedKey,
            isConfigured: true
          } 
        });
      } else {
        res.status(200).json({ credentials: { isConfigured: false } });
      }
    } catch (error) {
      console.error('Error fetching Cloudflare credentials:', error);
      res.status(500).json({ error: 'Failed to fetch Cloudflare credentials' });
    }
  });

  // Save Cloudflare credentials
  app.post('/api/cloudflare/credentials', validateApiKey, async (req: Request, res: Response) => {
    try {
      const { credentials } = req.body;
      
      if (!credentials) {
        return res.status(400).json({ error: 'Credentials are required' });
      }
      
      // Option to bypass validation for testing
      const skipValidation = req.query.skipValidation === 'true' || process.env.NODE_ENV === 'development';
      console.log('Skip validation mode:', skipValidation);
      
      try {
        // Validate credentials against schema
        const validatedCredentials = cloudflareCredentialsSchema.parse(credentials);
        
        if (!skipValidation) {
          // Test the credentials before saving them
          const testResult = await testCloudflareCredentials(validatedCredentials);
          
          if (!testResult.success) {
            return res.status(400).json({ 
              error: 'Invalid Cloudflare credentials', 
              details: testResult.error,
              suggestion: 'Verify your API key and zone ID or add ?skipValidation=true to bypass this check for testing.'
            });
          }
        }
        
        // Save the credentials
        await storage.saveCloudflareCredentials(validatedCredentials);
        res.status(200).json({ success: true });
      } catch (validationError) {
        console.error('Validation error:', validationError);
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            error: 'Invalid credential format', 
            details: validationError.errors,
            suggestion: 'Check the format of your API key and zone ID. Use skipValidation=true parameter to bypass strict validation.'
          });
        }
        throw validationError;
      }
    } catch (error) {
      console.error('Error saving Cloudflare credentials:', error);
      res.status(500).json({ 
        error: 'Failed to save Cloudflare credentials',
        suggestion: 'Try using skipValidation=true for testing'
      });
    }
  });

  // Delete Cloudflare credentials
  app.delete('/api/cloudflare/credentials', validateApiKey, async (req: Request, res: Response) => {
    try {
      await storage.clearCloudflareCredentials();
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting Cloudflare credentials:', error);
      res.status(500).json({ error: 'Failed to delete Cloudflare credentials' });
    }
  });

  // Get Cloudflare logs
  app.get('/api/cloudflare/logs', validateApiKey, async (req: Request, res: Response) => {
    try {
      // Retrieve credentials
      const credentials = await storage.getCloudflareCredentials();
      
      if (!credentials) {
        return res.status(400).json({ 
          error: 'Cloudflare credentials not configured',
          suggestion: 'Please configure your Cloudflare credentials in the settings'
        });
      }
      
      // Extract query parameters
      const { startDate, endDate, limit = '100', page = '1', ipAddress, botScore } = req.query;
      
      // Real mode - continue with actual CloudFlare API call
      try {
        // Build params for Cloudflare API
        const params = new URLSearchParams();
        if (startDate && typeof startDate === 'string') {
          params.append('since', new Date(startDate).toISOString());
        } else {
          // Default to last 24 hours if not specified
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          params.append('since', yesterday.toISOString());
        }
        
        // Fetch logs from Cloudflare
        const cfLogs = await fetchCloudflareSecurityEvents(credentials, params);
        
        // Transform logs to our format
        const transformedLogs = cfLogs.logs.map((log: CloudflareSecurityEvent) => {
          return {
            id: log.rayId || String(Date.now() + Math.random()),
            timestamp: log.timestamp || new Date().toISOString(),
            ipAddress: log.clientIP || 'unknown',
            userAgent: log.userAgent || null,
            path: log.uri || null,
            country: log.clientCountry || null,
            action: log.action || null,
            source: 'cloudflare',
            botScore: log.clientAsn ? parseInt(log.clientAsn) : null, // Using ASN as a placeholder, real implementation would use score
            botCategory: log.securityLevel || null,
            method: log.method || null,
            clientRequestId: log.clientRequestId || null,
            edgeResponseStatus: log.edgeResponseStatus ? parseInt(log.edgeResponseStatus) : null,
            edgeStartTimestamp: log.edgeStartTimestamp || null,
            originResponseStatus: log.originResponseStatus ? parseInt(log.originResponseStatus) : null
          };
        });
        
        // Apply IP filter on the server side if necessary
        let filteredLogs = transformedLogs;
        if (ipAddress && typeof ipAddress === 'string') {
          filteredLogs = transformedLogs.filter(log => log.ipAddress === ipAddress);
        }
        
        // Apply bot score filter if provided
        if (botScore && typeof botScore === 'string') {
          const score = parseInt(botScore);
          if (!isNaN(score)) {
            filteredLogs = filteredLogs.filter(log => log.botScore !== null && log.botScore <= score);
          }
        }
        
        res.status(200).json({ 
          logs: filteredLogs,
          pagination: {
            page: parseInt(typeof page === 'string' ? page : '1'),
            limit: parseInt(typeof limit === 'string' ? limit : '100'),
            total: cfLogs.total || filteredLogs.length
          }
        });
      } catch (apiError) {
        console.error('Error in CloudFlare API call:', apiError);
        // Respond with suggestion to use mock mode
        return res.status(502).json({ 
          error: 'Failed to fetch CloudFlare logs',
          details: String(apiError),
          suggestion: 'Try using mockMode=true for testing without valid credentials'
        });
      }
    } catch (error) {
      console.error('Error in CloudFlare logs endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch Cloudflare logs', 
        details: String(error),
        suggestion: 'Try using mockMode=true for testing without valid credentials'
      });
    }
  });

  // Import Cloudflare logs to local storage
  app.post('/api/cloudflare/import-logs', validateApiKey, async (req: Request, res: Response) => {
    try {
      const { logs } = req.body;
      
      if (!logs || !Array.isArray(logs) || logs.length === 0) {
        return res.status(400).json({ error: 'Logs are required and must be an array' });
      }
      
      let importedCount = 0;
      const errors: string[] = [];
      
      // Process each log and add to local storage
      for (const cloudflareLog of logs) {
        try {
          const log = {
            ipAddress: cloudflareLog.ipAddress,
            userAgent: cloudflareLog.userAgent,
            path: cloudflareLog.path,
            country: cloudflareLog.country,
            isBotConfirmed: true, // Assume all imported Cloudflare logs are from bots
            botType: cloudflareLog.botCategory || 'unknown',
            source: 'cloudflare-import',
            timestamp: new Date(cloudflareLog.timestamp)
          };
          
          await storage.createBotLog(log);
          importedCount++;
        } catch (err) {
          errors.push(String(err));
        }
      }
      
      res.status(200).json({ 
        success: true, 
        importedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error importing Cloudflare logs:', error);
      res.status(500).json({ error: 'Failed to import Cloudflare logs' });
    }
  });

  // Test Cloudflare credentials before saving
  async function testCloudflareCredentials(credentials: CloudflareCredentials): Promise<{ success: boolean, error?: string }> {
    try {
      // Build the URL for a simple API request to test credentials - zone details is a good test
      const url = `https://api.cloudflare.com/client/v4/zones/${credentials.zoneId}`;
      
      // Build headers
      const headers: Record<string, string> = {
        'X-Auth-Key': credentials.apiKey,
        'Content-Type': 'application/json'
      };
      
      // Add email if provided (required for Global API keys)
      if (credentials.email) {
        headers['X-Auth-Email'] = credentials.email;
      }
      
      // Make a test request to Cloudflare
      const response = await fetch(url, { method: 'GET', headers });
      const data = await response.json();
      
      if (!response.ok) {
        // Parse the error response
        let errorMessage = data.errors && data.errors.length > 0
          ? data.errors.map((e: any) => e.message).join(', ')
          : 'Unknown error';
        
        // Return with detailed error
        return { 
          success: false, 
          error: `Cloudflare API Error (${response.status}): ${errorMessage}` 
        };
      }
      
      // Check for successful result
      if (!data.success) {
        return { 
          success: false, 
          error: 'Cloudflare API reported an unsuccessful result' 
        };
      }
      
      return { success: true };
    } catch (error) {
      // Handle fetch/network/parsing errors
      return { 
        success: false, 
        error: `Connection error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  // Fetch Cloudflare security events
  async function fetchCloudflareSecurityEvents(credentials: CloudflareCredentials, params: URLSearchParams): Promise<{ logs: CloudflareSecurityEvent[], total: number }> {
    try {
      // Build the URL
      const url = `https://api.cloudflare.com/client/v4/zones/${credentials.zoneId}/security/events?${params.toString()}`;
      
      // Build headers
      const headers: Record<string, string> = {
        'X-Auth-Key': credentials.apiKey,
        'Content-Type': 'application/json'
      };
      
      // Add email if provided (required for Global API keys)
      if (credentials.email) {
        headers['X-Auth-Email'] = credentials.email;
      }
      
      // Make the request to Cloudflare
      const response = await fetch(url, { method: 'GET', headers });
      
      if (!response.ok) {
        throw new Error(`Cloudflare API Error (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate response
      if (!data.success) {
        const errors = data.errors && data.errors.length > 0
          ? data.errors.map((e: any) => e.message).join(', ')
          : 'Unknown error';
        throw new Error(`Cloudflare API Error: ${errors}`);
      }
      
      // Return formatted logs
      return {
        logs: data.result || [],
        total: data.result_info?.total_count || 0
      };
    } catch (error) {
      console.error('Error fetching Cloudflare security events:', error);
      throw error;
    }
  }

  // API endpoint to log fingerprint data
  app.post('/api/log-fingerprint', validateApiKey, async (req: Request, res: Response) => {
    try {
      const { fingerprint, path, timestamp } = req.body;
      
      if (!fingerprint || !fingerprint.visitorId) {
        return res.status(400).json({ error: 'Valid fingerprint data is required' });
      }
      
      // Extract IP address
      const ip = req.headers['x-forwarded-for'] || 
                 req.socket.remoteAddress || 
                 'unknown';
      
      const ipAddress = typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : 'unknown';
      
      // Get country information
      let country = 'unknown';
      try {
        const geoip = await import('geoip-lite');
        // Skip lookup for localhost/private IPs
        if (ipAddress === '127.0.0.1' || 
            ipAddress.startsWith('192.168.') || 
            ipAddress.startsWith('10.')) {
          // In development, use a placeholder country
          if (process.env.NODE_ENV === 'development') {
            country = 'US';
          }
        } else {
          const geo = geoip.default.lookup(ipAddress);
          if (geo && geo.country) {
            country = geo.country;
          }
        }
      } catch (error) {
        console.error('Error detecting country:', error);
      }
      
      // Don't assume this is a human - perform bot detection
      const { detectBot } = await import('./middleware/botDetection');
      const { isBot, botType: detectedBotType } = detectBot(req);
      
      // Add to bot logs
      await storage.createBotLog({
        ipAddress: ipAddress,
        timestamp: new Date(timestamp) || new Date(),
        path: path || req.path,
        country: country,
        isBotConfirmed: isBot, // Set based on actual bot detection
        source: 'fingerprint_api',
        fingerprint: {
          visitorId: fingerprint.visitorId,
          requestId: fingerprint.requestId || 'unknown',
          browserDetails: fingerprint.browserDetails || {}
        },
        botType: detectedBotType || (isBot ? 'unknown_bot' : 'human'), // Use detected bot type or default values
        bypassAttempt: false,
        headers: {
          ...req.headers
        }
      });
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error logging fingerprint:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Clear system logs (admin, dev paths, etc.)
  app.post('/api/clear-system-logs', validateApiKey, async (req: Request, res: Response) => {
    try {
      // Define patterns for system paths
      const systemPathPatterns = [
        '/admin',
        '/@vite',
        '/@react-refresh',
        'vite',
        '.js',
        '.css',
        '.map'
      ];
      
      // Read the current logs
      let logs = [];
      if (fs.existsSync(LOG_FILE_PATH)) {
        const fileContent = fs.readFileSync(LOG_FILE_PATH, 'utf8');
        logs = fileContent ? JSON.parse(fileContent) : [];
      }
      
      // Filter out system logs
      const filteredLogs = logs.filter((log: any) => {
        // Skip logs without a path property
        if (!log.path) return true;
        
        // Check if the log path matches any system path pattern
        return !systemPathPatterns.some(pattern => {
          if (pattern.startsWith('/')) {
            // Exact path match
            return log.path === pattern;
          } else {
            // Substring match
            return log.path.includes(pattern);
          }
        });
      });
      
      // Count how many logs were removed
      const removedCount = logs.length - filteredLogs.length;
      
      // Save the filtered logs back to the file
      fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(filteredLogs, null, 2));
      
      // Send success response
      res.status(200).json({ 
        success: true, 
        message: `Successfully removed ${removedCount} system log entries`,
        logsRemaining: filteredLogs.length
      });
    } catch (error) {
      console.error('Error clearing system logs:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error clearing system logs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // API endpoint to get logs
  app.get('/api/logs', validateApiKey, async (req: Request, res: Response) => {
    try {
      // Check if the logs file exists
      if (!fs.existsSync(LOG_FILE_PATH)) {
        // Create an empty logs file if it doesn't exist
        fs.writeFileSync(LOG_FILE_PATH, JSON.stringify([], null, 2));
      }
      
      // Read the logs from the file
      const fileContent = fs.readFileSync(LOG_FILE_PATH, 'utf8');
      const allLogs = fileContent ? JSON.parse(fileContent) : [];
      
      // Support filtering logs by source
      const { source, ip } = req.query;
      
      let filteredLogs = allLogs;
      
      // Filter by source if provided
      if (source) {
        filteredLogs = filteredLogs.filter((log: any) => log.source === source);
      }
      
      // Filter by IP if provided
      if (ip) {
        filteredLogs = filteredLogs.filter((log: any) => log.ipAddress === ip);
      }
      
      res.status(200).json({ 
        success: true, 
        logs: filteredLogs,
        total: filteredLogs.length,
        filtered: source || ip ? true : false,
        source: source || 'all',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // API endpoint to get Fastly CDN logs
  app.get('/api/fastly-logs', validateApiKey, async (req: Request, res: Response) => {
    try {
      console.log('===== FASTLY LOGS API REQUEST =====>>>>>>>>>>>>>>>>>>>>>>>');
      console.log('Request query parameters:', req.query);
      console.log('Request headers:', req.headers);
      
      const { serviceId, apiKey } = req.query;
      
      if (!serviceId || !apiKey) {
        console.log('Missing required parameters: serviceId and/or apiKey');
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required parameters: apiKey and serviceId are required' 
        });
      }

      // console.log(`Attempting to fetch Fastly logs for service: ${serviceId}`);
      
      // Validate the Service ID format (generally alphanumeric)
      console.log('Service ID type:---------', serviceId);
      if (typeof serviceId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Service ID format',
          message: 'Service ID should be alphanumeric'
        });
      }
      
      // First check if the service exists
      const serviceCheckUrl = `https://api.fastly.com/service/${serviceId}`;
      console.log(`Checking Fastly service at URL: ${serviceCheckUrl}`);
      
      try {
        console.log('Sending service check request with API key:', apiKey.toString().substring(0, 5) + '...');
        const serviceCheckResponse = await fetch(serviceCheckUrl, {
          method: 'GET',
          headers: {
            'Fastly-Key': apiKey as string,
            'Accept': 'application/json'
          }
        });
        
        console.log('Service check response status:', serviceCheckResponse.status);
        
        if (!serviceCheckResponse.ok) {
          const errorText = await serviceCheckResponse.text();
          console.error(`Fastly service check failed: ${serviceCheckResponse.status}`, errorText);
          
          // Format error message based on response code
          let errorMessage = 'Failed to validate Fastly service';
          if (serviceCheckResponse.status === 401) {
            errorMessage = 'Invalid Fastly API key';
          } else if (serviceCheckResponse.status === 404) {
            errorMessage = `Service ID '${serviceId}' not found`;
          }
          
          return res.status(serviceCheckResponse.status).json({
            success: false,
            error: errorMessage,
            details: errorText,
            statusCode: serviceCheckResponse.status
          });
        }
      } catch (serviceCheckError) {
        console.error('Error checking Fastly service:', serviceCheckError);
      }
      
      // Use the Real-Time Logging API if the service exists
      // Fastly Real-time Logging API endpoint
      const fastlyUrl = `https://rt.fastly.com/v1/channel/${serviceId.trim()}/logs`;
      
      console.log(`Fetching logs from Fastly API: ${fastlyUrl}`);
      
      try {
        console.log('Sending Fastly logs request with headers:', {
          'Fastly-Key': apiKey.toString().substring(0, 5) + '...',
          'Accept': 'application/json'
        });
        
        const fetchResponse = await fetch(fastlyUrl, {
          method: 'GET',
          headers: {
            'Fastly-Key': apiKey as string,
            'Accept': 'application/json'
          }
        });
        
        console.log('Fastly logs response status:-------------', fetchResponse);
        
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error(`Fastly logs request failed: ${fetchResponse.status}`, errorText);
          
          // More detailed error messages based on status codes
          let errorMessage = `Fastly API error: ${fetchResponse.status} ${fetchResponse.statusText}`;
          if (fetchResponse.status === 401) {
            errorMessage = 'Authentication failed: Invalid Fastly API key';
          } else if (fetchResponse.status === 403) {
            errorMessage = 'Authorization failed: Your API token does not have the required permissions';
          } else if (fetchResponse.status === 404) {
            errorMessage = `Real-time logging not available for service ${serviceId}`;
          }
          
          return res.status(fetchResponse.status).json({
            success: false,
            error: errorMessage,
            details: errorText,
            documentation: 'https://developer.fastly.com/reference/api/metrics-stats/realtime/'
          });
        }
        
        const logsData = await fetchResponse.json();
        console.log('Fastly logs data received:', JSON.stringify(logsData).substring(0, 200) + '...');
        
        // Check if we have real data
        if (!logsData || (Array.isArray(logsData) && logsData.length === 0)) {
          return res.status(200).json({ 
            success: true, 
            logs: [],
            message: 'No logs available from Fastly at this time',
            endpoint: fastlyUrl
          });
        }
        
        // Transform the data to match our schema
        const logs = Array.isArray(logsData) ? logsData.map((log: any, index: number) => ({
          id: log.id || `fastly-${index}-${Date.now()}`,
          timestamp: log.timestamp || new Date().toISOString(),
          clientIP: log.client_ip || log.clientip || 'unknown',
          method: log.method || null,
          url: log.url || log.request_url || null,
          status: parseInt(log.status) || null,
          userAgent: log.user_agent || log.useragent || null,
          referer: log.referer || null,
          responseTime: parseFloat(log.response_time) || parseFloat(log.time_elapsed) || null,
          bytesSent: parseInt(log.bytes_sent) || parseInt(log.bytes) || null,
          cacheStatus: log.cache_status || log.cachestatus || null,
          country: log.country || log.geo_country || null,
          region: log.region || log.geo_region || null,
          datacenter: log.datacenter || log.pop || null,
          edgeResponseTime: parseFloat(log.edge_response_time) || null,
          source: 'fastly'
        })) : [];
        
        console.log(`Successfully fetched ${logs.length} Fastly logs`);
        
        res.status(200).json({ 
          success: true, 
          logs,
          endpoint: fastlyUrl,
          total: logs.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error fetching Fastly logs:', error);
        
        // Format error message
        const errorMessage = 'Failed to fetch Fastly logs';
        
        res.status(500).json({ 
          success: false, 
          error: errorMessage,
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } catch (outerError) {
      console.error('Outer error handling Fastly logs request:', outerError);
      res.status(500).json({ 
        success: false, 
        error: 'Server error processing Fastly logs request',
        details: outerError instanceof Error ? outerError.message : 'Unknown error'
      });
    }
  });

  // API endpoint to save Fastly credentials
  app.post('/api/fastly-credentials', validateApiKey, async (req: Request, res: Response) => {
    try {
      console.log('===== FASTLY CREDENTIALS API REQUEST =====');
      console.log('Request body:', req.body);
      
      const { apiKey, serviceId, skipValidation } = req.body;
      
      if (!apiKey || !serviceId) {
        console.log('Missing required parameters: apiKey and/or serviceId');
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required parameters: apiKey and serviceId are required' 
        });
      }

      console.log(`Saving Fastly credentials for service: ${serviceId}`);
      
      // Validate the credentials with Fastly API if not skipping validation
      if (!skipValidation) {
        console.log('Validating Fastly credentials with Fastly API');
        const serviceCheckUrl = `https://api.fastly.com/service/${serviceId}`;
        
        try {
          console.log(`Checking Fastly service at URL: ${serviceCheckUrl}`);
          const serviceCheckResponse = await fetch(serviceCheckUrl, {
            method: 'GET',
            headers: {
              'Fastly-Key': apiKey,
              'Accept': 'application/json'
            }
          });
          
          console.log('Service check response status:', serviceCheckResponse.status);
          
          if (!serviceCheckResponse.ok) {
            const errorText = await serviceCheckResponse.text();
            console.error(`Fastly service check failed: ${serviceCheckResponse.status}`, errorText);
            
            // Format error message based on response code
            let errorMessage = 'Failed to validate Fastly service';
            if (serviceCheckResponse.status === 401) {
              errorMessage = 'Invalid Fastly API key';
            } else if (serviceCheckResponse.status === 404) {
              errorMessage = `Service ID '${serviceId}' not found`;
            }
            
            return res.status(serviceCheckResponse.status).json({
              success: false,
              error: errorMessage,
              details: errorText,
              statusCode: serviceCheckResponse.status
            });
          }
          
          // Service exists and API key is valid
          console.log('Fastly credentials validated successfully');
        } catch (serviceCheckError) {
          console.error('Error checking Fastly service:', serviceCheckError);
          return res.status(500).json({
            success: false,
            error: 'Failed to validate Fastly credentials',
            details: serviceCheckError instanceof Error ? serviceCheckError.message : 'Unknown error'
          });
        }
      } else {
        console.log('Skipping Fastly credentials validation');
      }
      
      // Store the credentials (in a real app, you'd use a database)
      // For now, we'll just return success
      console.log('Fastly credentials saved successfully');
      
      res.status(200).json({ 
        success: true, 
        message: 'Fastly credentials saved successfully',
        serviceId: serviceId,
        isConfigured: true
      });
      console.log('===== FASTLY CREDENTIALS API RESPONSE END =====');
    } catch (error) {
      console.error('===== FASTLY CREDENTIALS API ERROR =====');
      console.error('Error saving Fastly credentials:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save Fastly credentials',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('===== FASTLY CREDENTIALS API ERROR END =====');
    }
  });
  
  // API endpoint to get Fastly credentials
  app.get('/api/fastly-credentials', validateApiKey, async (req: Request, res: Response) => {
    try {
      console.log('===== FASTLY CREDENTIALS GET REQUEST =====');
      
      // In a real app, you'd retrieve the credentials from a database
      // For now, we'll just return a placeholder
      res.status(200).json({ 
        success: true, 
        isConfigured: false,
        message: 'No stored Fastly credentials found'
      });
      console.log('===== FASTLY CREDENTIALS GET RESPONSE END =====');
    } catch (error) {
      console.error('===== FASTLY CREDENTIALS GET ERROR =====');
      console.error('Error checking Fastly credentials:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to check Fastly credentials',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('===== FASTLY CREDENTIALS GET ERROR END =====');
    }
  });

  // Endpoint to receive Fastly logs
  app.post('/api/fastly-logs-receiver', express.json({type: 'application/json', limit: '50mb'}), async (req: Request, res: Response) => {
    try {
      // Check if this is a Fastly challenge request
      if (req.headers['fastly-challenge']) {
        console.log('Received Fastly challenge request:', req.headers['fastly-challenge']);
        // The challenge response must be the hex(sha256) of the service ID
        const serviceId = '93PPrKHinJIdt6i9nIWLY2'; // Your service ID from memory
        const crypto = require('crypto');
        const sha256Hex = crypto.createHash('sha256').update(serviceId).digest('hex');
        console.log('Responding with SHA256 of service ID:', sha256Hex);
        return res.status(200).send(sha256Hex);
      }
      
      // Store the incoming logs
      const incomingLogs = req.body;
      console.log('Received Fastly logs:', JSON.stringify(incomingLogs).substring(0, 200) + '...');
      
      // Save to file
      let existingLogs = [];
      if (fs.existsSync(LOG_FILE_PATH)) {
        const fileContent = fs.readFileSync(LOG_FILE_PATH, 'utf8');
        existingLogs = fileContent ? JSON.parse(fileContent) : [];
      }
      
      // Format the logs if they're in an array
      let newLogs = [];
      if (Array.isArray(incomingLogs)) {
        newLogs = incomingLogs.map((log, index) => ({
          id: log.id || `fastly-${index}-${Date.now()}`,
          timestamp: log.timestamp || new Date().toISOString(),
          ipAddress: log.client_ip || log.clientip || 'unknown',
          userAgent: log.user_agent || log.useragent || null,
          path: log.url || log.request_url || null,
          country: log.country || log.geo_country || null,
          isBotConfirmed: false, // Fastly doesn't provide bot detection
          botType: null,
          bypassAttempt: false,
          source: 'fastly',
          method: log.method || null,
          status: log.status || null,
          responseTime: log.response_time || log.ttfb || null,
          cacheStatus: log.cache_status || log.cachestatus || null,
          bytesSent: log.bytes_sent || log.bytes || null
        }));
      } else {
        // If it's a single log entry
        newLogs = [{
          id: `fastly-${Date.now()}`,
          timestamp: incomingLogs.timestamp || new Date().toISOString(),
          ipAddress: incomingLogs.client_ip || incomingLogs.clientip || 'unknown',
          userAgent: incomingLogs.user_agent || incomingLogs.useragent || null,
          path: incomingLogs.url || incomingLogs.request_url || '/unknown',
          country: incomingLogs.country || incomingLogs.geo_country || null,
          isBotConfirmed: false,
          botType: null,
          bypassAttempt: false,
          source: 'fastly',
          method: incomingLogs.method || 'GET',
          status: incomingLogs.status || 200,
          responseTime: incomingLogs.response_time || incomingLogs.ttfb || 0,
          cacheStatus: incomingLogs.cache_status || incomingLogs.cachestatus || 'MISS'
        }];
      }
      
      // Add new logs to existing logs
      existingLogs = [...existingLogs, ...newLogs];
      
      // Save back to file
      fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(existingLogs, null, 2));
      
      console.log(`Saved ${newLogs.length} new Fastly logs. Total logs: ${existingLogs.length}`);
      
      // Return success
      res.status(200).json({ 
        success: true, 
        message: `Received ${newLogs.length} Fastly logs`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing Fastly logs:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process Fastly logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // API endpoint to receive and process Fastly logs with detailed logging for debugging
  app.post('/api/fastly-logs-receiver-debug', express.json(), async (req: Request, res: Response) => {
    try {
      console.log('===== FASTLY LOGS RECEIVER REQUEST =====');
      console.log('Request headers:', req.headers);
      console.log('Request body sample:', JSON.stringify(req.body).substring(0, 200) + '...');
      
      // Check if this is a Fastly challenge request
      if (req.headers['fastly-challenge']) {
        console.log('Received Fastly challenge request:', req.headers['fastly-challenge']);
        // The challenge response must be the hex(sha256) of the service ID
        const serviceId = '93PPrKHinJIdt6i9nIWLY2'; // Your service ID from memory
        const crypto = require('crypto');
        const sha256Hex = crypto.createHash('sha256').update(serviceId).digest('hex');
        console.log('Responding with SHA256 of service ID:', sha256Hex);
        return res.status(200).send(sha256Hex);
      }
      
      // Process the logs
      const logs = Array.isArray(req.body) ? req.body : [req.body];
      console.log(`Processing ${logs.length} Fastly log entries`);
      
      let processedCount = 0;
      const errors: string[] = [];
      
      for (const logEntry of logs) {
        try {
          console.log(`Processing log entry #${processedCount + 1}:`, JSON.stringify(logEntry).substring(0, 100) + '...');
          
          // Convert Fastly log format to our bot log format
          const botLog = {
            ipAddress: logEntry.client_ip || logEntry.clientip || 'unknown',
            timestamp: new Date(logEntry.timestamp || Date.now()),
            path: logEntry.url || logEntry.request_url || '/unknown',
            userAgent: logEntry.user_agent || logEntry.useragent || null,
            source: 'fastly-realtime',
            country: logEntry.geo_country || logEntry.country || null,
            isBot: false, // We don't know yet
            botScore: 0,
            botReason: null,
            method: logEntry.method || 'GET',
            status: logEntry.status || 200,
            responseTime: logEntry.response_time || logEntry.ttfb || 0,
            cacheStatus: logEntry.cache_status || logEntry.cachestatus || 'MISS'
          };
          
          // Store the log in our database
          console.log('Storing log in database:', JSON.stringify(botLog).substring(0, 150) + '...');
          await storage.createBotLog(botLog);
          processedCount++;
          console.log(`Successfully stored log #${processedCount}`);
        } catch (err) {
          console.error(`Error processing Fastly log entry #${processedCount + 1}:`, err);
          errors.push(String(err));
        }
      }
      
      console.log(`Completed processing. Processed ${processedCount} logs with ${errors.length} errors`);
      
      // Return success with processing stats
      console.log('===== FASTLY LOGS RECEIVER RESPONSE END =====');
      res.status(200).json({
        success: true,
        message: `Processed ${processedCount} Fastly log entries`,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('===== FASTLY LOGS RECEIVER ERROR =====');
      console.error('Error handling Fastly logs receiver:', error);
      console.error('Request body:', req.body);
      console.error('Request headers:', req.headers);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process Fastly logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('===== FASTLY LOGS RECEIVER ERROR END =====');
    }
  });

  // API endpoint to receive Fastly logs (production version)
  app.post('/api/fastly-logs-receiver', express.json(), async (req: Request, res: Response) => {
    try {
      // Check if this is a Fastly challenge request
      if (req.headers['fastly-challenge']) {
        console.log('Received Fastly challenge request:', req.headers['fastly-challenge']);
        // The challenge response must be the hex(sha256) of the service ID
        const serviceId = '93PPrKHinJIdt6i9nIWLY2'; // Your service ID from memory
        const crypto = require('crypto');
        const sha256Hex = crypto.createHash('sha256').update(serviceId).digest('hex');
        console.log('Responding with SHA256 of service ID:', sha256Hex);
        return res.status(200).send(sha256Hex);
      }
      
      // Process the logs
      const logs = Array.isArray(req.body) ? req.body : [req.body];
      let processedCount = 0;
      const errors: string[] = [];
      
      for (const logEntry of logs) {
        try {
          // Convert Fastly log format to our bot log format
          const botLog = {
            ipAddress: logEntry.client_ip || logEntry.clientip || 'unknown',
            timestamp: new Date(logEntry.timestamp || Date.now()),
            path: logEntry.url || logEntry.request_url || '/unknown',
            userAgent: logEntry.user_agent || logEntry.useragent || null,
            source: 'fastly-realtime',
            country: logEntry.geo_country || logEntry.country || null,
            isBot: false, // We don't know yet
            botScore: 0,
            botReason: null,
            method: logEntry.method || 'GET',
            status: logEntry.status || 200,
            responseTime: logEntry.response_time || logEntry.ttfb || 0,
            cacheStatus: logEntry.cache_status || logEntry.cachestatus || 'MISS'
          };
          
          // Store the log in our database
          await storage.createBotLog(botLog);
          processedCount++;
        } catch (err) {
          errors.push(String(err));
        }
      }
      
      // Return success with processing stats
      res.status(200).json({
        success: true,
        message: `Processed ${processedCount} Fastly log entries`,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process Fastly logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Start the server
  return createServer(app);
}

// Interface for Cloudflare security event log entry
interface CloudflareSecurityEvent {
  rayId?: string;
  timestamp?: string;
  clientIP?: string;
  userAgent?: string;
  uri?: string;
  clientCountry?: string;
  action?: string;
  clientAsn?: string;
  securityLevel?: string;
  method?: string;
  clientRequestId?: string;
  edgeResponseStatus?: string;
  edgeStartTimestamp?: string;
  originResponseStatus?: string;
}

// Interface for Fastly CDN log entry
interface FastlyCDNLog {
  timestamp?: string;
  clientIP?: string;
  method?: string;
  url?: string;
  status?: number;
  userAgent?: string;
  referer?: string;
  responseTime?: number;
  bytesSent?: number;
  cacheStatus?: string;
  country?: string;
  region?: string;
  datacenter?: string;
  edgeResponseTime?: number;
}
