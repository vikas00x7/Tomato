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
  bypassAttempt: boolean("bypass_attempt").default(false),
  source: text("source"), // Where the log came from (cloudflare, paywall, etc)
});

export const insertBotLogSchema = createInsertSchema(botLogs).omit({
  id: true,
});

export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
export type BotLog = typeof botLogs.$inferSelect;