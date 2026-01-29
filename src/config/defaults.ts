/**
 * Default configuration values for Value Investing Agent
 */

export const DEFAULT_CONFIG = {
  provider: {
    name: 'yahoo-finance',
    apiKey: null as string | null,
  },
  analysis: {
    /** Discount rate for DCF calculation (10% = 0.10) */
    discountRate: 0.10,
    /** Terminal growth rate for DCF (3% = 0.03) */
    terminalGrowthRate: 0.03,
    /** Number of years to project in DCF model */
    projectionYears: 10,
    /** Minimum margin of safety required (25% = 0.25) */
    marginOfSafetyMin: 0.25,
    /** Risk-free rate for calculations (based on 10-year Treasury) */
    riskFreeRate: 0.04,
  },
  news: {
    sources: ['finnhub', 'google-news'] as string[],
    finnhubApiKey: null as string | null,
    defaultDays: 7,
    defaultLimit: 10,
  },
  report: {
    outputDir: './data/reports',
    defaultLanguage: 'en' as 'en' | 'zh',
  },
  cache: {
    enabled: true,
    ttlMinutes: 60,
  },
  watchlist: {
    maxStocks: 100,
    defaultGroup: 'other',
  },
} as const;

/**
 * Value investing threshold constants
 * Based on Benjamin Graham and Warren Buffett's principles
 */
export const VALUE_INVESTING_THRESHOLDS = {
  valuation: {
    pe: {
      undervalued: 15,
      fair: 25,
      // > 25 is considered overvalued
    },
    pb: {
      undervalued: 1.5,
      fair: 3,
      // > 3 is considered overvalued
    },
    ps: {
      good: 2,
    },
    peg: {
      undervalued: 1,
      fair: 2,
    },
    evEbitda: {
      cheap: 10,
    },
  },
  profitability: {
    roe: {
      excellent: 0.15, // 15%
      yearsRequired: 5,
    },
    roa: {
      good: 0.10, // 10%
    },
    roic: {
      excellent: 0.12, // 12%
    },
    grossMargin: {
      brandPower: 0.40, // 40%
    },
    netMargin: {
      good: 0.10, // 10%
    },
    operatingMargin: {
      good: 0.15, // 15%
    },
  },
  safety: {
    debtToAssets: {
      safe: 0.50, // < 50%
    },
    currentRatio: {
      safe: 1.5,
    },
    quickRatio: {
      safe: 1.0,
    },
    interestCoverage: {
      safe: 5,
    },
    netDebtToEbitda: {
      safe: 3,
    },
  },
  cashFlow: {
    fcfYield: {
      good: 0.05, // 5%
    },
    cashConversion: {
      quality: 0.80, // 80%
    },
    capexToDepreciation: {
      lightAsset: 1.5,
    },
  },
  marginOfSafety: {
    minimum: 0.25, // 25%
    good: 0.35, // 35%
    excellent: 0.50, // 50%
  },
} as const;

export type Config = typeof DEFAULT_CONFIG;
export type ValueThresholds = typeof VALUE_INVESTING_THRESHOLDS;
