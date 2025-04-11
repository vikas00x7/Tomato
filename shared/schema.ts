import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Bot logs table to track bot visits
export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  path: text("path"),
  country: text("country"),
  city: text("city"),
  isBotConfirmed: boolean("is_bot_confirmed").default(true),
  fingerprint: jsonb("fingerprint"), // Stores the fingerprint data
  headers: jsonb("headers"), // Stores request headers
  referrer: text("referrer"),
  botType: text("bot_type"), // The type of bot detected (search_engine, crawler, ai_assistant, etc.)
  bypassAttempt: boolean("bypass_attempt").default(false),
  source: text("source"), // Where the log came from (cloudflare, paywall, etc)
});

export const insertBotLogSchema = createInsertSchema(botLogs).omit({
  id: true,
});

export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
export type BotLog = typeof botLogs.$inferSelect;

// IP Blacklist table to track blocked IPs
export const ipBlacklist = pgTable("ip_blacklist", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull().unique(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  reason: text("reason"),
});

export const insertIpBlacklistSchema = createInsertSchema(ipBlacklist).omit({
  id: true,
});

export type InsertIpBlacklist = z.infer<typeof insertIpBlacklistSchema>;
export type IpBlacklist = typeof ipBlacklist.$inferSelect;

// IP Whitelist table to track allowed IPs
export const ipWhitelist = pgTable("ip_whitelist", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull().unique(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  reason: text("reason"),
});

export const insertIpWhitelistSchema = createInsertSchema(ipWhitelist).omit({
  id: true,
});

export type InsertIpWhitelist = z.infer<typeof insertIpWhitelistSchema>;
export type IpWhitelist = typeof ipWhitelist.$inferSelect;

// Bot Policy configuration
export const botPolicySchema = z.object({
  enabled: z.boolean().default(true),
  threshold: z.number().min(0).max(100).default(70),
  challengeType: z.enum(['simple', 'complex', 'captcha']).default('simple'),
  blockDuration: z.number().min(1).default(24),
  customMessages: z.object({
    detected: z.string().default('Bot activity detected'),
    blocked: z.string().default('Your access has been blocked due to suspicious activity'),
    challenge: z.string().default('Please complete the challenge to continue'),
    success: z.string().default('Challenge completed successfully'),
  }).default({
    detected: 'Bot activity detected',
    blocked: 'Your access has been blocked due to suspicious activity',
    challenge: 'Please complete the challenge to continue',
    success: 'Challenge completed successfully',
  }),
});

export type BotPolicy = z.infer<typeof botPolicySchema>;

// CloudFlare credentials schema
export const cloudflareCredentialsSchema = z.object({
  apiKey: z.string().trim().min(1, 'API Key is required'),
  email: z.string().email('Invalid email format').or(z.string().trim().optional()), 
  accountId: z.string().trim().optional(), 
  zoneId: z.string().trim().min(1, 'Zone ID is required'),
  isConfigured: z.boolean().optional(),
  skipValidation: z.boolean().optional(),
  useMockMode: z.boolean().optional()
});

export type CloudflareCredentials = z.infer<typeof cloudflareCredentialsSchema>;

// CloudFlare log entry schema for displaying in the admin
export const cloudflareLogSchema = z.object({
  id: z.string(),
  timestamp: z.string().transform(val => new Date(val)),
  ipAddress: z.string(),
  userAgent: z.string().nullable(),
  path: z.string().nullable(),
  country: z.string().nullable(),
  action: z.enum(['allow', 'challenge', 'block', 'jschallenge']).nullable(),
  source: z.string().default('cloudflare'),
  botScore: z.number().nullable(),
  botCategory: z.string().nullable(),
  method: z.string().nullable(),
  clientRequestId: z.string().nullable(),
  edgeResponseStatus: z.number().nullable(),
  edgeStartTimestamp: z.string().nullable().transform(val => val ? new Date(val) : null),
  rayId: z.string().nullable(),
  originResponseStatus: z.number().nullable(),
});

export type CloudflareLog = z.infer<typeof cloudflareLogSchema>;

// Fastly CDN credentials schema
export const fastlyCredentialsSchema = z.object({
  apiKey: z.string().trim().min(1, 'API Key is required'),
  serviceId: z.string().trim().min(1, 'Service ID is required'),
  isConfigured: z.boolean().optional(),
  skipValidation: z.boolean().optional(),
  useMockMode: z.boolean().optional()
});

export type FastlyCredentials = z.infer<typeof fastlyCredentialsSchema>;

// Fastly CDN log entry schema for displaying in the admin
export const fastlyLogSchema = z.object({
  id: z.string(),
  timestamp: z.string().transform(val => new Date(val)),
  clientIP: z.string(),
  method: z.string().nullable(),
  url: z.string().nullable(),
  status: z.number().nullable(),
  userAgent: z.string().nullable(),
  referer: z.string().nullable(),
  responseTime: z.number().nullable(),
  bytesSent: z.number().nullable(),
  cacheStatus: z.string().nullable(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  datacenter: z.string().nullable(),
  edgeResponseTime: z.number().nullable(),
  source: z.string().default('fastly')
});

export type FastlyLog = z.infer<typeof fastlyLogSchema>;