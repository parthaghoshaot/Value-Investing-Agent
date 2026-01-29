/**
 * Global Type Definitions
 */

// Re-export provider types
export * from '../providers/types.js';

/**
 * Financial ratio analysis results
 */
export interface FinancialRatios {
  // Valuation Ratios
  pe: number | null;
  pb: number | null;
  ps: number | null;
  peg: number | null;
  evToEbitda: number | null;
  priceToFcf: number | null;

  // Profitability Ratios
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roa: number;
  roic: number | null;

  // Liquidity & Solvency Ratios
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  debtToAssets: number;
  interestCoverage: number | null;
  netDebtToEbitda: number | null;

  // Cash Flow Ratios
  fcfYield: number | null;
  cashConversion: number | null;
  capexToDepreciation: number | null;

  // Growth Rates (CAGR)
  revenueGrowth5Y: number | null;
  epsGrowth5Y: number | null;
  fcfGrowth5Y: number | null;
  dividendGrowth5Y: number | null;
}

/**
 * Intrinsic value calculation result
 */
export interface IntrinsicValueResult {
  ticker: string;
  currentPrice: number;
  currency: string;

  // DCF Valuation
  dcfValue: number;
  dcfAssumptions: {
    discountRate: number;
    terminalGrowthRate: number;
    projectionYears: number;
    estimatedGrowthRate: number;
    projectedFcf: number[];
    terminalValue: number;
  };

  // Graham Valuation
  grahamNumber: number;
  grahamValue: number | null;
  grahamAssumptions: {
    eps: number;
    bookValuePerShare: number;
    growthRate: number | null;
    bondYield: number;
  };

  // Margin of Safety
  marginOfSafety: {
    vsDcf: number;
    vsGraham: number;
  };

  // Valuation Summary
  valuationSummary: {
    averageIntrinsicValue: number;
    status: 'undervalued' | 'fair' | 'overvalued';
    recommendation: string;
  };

  // Metadata
  calculatedAt: Date;
}

/**
 * Moat analysis result
 */
export interface MoatAnalysis {
  ticker: string;
  companyName: string;

  // Overall Score (1-5)
  overallScore: number;
  moatRating: 'none' | 'narrow' | 'wide';

  // Individual Moat Dimensions
  dimensions: {
    brandPower: {
      score: number;
      evidence: string[];
      metrics: { grossMargin: number; grossMarginStability: number };
    };
    costAdvantage: {
      score: number;
      evidence: string[];
      metrics: { operatingMargin: number; operatingMarginVsIndustry: number | null };
    };
    networkEffect: {
      score: number;
      evidence: string[];
      metrics: { revenueGrowth: number; userGrowth: number | null };
    };
    switchingCosts: {
      score: number;
      evidence: string[];
      metrics: { revenueStability: number; customerRetention: number | null };
    };
    scaleEconomies: {
      score: number;
      evidence: string[];
      metrics: { marketCap: number; revenuePerEmployee: number | null };
    };
  };

  // Moat Durability
  durability: {
    score: number;
    assessment: 'weak' | 'moderate' | 'strong';
    factors: string[];
  };

  // Analysis Date
  analyzedAt: Date;
}

/**
 * Daily report data
 */
export interface DailyReportData {
  date: Date;
  marketSummary?: string;

  stocks: Array<{
    ticker: string;
    name: string;
    group: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    week52High: number;
    week52Low: number;
    distanceFrom52WeekLow: number;
    pe: number | null;
    marginOfSafety?: number;
  }>;

  alerts: {
    bigMovers: Array<{ ticker: string; changePercent: number }>;
    near52WeekLow: Array<{ ticker: string; distancePercent: number }>;
    marginOfSafetyChanges: Array<{ ticker: string; change: number }>;
  };

  newsHighlights: Array<{
    ticker: string;
    title: string;
    source: string;
    url: string;
  }>;
}

/**
 * Stock report sections
 */
export interface StockReport {
  ticker: string;
  companyName: string;
  generatedAt: Date;
  language: 'en' | 'zh';

  sections: {
    executiveSummary: string;
    companyOverview: string;
    businessModel: string;
    economicMoat: string;
    financialHealth: {
      profitability: string;
      growth: string;
      safety: string;
      cashFlow: string;
    };
    intrinsicValue: string;
    marginOfSafety: string;
    riskFactors: string;
    conclusion: string;
  };

  data: {
    quote: import('../providers/types.js').StockQuote;
    profile: import('../providers/types.js').CompanyProfile;
    ratios: FinancialRatios;
    intrinsicValue: IntrinsicValueResult;
    moat: MoatAnalysis;
  };

  disclaimer: string;
}

/**
 * Tool response wrapper
 */
export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

/**
 * Valuation status
 */
export type ValuationStatus = 'undervalued' | 'fair' | 'overvalued';

/**
 * Helper to create success response
 */
export function successResponse<T>(data: T): ToolResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date(),
  };
}

/**
 * Helper to create error response
 */
export function errorResponse(error: string): ToolResponse<never> {
  return {
    success: false,
    error,
    timestamp: new Date(),
  };
}
