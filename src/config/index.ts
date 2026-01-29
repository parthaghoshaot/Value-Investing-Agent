import * as fs from 'fs';
import * as path from 'path';
import { ConfigSchema, type ConfigOutput, WatchlistSchema, type Watchlist } from './schema.js';
import { DEFAULT_CONFIG, VALUE_INVESTING_THRESHOLDS } from './defaults.js';

/**
 * Get the data directory path
 */
export function getDataDir(): string {
  const envDir = process.env.DATA_DIR;
  if (envDir) {
    return path.resolve(envDir);
  }
  return path.resolve(process.cwd(), 'data');
}

/**
 * Get the config file path
 */
export function getConfigPath(): string {
  return path.join(getDataDir(), 'config.json');
}

/**
 * Get the watchlist file path
 */
export function getWatchlistPath(): string {
  return path.join(getDataDir(), 'watchlist.json');
}

/**
 * Load configuration from file and environment
 */
export function loadConfig(): ConfigOutput {
  let fileConfig = {};

  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      fileConfig = JSON.parse(content);
    } catch (error) {
      console.error(`Warning: Failed to parse config file: ${error}`);
    }
  }

  // Merge environment variables
  const envConfig = {
    news: {
      finnhubApiKey: process.env.FINNHUB_API_KEY || null,
    },
    provider: {
      apiKey: process.env.ALPHA_VANTAGE_API_KEY || process.env.POLYGON_API_KEY || null,
    },
    cache: {
      ttlMinutes: process.env.CACHE_TTL_MINUTES
        ? parseInt(process.env.CACHE_TTL_MINUTES, 10)
        : undefined,
    },
    report: {
      defaultLanguage: process.env.DEFAULT_LANGUAGE as 'en' | 'zh' | undefined,
    },
  };

  // Deep merge: DEFAULT_CONFIG < fileConfig < envConfig
  const merged = deepMerge(DEFAULT_CONFIG, fileConfig, envConfig);

  // Validate and return
  return ConfigSchema.parse(merged);
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Partial<ConfigOutput>): void {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const currentConfig = loadConfig();
  const merged = deepMerge(currentConfig, config);

  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
}

/**
 * Load watchlist from file
 */
export function loadWatchlist(): Watchlist {
  const watchlistPath = getWatchlistPath();

  if (!fs.existsSync(watchlistPath)) {
    // Return default empty watchlist
    return {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      stocks: [],
      groups: [
        { id: 'tech', name: '科技', nameEn: 'Technology' },
        { id: 'consumer', name: '消费', nameEn: 'Consumer' },
        { id: 'finance', name: '金融', nameEn: 'Finance' },
        { id: 'healthcare', name: '医疗', nameEn: 'Healthcare' },
        { id: 'industrial', name: '工业', nameEn: 'Industrial' },
        { id: 'energy', name: '能源', nameEn: 'Energy' },
        { id: 'other', name: '其他', nameEn: 'Other' },
      ],
      settings: {
        maxStocks: 100,
        defaultGroup: 'other',
      },
    };
  }

  try {
    const content = fs.readFileSync(watchlistPath, 'utf-8');
    const data = JSON.parse(content);
    return WatchlistSchema.parse(data);
  } catch (error) {
    throw new Error(`Failed to load watchlist: ${error}`);
  }
}

/**
 * Save watchlist to file
 */
export function saveWatchlist(watchlist: Watchlist): void {
  const watchlistPath = getWatchlistPath();
  const dir = path.dirname(watchlistPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  watchlist.updatedAt = new Date().toISOString();
  const validated = WatchlistSchema.parse(watchlist);

  fs.writeFileSync(watchlistPath, JSON.stringify(validated, null, 2), 'utf-8');
}

/**
 * Deep merge objects
 */
function deepMerge<T extends Record<string, unknown>>(...objects: Partial<T>[]): T {
  const result: Record<string, unknown> = {};

  for (const obj of objects) {
    if (!obj) continue;

    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (value === undefined) continue;

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(
          result[key] as Record<string, unknown>,
          value as Record<string, unknown>
        );
      } else {
        result[key] = value;
      }
    }
  }

  return result as T;
}

// Re-export defaults and thresholds
export { DEFAULT_CONFIG, VALUE_INVESTING_THRESHOLDS };
export type { ConfigOutput as Config };
