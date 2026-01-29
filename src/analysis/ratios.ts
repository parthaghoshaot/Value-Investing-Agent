/**
 * Financial Ratio Calculations
 *
 * Calculates key financial ratios used in value investing analysis.
 * Based on principles from Benjamin Graham and Warren Buffett.
 */

import type { Financials, StockQuote } from '../providers/types.js';
import type { FinancialRatios } from '../types/index.js';

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 *
 * @param startValue - Initial value
 * @param endValue - Final value
 * @param years - Number of years
 * @returns CAGR as decimal (0.10 = 10%)
 */
export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number | null {
  if (startValue <= 0 || endValue <= 0 || years <= 0) {
    return null;
  }

  // CAGR = (End/Start)^(1/n) - 1
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * Calculate all financial ratios from financial statements
 *
 * @param financials - Financial statement data
 * @param quote - Optional quote data for market-based ratios
 * @returns Calculated financial ratios
 */
export function calculateFinancialRatios(
  financials: Financials,
  quote?: StockQuote
): FinancialRatios {
  const { incomeStatements, balanceSheets, cashFlowStatements } = financials;

  // Use most recent year's data
  const income = incomeStatements[0];
  const balance = balanceSheets[0];
  const cashFlow = cashFlowStatements[0];

  // Safety checks
  if (!income || !balance || !cashFlow) {
    return getDefaultRatios();
  }

  // Profitability Ratios
  const grossMargin = income.revenue > 0 ? income.grossProfit / income.revenue : 0;
  const operatingMargin = income.revenue > 0 ? income.operatingIncome / income.revenue : 0;
  const netMargin = income.revenue > 0 ? income.netIncome / income.revenue : 0;

  const roe = balance.totalEquity > 0 ? income.netIncome / balance.totalEquity : 0;
  const roa = balance.totalAssets > 0 ? income.netIncome / balance.totalAssets : 0;

  // ROIC = NOPAT / Invested Capital
  // NOPAT = Operating Income * (1 - Tax Rate)
  // Estimated tax rate from net income / pretax income
  const estimatedTaxRate = income.netIncome > 0 && income.operatingIncome > 0
    ? 1 - (income.netIncome / income.operatingIncome)
    : 0.25;
  const nopat = income.operatingIncome * (1 - Math.max(0, Math.min(estimatedTaxRate, 0.5)));
  const investedCapital = balance.totalEquity + balance.totalDebt - balance.cash;
  const roic = investedCapital > 0 ? nopat / investedCapital : null;

  // Liquidity Ratios
  const currentRatio = balance.currentLiabilities > 0
    ? balance.currentAssets / balance.currentLiabilities
    : 0;

  // Quick Ratio = (Current Assets - Inventory) / Current Liabilities
  const inventory = balance.inventory || 0;
  const quickRatio = balance.currentLiabilities > 0
    ? (balance.currentAssets - inventory) / balance.currentLiabilities
    : 0;

  // Solvency Ratios
  const debtToEquity = balance.totalEquity > 0
    ? balance.totalDebt / balance.totalEquity
    : 0;
  const debtToAssets = balance.totalAssets > 0
    ? balance.totalDebt / balance.totalAssets
    : 0;

  // Interest Coverage = EBIT / Interest Expense
  const interestCoverage = income.interestExpense && income.interestExpense > 0
    ? income.operatingIncome / income.interestExpense
    : null;

  // Net Debt / EBITDA
  const netDebt = balance.totalDebt - balance.cash;
  const netDebtToEbitda = income.ebitda > 0 ? netDebt / income.ebitda : null;

  // Cash Flow Ratios
  const fcfYield = quote?.marketCap && quote.marketCap > 0
    ? cashFlow.freeCashFlow / quote.marketCap
    : null;

  const cashConversion = income.netIncome > 0
    ? cashFlow.freeCashFlow / income.netIncome
    : null;

  const capexToDepreciation = cashFlow.depreciation > 0
    ? cashFlow.capitalExpenditure / cashFlow.depreciation
    : null;

  // Growth Rates (5-year CAGR)
  const years = Math.min(incomeStatements.length - 1, 5);
  const revenueGrowth5Y = years > 0
    ? calculateCAGR(
        incomeStatements[years]?.revenue || 0,
        income.revenue,
        years
      )
    : null;

  const epsGrowth5Y = years > 0
    ? calculateCAGR(
        Math.max(incomeStatements[years]?.eps || 0, 0.01),
        Math.max(income.eps, 0.01),
        years
      )
    : null;

  const fcfYears = Math.min(cashFlowStatements.length - 1, 5);
  const fcfGrowth5Y = fcfYears > 0
    ? calculateCAGR(
        Math.max(cashFlowStatements[fcfYears]?.freeCashFlow || 0, 1),
        Math.max(cashFlow.freeCashFlow, 1),
        fcfYears
      )
    : null;

  // Valuation Ratios (require quote data)
  const pe = quote?.pe ?? null;
  const pb = quote?.pb ?? null;
  const ps = quote?.ps ?? null;

  // PEG = PE / Growth Rate
  const peg = pe && epsGrowth5Y && epsGrowth5Y > 0
    ? pe / (epsGrowth5Y * 100)
    : null;

  // EV/EBITDA
  const evToEbitda = quote?.marketCap && income.ebitda > 0
    ? (quote.marketCap + netDebt) / income.ebitda
    : null;

  // Price to FCF
  const priceToFcf = quote?.marketCap && cashFlow.freeCashFlow > 0
    ? quote.marketCap / cashFlow.freeCashFlow
    : null;

  return {
    // Valuation
    pe,
    pb,
    ps,
    peg,
    evToEbitda,
    priceToFcf,

    // Profitability
    grossMargin,
    operatingMargin,
    netMargin,
    roe,
    roa,
    roic,

    // Liquidity & Solvency
    currentRatio,
    quickRatio,
    debtToEquity,
    debtToAssets,
    interestCoverage,
    netDebtToEbitda,

    // Cash Flow
    fcfYield,
    cashConversion,
    capexToDepreciation,

    // Growth
    revenueGrowth5Y,
    epsGrowth5Y,
    fcfGrowth5Y,
    dividendGrowth5Y: null, // Would need dividend history
  };
}

/**
 * Get default/empty ratios
 */
function getDefaultRatios(): FinancialRatios {
  return {
    pe: null,
    pb: null,
    ps: null,
    peg: null,
    evToEbitda: null,
    priceToFcf: null,
    grossMargin: 0,
    operatingMargin: 0,
    netMargin: 0,
    roe: 0,
    roa: 0,
    roic: null,
    currentRatio: 0,
    quickRatio: 0,
    debtToEquity: 0,
    debtToAssets: 0,
    interestCoverage: null,
    netDebtToEbitda: null,
    fcfYield: null,
    cashConversion: null,
    capexToDepreciation: null,
    revenueGrowth5Y: null,
    epsGrowth5Y: null,
    fcfGrowth5Y: null,
    dividendGrowth5Y: null,
  };
}

/**
 * Evaluate profitability quality
 *
 * Based on value investing principles:
 * - ROE > 15% for 5 years indicates competitive advantage
 * - Gross margin > 40% suggests pricing power
 * - Stable margins over time indicate moat
 */
export function evaluateProfitability(ratios: FinancialRatios): {
  score: number;
  assessment: string;
  details: string[];
} {
  const details: string[] = [];
  let score = 0;

  // ROE assessment
  if (ratios.roe >= 0.20) {
    score += 2;
    details.push('Excellent ROE (>20%)');
  } else if (ratios.roe >= 0.15) {
    score += 1;
    details.push('Good ROE (15-20%)');
  } else if (ratios.roe >= 0.10) {
    details.push('Adequate ROE (10-15%)');
  } else {
    score -= 1;
    details.push('Low ROE (<10%)');
  }

  // Gross margin assessment
  if (ratios.grossMargin >= 0.40) {
    score += 2;
    details.push('Strong gross margin (>40%) - indicates pricing power');
  } else if (ratios.grossMargin >= 0.25) {
    score += 1;
    details.push('Moderate gross margin (25-40%)');
  } else {
    details.push('Low gross margin (<25%) - commodity-like business');
  }

  // Operating margin assessment
  if (ratios.operatingMargin >= 0.20) {
    score += 1;
    details.push('Excellent operating margin (>20%)');
  } else if (ratios.operatingMargin >= 0.10) {
    details.push('Good operating margin (10-20%)');
  } else {
    score -= 1;
    details.push('Low operating margin (<10%)');
  }

  // ROIC assessment
  if (ratios.roic !== null) {
    if (ratios.roic >= 0.15) {
      score += 1;
      details.push('High ROIC (>15%) - efficient capital allocation');
    } else if (ratios.roic >= 0.10) {
      details.push('Adequate ROIC (10-15%)');
    } else {
      details.push('Low ROIC (<10%) - poor capital efficiency');
    }
  }

  // Determine assessment
  let assessment: string;
  if (score >= 4) {
    assessment = 'Excellent profitability - strong competitive advantage';
  } else if (score >= 2) {
    assessment = 'Good profitability';
  } else if (score >= 0) {
    assessment = 'Average profitability';
  } else {
    assessment = 'Weak profitability - no clear competitive advantage';
  }

  return { score, assessment, details };
}

/**
 * Evaluate financial safety
 *
 * Based on Graham's defensive investor criteria:
 * - Current ratio > 2
 * - Long-term debt < net current assets
 * - Conservative debt levels
 */
export function evaluateSafety(ratios: FinancialRatios): {
  score: number;
  assessment: string;
  details: string[];
} {
  const details: string[] = [];
  let score = 0;

  // Current ratio
  if (ratios.currentRatio >= 2.0) {
    score += 2;
    details.push('Strong current ratio (>2.0) - excellent liquidity');
  } else if (ratios.currentRatio >= 1.5) {
    score += 1;
    details.push('Good current ratio (1.5-2.0)');
  } else if (ratios.currentRatio >= 1.0) {
    details.push('Adequate current ratio (1.0-1.5)');
  } else {
    score -= 2;
    details.push('Weak current ratio (<1.0) - liquidity risk');
  }

  // Debt to equity
  if (ratios.debtToEquity < 0.5) {
    score += 2;
    details.push('Low debt to equity (<0.5) - conservative capital structure');
  } else if (ratios.debtToEquity < 1.0) {
    score += 1;
    details.push('Moderate debt to equity (0.5-1.0)');
  } else if (ratios.debtToEquity < 2.0) {
    details.push('High debt to equity (1.0-2.0)');
  } else {
    score -= 2;
    details.push('Very high debt to equity (>2.0) - financial risk');
  }

  // Interest coverage
  if (ratios.interestCoverage !== null) {
    if (ratios.interestCoverage >= 10) {
      score += 1;
      details.push('Excellent interest coverage (>10x)');
    } else if (ratios.interestCoverage >= 5) {
      details.push('Good interest coverage (5-10x)');
    } else if (ratios.interestCoverage >= 2) {
      score -= 1;
      details.push('Low interest coverage (2-5x)');
    } else {
      score -= 2;
      details.push('Critical interest coverage (<2x)');
    }
  }

  // Debt to assets
  if (ratios.debtToAssets < 0.30) {
    score += 1;
    details.push('Low debt to assets (<30%)');
  } else if (ratios.debtToAssets > 0.50) {
    score -= 1;
    details.push('High debt to assets (>50%)');
  }

  // Determine assessment
  let assessment: string;
  if (score >= 4) {
    assessment = 'Excellent financial safety - fortress balance sheet';
  } else if (score >= 2) {
    assessment = 'Good financial safety';
  } else if (score >= 0) {
    assessment = 'Adequate financial safety';
  } else {
    assessment = 'Concerning financial safety - high risk';
  }

  return { score, assessment, details };
}
