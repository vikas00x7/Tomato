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

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

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
      fingerprint: insertLog.fingerprint as Json | null || null,
      headers: insertLog.headers as Json | null || null,
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
export class FileStorage implements IStorage {
  private logFilePath: string;

  constructor(logFilePath = 'logs.json') {
    this.logFilePath = path.resolve(process.cwd(), logFilePath);
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    try {
      console.log('Ensuring logs file exists:', this.logFilePath);
      if (!fs.existsSync(this.logFilePath)) {
        console.log('Creating new logs file');
        fs.writeFileSync(this.logFilePath, '[]');
      }
    } catch (error) {
      console.error('Error ensuring file exists:', error);
      throw error;
    }
  }

  private readLogs(): BotLog[] {
    try {
      console.log('Reading logs from file:', this.logFilePath);
      if (!fs.existsSync(this.logFilePath)) {
        console.log('Logs file does not exist, creating empty array');
        return [];
      }
      const data = fs.readFileSync(this.logFilePath, 'utf8');
      console.log('Raw log data:', data);
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading logs:', error);
      return [];
    }
  }

  private writeLogs(logs: BotLog[]): void {
    try {
      console.log('Writing logs to file:', this.logFilePath);
      fs.writeFileSync(this.logFilePath, JSON.stringify(logs, null, 2));
      console.log('Successfully wrote logs to file');
    } catch (error) {
      console.error('Error writing logs:', error);
      throw error;
    }
  }

  private getNextId(): number {
    const logs = this.readLogs();
    return logs.length > 0 ? Math.max(...logs.map(log => log.id)) + 1 : 1;
  }

  // Log a new bot detection entry
  async createBotLog(log: InsertBotLog): Promise<BotLog> {
    try {
      const id = this.getNextId();
      const now = new Date();

      const botLog: BotLog = { 
        id, 
        timestamp: log.timestamp || now,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent || null,
        path: log.path || null,
        country: log.country || null,
        city: log.city || null,
        isBotConfirmed: log.isBotConfirmed !== undefined ? log.isBotConfirmed : true,
        fingerprint: log.fingerprint as Json | null || null,
        headers: log.headers as Json | null || null,
        referrer: log.referrer || null,
        bypassAttempt: log.bypassAttempt !== undefined ? log.bypassAttempt : false,
        source: log.source || null
      };

      const logs = this.readLogs();
      logs.push(botLog);
      this.writeLogs(logs);
      return botLog;
    } catch (error: any) {
      console.error('Error logging bot to file:', error);
      throw new Error(`Failed to create bot log: ${error?.message || 'Unknown error'}`);
    }
  }

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

  async getBotLogById(id: number): Promise<BotLog | undefined> {
    const logs = this.readLogs();
    return logs.find(log => log.id === id);
  }

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

  async getUser(id: number): Promise<User | undefined> {
    throw new Error('Method not implemented.');
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    throw new Error('Method not implemented.');
  }

  async createUser(user: InsertUser): Promise<User> {
    throw new Error('Method not implemented.');
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
    await this.fileStorage.createBotLog(botLog);

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

// Use file storage implementation only for now
export const storage = new FileStorage();