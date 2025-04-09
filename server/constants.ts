import path from 'path';

// File paths
export const LOGS_DIR = path.join(process.cwd(), 'logs');
export const LOG_FILE_PATH = path.join(LOGS_DIR, 'bot_logs.json');
export const BLACKLIST_FILE_PATH = path.join(LOGS_DIR, 'ip_blacklist.json');
export const WHITELIST_FILE_PATH = path.join(LOGS_DIR, 'ip_whitelist.json');
export const BOT_POLICY_FILE_PATH = path.join(LOGS_DIR, 'bot_policy.json');
export const CLOUDFLARE_CREDENTIALS_FILE_PATH = path.join(LOGS_DIR, 'cloudflare_credentials.json');

// API Keys
export const API_KEYS = [
  'tomato-api-key-9c8b7a6d5e4f3g2h1i'
];

// Bot detection constants
export const BOT_CONFIDENCE_THRESHOLD = 70;
