import { 
  users, 
  type User, 
  type InsertUser,
  botLogs,
  type BotLog,
  type InsertBotLog
} from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';

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

// File Storage implementation for bot logs
export class FileStorage {
  private logFilePath: string;

  constructor(logFilePath = 'logs.json') {
    this.logFilePath = path.resolve(process.cwd(), logFilePath);
    this.ensureFileExists();
  }

  private ensureFileExists() {
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, JSON.stringify([]));
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

  private writeLogs(logs: BotLog[]) {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  // Log a new bot detection entry
  async logBot(log: BotLog) {
    try {
      const logs = this.readLogs();
      logs.push(log);
      this.writeLogs(logs);
      return log;
    } catch (error) {
      console.error('Error logging bot to file:', error);
      return log;
    }
  }

  // Get all logs
  async getLogs(limit = 100): Promise<BotLog[]> {
    const logs = this.readLogs();
    return logs
      .sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);
  }

  // Get logs by IP address
  async getLogsByIp(ipAddress: string): Promise<BotLog[]> {
    const logs = this.readLogs();
    return logs
      .filter(log => log.ipAddress === ipAddress)
      .sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
  }
}

// Create a hybrid storage that uses both memory and file
export class HybridStorage implements IStorage {
  private memStorage: MemStorage;
  private fileStorage: FileStorage;

  constructor() {
    this.memStorage = new MemStorage();
    this.fileStorage = new FileStorage();
  }

  // User methods - delegate to memory storage
  async getUser(id: number): Promise<User | undefined> {
    return this.memStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.memStorage.getUserByUsername(username);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.memStorage.createUser(user);
  }

  // Bot log methods - use both memory and file storage
  async createBotLog(log: InsertBotLog): Promise<BotLog> {
    // First save to memory storage
    const botLog = await this.memStorage.createBotLog(log);

    // Then also save to file storage
    await this.fileStorage.logBot(botLog);

    return botLog;
  }

  async getBotLogs(limit = 100): Promise<BotLog[]> {
    // We prioritize memory storage for faster access
    return this.memStorage.getBotLogs(limit);
  }

  async getBotLogById(id: number): Promise<BotLog | undefined> {
    return this.memStorage.getBotLogById(id);
  }

  async getBotLogsByIp(ipAddress: string): Promise<BotLog[]> {
    return this.memStorage.getBotLogsByIp(ipAddress);
  }
}

// Use our hybrid storage implementation
export const storage = new HybridStorage();