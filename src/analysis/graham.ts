/**
 * Graham Valuation Methods
 *
 * Implementation of Benjamin Graham's valuation formulas from
 * "The Intelligent Investor" and "Security Analysis".
 *
 * Key concepts:
 * - Graham Number: Maximum price for a defensive investor
 * - Graham Growth Formula: Value based on expected growth
 */

import type { Financials, StockQuote } from '../providers/types.js';
import { calculateCAGR } from './ratios.js';

/**
 * Graham valuation result
 */
export interface GrahamResult {
  /** Graham Number - max price for defensive investor */
  grahamNumber: number;
  /** Graham Growth Value (if applicable) */
  grahamGrowthValue: number | null;
  /** Current EPS used */
  eps: number;
  /** Book value per share used */
  bookValuePerShare: number;
  /** Growth rate used (for growth formula) */
  growthRate: number | null;
  /** Bond yield used (for growth formula) */
  bondYield: number;
  /** Whether stock passes Graham's defensive criteria */
  passesDefensiveCriteria: boolean;
  /** Defensive criteria details */
  defensiveCriteria: {
    criterion: string;
    passed: boolean;
    detail: string;
  }[];
}

/**
 * Calculate Graham Number
 *
 * Graham Number = √(22.5 × EPS × Book Value per Share)
 *
 * The constant 22.5 comes from:
 * - P/E should not exceed 15
 * - P/B should not exceed 1.5
 * - 15 × 1.5 = 22.5
 *
 * Graham stated that a stock should not be purchased if:
 * Price > √(22.5 × EPS × BVPS)
 *
 * @param eps - Earnings per share (TTM)
 * @param bookValuePerShare - Book value per share
 * @returns Graham Number (intrinsic value ceiling)
 */
export function calculateGrahamNumber(eps: number, bookValuePerShare: number): number {
  // Both EPS and BVPS must be positive
  if (eps <= 0 || bookValuePerShare <= 0) {
    return 0;
  }

  // Graham Number = √(22.5 × EPS × BVPS)
  return Math.sqrt(22.5 * eps * bookValuePerShare);
}

/**
 * Calculate Graham Growth Value
 *
 * Benjamin Graham's formula for growth stocks:
 * V = EPS × (8.5 + 2g) × 4.4 / Y
 *
 * Where:
 * - EPS = Earnings per share
 * - g = Expected annual growth rate over next 7-10 years
 * - 8.5 = P/E for a company with zero growth
 * - 4.4 = Average yield on AAA corporate bonds when formula was devised (1962)
 * - Y = Current yield on AAA corporate bonds (or 10-year Treasury)
 *
 * Modern adaptation often uses risk-free rate or 10-year Treasury yield
 *
 * @param eps - Earnings per share
 * @param growthRate - Expected growth rate (decimal, e.g., 0.10 for 10%)
 * @param bondYield - Current AAA bond yield or Treasury yield (decimal)
 * @returns Graham Growth Value
 */
export function calculateGrahamGrowthValue(
  eps: number,
  growthRate: number,
  bondYield: number
): number | null {
  if (eps <= 0 || bondYield <= 0) {
    return null;
  }

  // Growth rate as a whole number (0.10 -> 10)
  const g = growthRate * 100;

  // Graham Growth Formula
  // V = EPS × (8.5 + 2g) × 4.4 / Y
  const value = eps * (8.5 + 2 * g) * 4.4 / (bondYield * 100);

  return Math.max(0, value);
}

/**
 * Calculate full Graham valuation
 *
 * @param financials - Financial statement data
 * @param quote - Current quote data
 * @param bondYield - Current bond yield (default 4%)
 */
export function calculateGrahamValuation(
  financials: Financials,
  quote: StockQuote,
  bondYield = 0.04
): GrahamResult {
  const { incomeStatements, balanceSheets } = financials;

  // Get most recent data
  const latestIncome = incomeStatements[0];
  const latestBalance = balanceSheets[0];

  const eps = latestIncome?.eps || 0;
  const bookValuePerShare = latestBalance?.bookValuePerShare || 0;

  // Calculate Graham Number
  const grahamNumber = calculateGrahamNumber(eps, bookValuePerShare);

  // Estimate growth rate from historical EPS
  let growthRate: number | null = null;
  if (incomeStatements.length >= 3) {
    const years = Math.min(incomeStatements.length - 1, 5);
    const oldestEps = incomeStatements[years]?.eps;
    const newestEps = latestIncome?.eps;

    if (oldestEps && oldestEps > 0 && newestEps && newestEps > 0) {
      growthRate = calculateCAGR(oldestEps, newestEps, years);
    }
  }

  // Calculate Graham Growth Value
  const grahamGrowthValue = growthRate !== null && growthRate > 0
    ? calculateGrahamGrowthValue(eps, growthRate, bondYield)
    : null;

  // Check defensive criteria
  const defensiveCriteria = evaluateDefensiveCriteria(financials, quote);
  const passesDefensiveCriteria = defensiveCriteria.every((c) => c.passed);

  return {
    grahamNumber,
    grahamGrowthValue,
    eps,
    bookValuePerShare,
    growthRate,
    bondYield,
    passesDefensiveCriteria,
    defensiveCriteria,
  };
}

/**
 * Evaluate Graham's Defensive Investor Criteria
 *
 * From "The Intelligent Investor" Chapter 14:
 * 1. Adequate size (market cap > $500M in today's terms)
 * 2. Strong financial condition (current ratio > 2)
 * 3. Earnings stability (positive earnings for 10 years)
 * 4. Dividend record (uninterrupted dividends for 20 years)
 * 5. Earnings growth (at least 33% over 10 years, ~3% annual)
 * 6. Moderate P/E ratio (< 15)
 * 7. Moderate P/B ratio (< 1.5, or P/E × P/B < 22.5)
 */
function evaluateDefensiveCriteria(
  financials: Financials,
  quote: StockQuote
): { criterion: string; passed: boolean; detail: string }[] {
  const criteria: { criterion: string; passed: boolean; detail: string }[] = [];

  // 1. Adequate Size
  const minMarketCap = 500_000_000; // $500M
  criteria.push({
    criterion: 'Adequate Size',
    passed: quote.marketCap >= minMarketCap,
    detail: `Market cap: $${(quote.marketCap / 1e9).toFixed(2)}B (minimum: $500M)`,
  });

  // 2. Strong Financial Condition
  const balance = financials.balanceSheets[0];
  const currentRatio = balance
    ? balance.currentAssets / (balance.currentLiabilities || 1)
    : 0;
  criteria.push({
    criterion: 'Strong Financial Condition',
    passed: currentRatio >= 2.0,
    detail: `Current ratio: ${currentRatio.toFixed(2)} (minimum: 2.0)`,
  });

  // 3. Earnings Stability
  const positiveEarningsYears = financials.incomeStatements.filter(
    (stmt) => stmt.netIncome > 0
  ).length;
  criteria.push({
    criterion: 'Earnings Stability',
    passed: positiveEarningsYears >= Math.min(financials.incomeStatements.length, 5),
    detail: `Positive earnings: ${positiveEarningsYears} of ${financials.incomeStatements.length} years`,
  });

  // 4. Dividend Record (simplified - check if currently pays dividend)
  const paysDividend = quote.dividendYield !== null && quote.dividendYield > 0;
  criteria.push({
    criterion: 'Dividend Record',
    passed: paysDividend,
    detail: paysDividend
      ? `Dividend yield: ${(quote.dividendYield! * 100).toFixed(2)}%`
      : 'No dividend',
  });

  // 5. Earnings Growth
  let epsGrowth = 0;
  if (financials.incomeStatements.length >= 3) {
    const years = Math.min(financials.incomeStatements.length - 1, 5);
    const oldestEps = financials.incomeStatements[years]?.eps || 0;
    const newestEps = financials.incomeStatements[0]?.eps || 0;

    if (oldestEps > 0 && newestEps > 0) {
      epsGrowth = ((newestEps - oldestEps) / oldestEps);
    }
  }
  criteria.push({
    criterion: 'Earnings Growth',
    passed: epsGrowth >= 0.33,
    detail: `EPS growth (${financials.incomeStatements.length}yr): ${(epsGrowth * 100).toFixed(1)}% (target: 33%)`,
  });

  // 6. Moderate P/E
  const pe = quote.pe || 0;
  criteria.push({
    criterion: 'Moderate P/E Ratio',
    passed: pe > 0 && pe <= 15,
    detail: `P/E: ${pe.toFixed(2)} (maximum: 15)`,
  });

  // 7. Moderate P/B or P/E × P/B < 22.5
  const pb = quote.pb || 0;
  const pePbProduct = pe * pb;
  const passesPB = (pb > 0 && pb <= 1.5) || (pePbProduct > 0 && pePbProduct <= 22.5);
  criteria.push({
    criterion: 'Moderate Price to Assets',
    passed: passesPB,
    detail: `P/B: ${pb.toFixed(2)}, P/E × P/B: ${pePbProduct.toFixed(2)} (max P/B: 1.5 or product: 22.5)`,
  });

  return criteria;
}

/**
 * Calculate "Owner Earnings" as defined by Warren Buffett
 *
 * Owner Earnings = Net Income + Depreciation - Maintenance CapEx
 *
 * This represents the cash that owners can extract from the business
 * without impairing its competitive position.
 *
 * @param financials - Financial statement data
 */
export function calculateOwnerEarnings(financials: Financials): number {
  const income = financials.incomeStatements[0];
  const cashFlow = financials.cashFlowStatements[0];

  if (!income || !cashFlow) {
    return 0;
  }

  const netIncome = income.netIncome;
  const depreciation = cashFlow.depreciation;

  // Estimate maintenance CapEx as 70% of total CapEx
  // (growth CapEx is the other 30%)
  const maintenanceCapEx = cashFlow.capitalExpenditure * 0.7;

  return netIncome + depreciation - maintenanceCapEx;
}
