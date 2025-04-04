import { 
  users, 
  type User, 
  type InsertUser,
  botLogs,
  type BotLog,
  type InsertBotLog
} from "@shared/schema";
import * as fs from 'fs';
import * as path from 'path';

// New interfaces for IP blacklist/whitelist and bot policy
interface IPListEntry {
  ipAddress: string;
  addedAt: Date;
  reason: string;
}

interface BotPolicy {
  enabled: boolean;
  threshold: number;
  challengeType: 'simple' | 'complex' | 'captcha';
  blockDuration: number;
  customMessages: {
    detected: string;
    blocked: string;
    challenge: string;
    success: string;
  }
}

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Bot log methods
  createBotLog(log: InsertBotLog): Promise<BotLog>;
  getBotLogs(limit?: number): Promise<BotLog[]>;
  getBotLogById(id: number): Promise<BotLog | undefined>;
  getBotLogsByIp(ipAddress: string): Promise<BotLog[]>;
  getLogs(): Promise<BotLog[]>;
  clearLogs(): Promise<void>;
  
  // IP management methods
  getIPBlacklist(): Promise<IPListEntry[]>;
  addToIPBlacklist(ipAddress: string, reason?: string): Promise<void>;
  removeFromIPBlacklist(ipAddress: string): Promise<void>;
  getIPWhitelist(): Promise<IPListEntry[]>;
  addToIPWhitelist(ipAddress: string, reason?: string): Promise<void>;
  removeFromIPWhitelist(ipAddress: string): Promise<void>;
  
  // Bot policy methods
  getBotPolicy(): Promise<BotPolicy>;
  updateBotPolicy(policy: BotPolicy): Promise<void>;
}

// File Storage implementation for bot logs
export class FileStorage implements IStorage {
  private logFilePath: string;
  private userFilePath: string;
  private blacklistFilePath: string;
  private whitelistFilePath: string;
  private botPolicyFilePath: string;
  private userCurrentId: number;
  private botLogCurrentId: number;

  constructor(
    logFilePath = 'logs/bot_logs.json', 
    userFilePath = 'users.json',
    blacklistFilePath = 'logs/ip_blacklist.json',
    whitelistFilePath = 'logs/ip_whitelist.json',
    botPolicyFilePath = 'logs/bot_policy.json'
  ) {
    this.logFilePath = path.resolve(process.cwd(), logFilePath);
    this.userFilePath = path.resolve(process.cwd(), userFilePath);
    this.blacklistFilePath = path.resolve(process.cwd(), blacklistFilePath);
    this.whitelistFilePath = path.resolve(process.cwd(), whitelistFilePath);
    this.botPolicyFilePath = path.resolve(process.cwd(), botPolicyFilePath);
    
    this.ensureFilesExist();
    
    // Initialize IDs based on existing data
    const logs = this.readLogs();
    const maxLogId = logs.length > 0 ? Math.max(...logs.map(log => log.id)) : 0;
    this.botLogCurrentId = maxLogId + 1;
    
    const users = this.readUsers();
    const maxUserId = users.length > 0 ? Math.max(...users.map(user => user.id)) : 0;
    this.userCurrentId = maxUserId + 1;
  }

  private ensureFilesExist() {
    // Ensure directory exists
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Ensure log file exists
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, JSON.stringify([]));
    }
    
    // Ensure user file exists
    if (!fs.existsSync(this.userFilePath)) {
      fs.writeFileSync(this.userFilePath, JSON.stringify([]));
    }
    
    // Ensure blacklist file exists
    if (!fs.existsSync(this.blacklistFilePath)) {
      fs.writeFileSync(this.blacklistFilePath, JSON.stringify([]));
    }
    
    // Ensure whitelist file exists
    if (!fs.existsSync(this.whitelistFilePath)) {
      fs.writeFileSync(this.whitelistFilePath, JSON.stringify([]));
    }
    
    // Ensure bot policy file exists with default policy
    if (!fs.existsSync(this.botPolicyFilePath)) {
      const defaultPolicy: BotPolicy = {
        enabled: true,
        threshold: 5,
        challengeType: 'simple',
        blockDuration: 300,
        customMessages: {
          detected: "Bot detected!",
          blocked: "You have been blocked for 5 minutes.",
          challenge: "Please complete the challenge to continue.",
          success: "Challenge completed successfully!"
        }
      };
      fs.writeFileSync(this.botPolicyFilePath, JSON.stringify(defaultPolicy, null, 2));
    }
  }

  private readLogs(): BotLog[] {
    try {
      const fileContent = fs.readFileSync(this.logFilePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading log file:', error);
      return [];
    }
  }
  
  private readUsers(): User[] {
    try {
      const fileContent = fs.readFileSync(this.userFilePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading users file:', error);
      return [];
    }
  }
  
  private readIPBlacklist(): IPListEntry[] {
    try {
      const fileContent = fs.readFileSync(this.blacklistFilePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading IP blacklist file:', error);
      return [];
    }
  }
  
  private readIPWhitelist(): IPListEntry[] {
    try {
      const fileContent = fs.readFileSync(this.whitelistFilePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading IP whitelist file:', error);
      return [];
    }
  }
  
  private readBotPolicy(): BotPolicy {
    try {
      const fileContent = fs.readFileSync(this.botPolicyFilePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading bot policy file:', error);
      // Return default policy on error
      return {
        enabled: true,
        threshold: 5,
        challengeType: 'simple',
        blockDuration: 300,
        customMessages: {
          detected: "Bot detected!",
          blocked: "You have been blocked for 5 minutes.",
          challenge: "Please complete the challenge to continue.",
          success: "Challenge completed successfully!"
        }
      };
    }
  }

  private writeUsers(users: User[]) {
    try {
      fs.writeFileSync(this.userFilePath, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('Error writing to users file:', error);
    }
  }

  private writeLogs(logs: BotLog[]) {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }
  
  private writeIPBlacklist(blacklist: IPListEntry[]) {
    try {
      fs.writeFileSync(this.blacklistFilePath, JSON.stringify(blacklist, null, 2));
    } catch (error) {
      console.error('Error writing to IP blacklist file:', error);
    }
  }
  
  private writeIPWhitelist(whitelist: IPListEntry[]) {
    try {
      fs.writeFileSync(this.whitelistFilePath, JSON.stringify(whitelist, null, 2));
    } catch (error) {
      console.error('Error writing to IP whitelist file:', error);
    }
  }
  
  private writeBotPolicy(policy: BotPolicy) {
    try {
      fs.writeFileSync(this.botPolicyFilePath, JSON.stringify(policy, null, 2));
    } catch (error) {
      console.error('Error writing to bot policy file:', error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const users = this.readUsers();
    return users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = this.readUsers();
    return users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const users = this.readUsers();
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    users.push(user);
    this.writeUsers(users);
    return user;
  }

  // Bot log methods
  async createBotLog(insertLog: InsertBotLog): Promise<BotLog> {
    const logs = this.readLogs();
    const id = this.botLogCurrentId++;
    const now = new Date();

    // Create a BotLog with default values for any missing fields
    const log: BotLog = { 
      id, 
      timestamp: insertLog.timestamp || now,
      ipAddress: insertLog.ipAddress,
      userAgent: insertLog.userAgent || null,
      path: insertLog.path || null,
      country: insertLog.country || null,
      city: insertLog.city || null,
      isBotConfirmed: insertLog.isBotConfirmed !== undefined ? insertLog.isBotConfirmed : true,
      fingerprint: insertLog.fingerprint || null,
      headers: insertLog.headers || null,
      referrer: insertLog.referrer || null,
      bypassAttempt: insertLog.bypassAttempt !== undefined ? insertLog.bypassAttempt : false,
      source: insertLog.source || null
    };

    logs.push(log);
    this.writeLogs(logs);
    console.log(`Added log #${id} to file storage for path: ${log.path}`);
    return log;
  }

  // Get all logs
  async getBotLogs(limit = 100): Promise<BotLog[]> {
    const logs = this.readLogs();
    return logs
      .sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);
  }
  
  // Get all logs without limit
  async getLogs(): Promise<BotLog[]> {
    const logs = this.readLogs();
    return logs.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });
  }
  
  // Clear all logs
  async clearLogs(): Promise<void> {
    this.writeLogs([]);
    this.botLogCurrentId = 1;
  }
  
  // Get bot log by ID
  async getBotLogById(id: number): Promise<BotLog | undefined> {
    const logs = this.readLogs();
    return logs.find(log => log.id === id);
  }

  // Get logs by IP address
  async getBotLogsByIp(ipAddress: string): Promise<BotLog[]> {
    const logs = this.readLogs();
    return logs
      .filter(log => log.ipAddress === ipAddress)
      .sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  // IP Blacklist methods
  async getIPBlacklist(): Promise<IPListEntry[]> {
    return this.readIPBlacklist();
  }
  
  async addToIPBlacklist(ipAddress: string, reason = 'Manually blocked'): Promise<void> {
    const blacklist = this.readIPBlacklist();
    
    // Check if IP is already blacklisted
    const existingEntry = blacklist.find(entry => entry.ipAddress === ipAddress);
    if (existingEntry) {
      // Update reason and timestamp if already exists
      existingEntry.reason = reason;
      existingEntry.addedAt = new Date();
    } else {
      // Add new entry
      blacklist.push({
        ipAddress,
        addedAt: new Date(),
        reason
      });
    }
    
    this.writeIPBlacklist(blacklist);
  }
  
  async removeFromIPBlacklist(ipAddress: string): Promise<void> {
    const blacklist = this.readIPBlacklist();
    const newBlacklist = blacklist.filter(entry => entry.ipAddress !== ipAddress);
    this.writeIPBlacklist(newBlacklist);
  }
  
  // IP Whitelist methods
  async getIPWhitelist(): Promise<IPListEntry[]> {
    return this.readIPWhitelist();
  }
  
  async addToIPWhitelist(ipAddress: string, reason = 'Manually whitelisted'): Promise<void> {
    const whitelist = this.readIPWhitelist();
    
    // Check if IP is already whitelisted
    const existingEntry = whitelist.find(entry => entry.ipAddress === ipAddress);
    if (existingEntry) {
      // Update reason and timestamp if already exists
      existingEntry.reason = reason;
      existingEntry.addedAt = new Date();
    } else {
      // Add new entry
      whitelist.push({
        ipAddress,
        addedAt: new Date(),
        reason
      });
    }
    
    this.writeIPWhitelist(whitelist);
  }
  
  async removeFromIPWhitelist(ipAddress: string): Promise<void> {
    const whitelist = this.readIPWhitelist();
    const newWhitelist = whitelist.filter(entry => entry.ipAddress !== ipAddress);
    this.writeIPWhitelist(newWhitelist);
  }
  
  // Bot Policy methods
  async getBotPolicy(): Promise<BotPolicy> {
    try {
      if (!fs.existsSync(this.botPolicyFilePath)) {
        return {
          enabled: true,
          threshold: 5,
          challengeType: 'simple',
          blockDuration: 300,
          customMessages: {
            detected: "Bot detected!",
            blocked: "You have been blocked for 5 minutes.",
            challenge: "Please complete the challenge to continue.",
            success: "Challenge completed successfully!"
          }
        };
      }

      const data = await fs.promises.readFile(this.botPolicyFilePath, 'utf-8');
      const policy = JSON.parse(data);
      
      // Ensure the policy has the expected structure
      const defaultPolicy = {
        enabled: true,
        threshold: 5,
        challengeType: 'simple',
        blockDuration: 300,
        customMessages: {
          detected: "Bot detected!",
          blocked: "You have been blocked for 5 minutes.",
          challenge: "Please complete the challenge to continue.",
          success: "Challenge completed successfully!"
        }
      };
      
      // Convert old format to new format if needed
      if (policy.blockByDefault !== undefined) {
        // Old format detected, convert to new format
        return {
          enabled: policy.blockByDefault,
          threshold: 5, // Default threshold
          challengeType: 'simple',
          blockDuration: 300,
          customMessages: {
            detected: "Bot detected!",
            blocked: policy.blockedMessage || "Your bot has been blocked from accessing this website.",
            challenge: "Please complete the challenge to continue.",
            success: "Challenge completed successfully!"
          }
        };
      }
      
      // Ensure all expected fields exist
      return {
        enabled: policy.enabled !== undefined ? policy.enabled : defaultPolicy.enabled,
        threshold: policy.threshold !== undefined ? policy.threshold : defaultPolicy.threshold,
        challengeType: policy.challengeType || defaultPolicy.challengeType,
        blockDuration: policy.blockDuration !== undefined ? policy.blockDuration : defaultPolicy.blockDuration,
        customMessages: {
          detected: policy.customMessages?.detected || defaultPolicy.customMessages.detected,
          blocked: policy.customMessages?.blocked || defaultPolicy.customMessages.blocked,
          challenge: policy.customMessages?.challenge || defaultPolicy.customMessages.challenge,
          success: policy.customMessages?.success || defaultPolicy.customMessages.success
        }
      };
    } catch (error) {
      console.error('Error reading bot policy file:', error);
      // Return default policy on error
      return {
        enabled: true,
        threshold: 5,
        challengeType: 'simple',
        blockDuration: 300,
        customMessages: {
          detected: "Bot detected!",
          blocked: "You have been blocked for 5 minutes.",
          challenge: "Please complete the challenge to continue.",
          success: "Challenge completed successfully!"
        }
      };
    }
  }
  
  async updateBotPolicy(policy: BotPolicy): Promise<void> {
    this.writeBotPolicy(policy);
  }
}

// Use file storage implementation
export const storage = new FileStorage();