import { 
  users, 
  type User, 
  type InsertUser,
  botLogs,
  type BotLog,
  type InsertBotLog
} from "@shared/schema";
import { eq } from "drizzle-orm";

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
}

// In-memory storage implementation for development
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private botLogs: Map<number, BotLog>;
  userCurrentId: number;
  botLogCurrentId: number;

  constructor() {
    this.users = new Map();
    this.botLogs = new Map();
    this.userCurrentId = 1;
    this.botLogCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Bot log methods
  async createBotLog(insertLog: InsertBotLog): Promise<BotLog> {
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
    
    this.botLogs.set(id, log);
    return log;
  }
  
  async getBotLogs(limit = 100): Promise<BotLog[]> {
    // Convert map to array, sort by timestamp (newest first), and limit
    return Array.from(this.botLogs.values())
      .sort((a, b) => {
        const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
        const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);
  }
  
  async getBotLogById(id: number): Promise<BotLog | undefined> {
    return this.botLogs.get(id);
  }
  
  async getBotLogsByIp(ipAddress: string): Promise<BotLog[]> {
    return Array.from(this.botLogs.values())
      .filter(log => log.ipAddress === ipAddress)
      .sort((a, b) => {
        const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
        const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
  }
}

// Note: We're using only MemStorage for now
// Database storage would require proper setup with the pg package
// which we'd typically handle with proper environment configuration

// Determine which storage implementation to use
export const storage = new MemStorage();
