import { users, type User, type InsertUser, botLogs, type BotLog, type InsertBotLog } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Bot log methods
  logBotRequest(botLog: InsertBotLog): Promise<BotLog>;
  getBotLogs(): Promise<BotLog[]>;
  getBotLogById(id: number): Promise<BotLog | undefined>;
}

// Memory-based storage for development/testing
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

  async logBotRequest(botLog: InsertBotLog): Promise<BotLog> {
    const id = this.botLogCurrentId++;
    const timestamp = new Date();
    const log: BotLog = { ...botLog, id, timestamp };
    this.botLogs.set(id, log);
    return log;
  }

  async getBotLogs(): Promise<BotLog[]> {
    return Array.from(this.botLogs.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getBotLogById(id: number): Promise<BotLog | undefined> {
    return this.botLogs.get(id);
  }
}

// For now, use MemStorage
export const storage = new MemStorage();
