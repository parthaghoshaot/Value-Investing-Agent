import { z } from 'zod';

/**
 * Configuration schema for validation
 */
export const ConfigSchema = z.object({
  provider: z.object({
    name: z.string().default('yahoo-finance'),
    apiKey: z.string().nullable().default(null),
  }).default({}),

  analysis: z.object({
    discountRate: z.number().min(0.01).max(0.30).default(0.10),
    terminalGrowthRate: z.number().min(0).max(0.10).default(0.03),
    projectionYears: z.number().int().min(5).max(20).default(10),
    marginOfSafetyMin: z.number().min(0).max(1).default(0.25),
    riskFreeRate: z.number().min(0).max(0.20).default(0.04),
  }).default({}),

  news: z.object({
    sources: z.array(z.string()).default(['finnhub', 'google-news']),
    finnhubApiKey: z.string().nullable().default(null),
    defaultDays: z.number().int().min(1).max(30).default(7),
    defaultLimit: z.number().int().min(1).max(50).default(10),
  }).default({}),

  report: z.object({
    outputDir: z.string().default('./data/reports'),
    defaultLanguage: z.enum(['en', 'zh']).default('en'),
  }).default({}),

  cache: z.object({
    enabled: z.boolean().default(true),
    ttlMinutes: z.number().int().min(1).max(1440).default(60),
  }).default({}),

  watchlist: z.object({
    maxStocks: z.number().int().min(1).max(500).default(100),
    defaultGroup: z.string().default('other'),
  }).default({}),
});

export type ConfigInput = z.input<typeof ConfigSchema>;
export type ConfigOutput = z.output<typeof ConfigSchema>;

/**
 * Watchlist schema
 */
export const WatchlistGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameEn: z.string(),
});

export const WatchlistStockSchema = z.object({
  ticker: z.string().toUpperCase(),
  name: z.string(),
  addedAt: z.string(),
  group: z.string(),
  notes: z.string().optional(),
});

export const WatchlistSchema = z.object({
  version: z.string(),
  updatedAt: z.string(),
  stocks: z.array(WatchlistStockSchema),
  groups: z.array(WatchlistGroupSchema),
  settings: z.object({
    maxStocks: z.number(),
    defaultGroup: z.string(),
  }),
});

export type WatchlistGroup = z.infer<typeof WatchlistGroupSchema>;
export type WatchlistStock = z.infer<typeof WatchlistStockSchema>;
export type Watchlist = z.infer<typeof WatchlistSchema>;
