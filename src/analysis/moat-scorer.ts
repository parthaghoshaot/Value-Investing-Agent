/**
 * Economic Moat Analysis
 *
 * Evaluates a company's competitive advantages (economic moat)
 * based on Warren Buffett's investment philosophy.
 *
 * Five types of economic moats:
 * 1. Brand Power (Intangible Assets)
 * 2. Cost Advantage
 * 3. Network Effect
 * 4. Switching Costs
 * 5. Economies of Scale
 */

import type { Financials, StockQuote, CompanyProfile } from '../providers/types.js';
import type { MoatAnalysis } from '../types/index.js';
import { calculateFinancialRatios, calculateCAGR } from './ratios.js';

/**
 * Analyze economic moat
 *
 * @param financials - Financial statement data
 * @param quote - Current quote data
 * @param profile - Company profile
 * @returns Moat analysis result
 */
export function analyzeMoat(
  financials: Financials,
  quote: StockQuote,
  profile: CompanyProfile
): MoatAnalysis {
  const ratios = calculateFinancialRatios(financials, quote);

  // Analyze each moat dimension
  const brandPower = analyzeBrandPower(financials, ratios);
  const costAdvantage = analyzeCostAdvantage(financials, ratios);
  const networkEffect = analyzeNetworkEffect(financials, ratios);
  const switchingCosts = analyzeSwitchingCosts(financials, ratios);
  const scaleEconomies = analyzeScaleEconomies(financials, quote, profile, ratios);

  // Calculate overall score (weighted average)
  const dimensionScores = [
    brandPower.score,
    costAdvantage.score,
    networkEffect.score,
    switchingCosts.score,
    scaleEconomies.score,
  ];

  // Overall score is max of individual scores (moat is strongest advantage)
  const overallScore = Math.max(...dimensionScores);

  // Determine moat rating
  let moatRating: 'none' | 'narrow' | 'wide';
  if (overallScore >= 4) {
    moatRating = 'wide';
  } else if (overallScore >= 2.5) {
    moatRating = 'narrow';
  } else {
    moatRating = 'none';
  }

  // Analyze durability
  const durability = analyzeDurability(financials, ratios, overallScore);

  return {
    ticker: quote.ticker,
    companyName: quote.name,
    overallScore,
    moatRating,
    dimensions: {
      brandPower,
      costAdvantage,
      networkEffect,
      switchingCosts,
      scaleEconomies,
    },
    durability,
    analyzedAt: new Date(),
  };
}

/**
 * Analyze brand power (intangible assets)
 *
 * Indicators:
 * - High gross margins (pricing power)
 * - Stable/growing margins over time
 * - Premium valuation relative to peers
 */
function analyzeBrandPower(
  financials: Financials,
  ratios: ReturnType<typeof calculateFinancialRatios>
) {
  const evidence: string[] = [];
  let score = 1; // Base score

  // Gross margin analysis
  const grossMargin = ratios.grossMargin;

  if (grossMargin >= 0.60) {
    score += 2;
    evidence.push(`Exceptional gross margin (${(grossMargin * 100).toFixed(1)}%) indicates strong pricing power`);
  } else if (grossMargin >= 0.40) {
    score += 1.5;
    evidence.push(`Strong gross margin (${(grossMargin * 100).toFixed(1)}%) suggests brand value`);
  } else if (grossMargin >= 0.25) {
    score += 0.5;
    evidence.push(`Moderate gross margin (${(grossMargin * 100).toFixed(1)}%)`);
  } else {
    evidence.push(`Low gross margin (${(grossMargin * 100).toFixed(1)}%) suggests commodity-like products`);
  }

  // Margin stability
  const grossMargins = financials.incomeStatements.map(
    (stmt) => stmt.revenue > 0 ? stmt.grossProfit / stmt.revenue : 0
  );

  const marginStability = calculateStability(grossMargins);

  if (marginStability >= 0.9) {
    score += 1;
    evidence.push('Very stable gross margins over time');
  } else if (marginStability >= 0.7) {
    score += 0.5;
    evidence.push('Reasonably stable gross margins');
  } else {
    evidence.push('Volatile gross margins suggest weak pricing power');
  }

  return {
    score: Math.min(5, score),
    evidence,
    metrics: {
      grossMargin,
      grossMarginStability: marginStability,
    },
  };
}

/**
 * Analyze cost advantage
 *
 * Indicators:
 * - Lower operating costs than competitors
 * - Improving operating margins
 * - Process/technology advantages
 */
function analyzeCostAdvantage(
  financials: Financials,
  ratios: ReturnType<typeof calculateFinancialRatios>
) {
  const evidence: string[] = [];
  let score = 1;

  // Operating margin analysis
  const opMargin = ratios.operatingMargin;

  if (opMargin >= 0.30) {
    score += 2;
    evidence.push(`Exceptional operating margin (${(opMargin * 100).toFixed(1)}%)`);
  } else if (opMargin >= 0.20) {
    score += 1.5;
    evidence.push(`Strong operating margin (${(opMargin * 100).toFixed(1)}%)`);
  } else if (opMargin >= 0.10) {
    score += 0.5;
    evidence.push(`Adequate operating margin (${(opMargin * 100).toFixed(1)}%)`);
  } else {
    evidence.push(`Low operating margin (${(opMargin * 100).toFixed(1)}%) indicates no cost advantage`);
  }

  // Operating margin trend
  const opMargins = financials.incomeStatements.map(
    (stmt) => stmt.revenue > 0 ? stmt.operatingIncome / stmt.revenue : 0
  );

  if (opMargins.length >= 3) {
    const trend = (opMargins[0] - opMargins[opMargins.length - 1]) / Math.abs(opMargins[opMargins.length - 1] || 1);

    if (trend > 0.1) {
      score += 1;
      evidence.push('Operating margins improving over time');
    } else if (trend > 0) {
      score += 0.5;
      evidence.push('Operating margins stable to slightly improving');
    } else if (trend < -0.1) {
      score -= 0.5;
      evidence.push('Operating margins declining - cost advantage may be eroding');
    }
  }

  return {
    score: Math.min(5, Math.max(1, score)),
    evidence,
    metrics: {
      operatingMargin: opMargin,
      operatingMarginVsIndustry: null, // Would need industry data
    },
  };
}

/**
 * Analyze network effect
 *
 * Indicators:
 * - Revenue growth accelerating with scale
 * - High user engagement metrics
 * - Platform/marketplace characteristics
 */
function analyzeNetworkEffect(
  financials: Financials,
  ratios: ReturnType<typeof calculateFinancialRatios>
) {
  const evidence: string[] = [];
  let score = 1;

  // Revenue growth analysis
  const revenueGrowth = ratios.revenueGrowth5Y;

  if (revenueGrowth !== null) {
    if (revenueGrowth >= 0.20) {
      score += 2;
      evidence.push(`Strong revenue growth (${(revenueGrowth * 100).toFixed(1)}% CAGR) may indicate network effects`);
    } else if (revenueGrowth >= 0.10) {
      score += 1;
      evidence.push(`Good revenue growth (${(revenueGrowth * 100).toFixed(1)}% CAGR)`);
    } else if (revenueGrowth >= 0.05) {
      score += 0.5;
      evidence.push(`Moderate revenue growth (${(revenueGrowth * 100).toFixed(1)}% CAGR)`);
    } else {
      evidence.push(`Slow revenue growth (${(revenueGrowth * 100).toFixed(1)}% CAGR) - limited network effects`);
    }
  }

  // Check if margins improve with scale (network effect indicator)
  const revenues = financials.incomeStatements.map((stmt) => stmt.revenue);
  const netMargins = financials.incomeStatements.map(
    (stmt) => stmt.revenue > 0 ? stmt.netIncome / stmt.revenue : 0
  );

  if (revenues.length >= 3) {
    const revenueGrew = revenues[0] > revenues[revenues.length - 1];
    const marginsImproved = netMargins[0] > netMargins[netMargins.length - 1];

    if (revenueGrew && marginsImproved) {
      score += 1;
      evidence.push('Margins improving with scale - possible network effect');
    }
  }

  return {
    score: Math.min(5, score),
    evidence,
    metrics: {
      revenueGrowth: revenueGrowth || 0,
      userGrowth: null, // Would need specific user metrics
    },
  };
}

/**
 * Analyze switching costs
 *
 * Indicators:
 * - Revenue stability
 * - High customer retention (recurring revenue)
 * - Long customer relationships
 */
function analyzeSwitchingCosts(
  financials: Financials,
  ratios: ReturnType<typeof calculateFinancialRatios>
) {
  const evidence: string[] = [];
  let score = 1;

  // Revenue stability
  const revenues = financials.incomeStatements.map((stmt) => stmt.revenue);
  const revenueStability = calculateStability(revenues);

  if (revenueStability >= 0.95) {
    score += 2;
    evidence.push('Very stable revenue base suggests high customer retention');
  } else if (revenueStability >= 0.85) {
    score += 1;
    evidence.push('Stable revenue indicates moderate switching costs');
  } else if (revenueStability >= 0.70) {
    score += 0.5;
    evidence.push('Moderately stable revenue');
  } else {
    evidence.push('Volatile revenue suggests low switching costs');
  }

  // Consistent positive growth indicates sticky customers
  const allPositiveGrowth = revenues.slice(0, -1).every((rev, i) => rev >= revenues[i + 1]);

  if (allPositiveGrowth && revenues.length >= 3) {
    score += 1;
    evidence.push('Consistent revenue growth indicates customer stickiness');
  }

  // High margins often correlate with switching costs
  if (ratios.grossMargin >= 0.50) {
    score += 0.5;
    evidence.push('High margins may indicate customer lock-in');
  }

  return {
    score: Math.min(5, score),
    evidence,
    metrics: {
      revenueStability,
      customerRetention: null, // Would need specific retention data
    },
  };
}

/**
 * Analyze economies of scale
 *
 * Indicators:
 * - Large market cap
 * - High revenue per employee
 * - Market leadership position
 */
function analyzeScaleEconomies(
  financials: Financials,
  quote: StockQuote,
  profile: CompanyProfile,
  ratios: ReturnType<typeof calculateFinancialRatios>
) {
  const evidence: string[] = [];
  let score = 1;

  // Market cap as size indicator
  const marketCap = quote.marketCap;

  if (marketCap >= 200e9) {
    score += 2;
    evidence.push('Mega-cap company with significant scale advantages');
  } else if (marketCap >= 50e9) {
    score += 1.5;
    evidence.push('Large-cap company with scale benefits');
  } else if (marketCap >= 10e9) {
    score += 0.5;
    evidence.push('Mid-cap company with some scale advantages');
  } else {
    evidence.push('Smaller company - limited scale advantages');
  }

  // Revenue per employee (efficiency indicator)
  const latestRevenue = financials.incomeStatements[0]?.revenue || 0;
  const employees = profile.employees;
  let revenuePerEmployee: number | null = null;

  if (employees && employees > 0) {
    revenuePerEmployee = latestRevenue / employees;

    if (revenuePerEmployee >= 1_000_000) {
      score += 1.5;
      evidence.push(`High revenue per employee ($${(revenuePerEmployee / 1000).toFixed(0)}K) indicates efficiency`);
    } else if (revenuePerEmployee >= 500_000) {
      score += 0.5;
      evidence.push(`Good revenue per employee ($${(revenuePerEmployee / 1000).toFixed(0)}K)`);
    } else {
      evidence.push(`Lower revenue per employee ($${(revenuePerEmployee / 1000).toFixed(0)}K)`);
    }
  }

  return {
    score: Math.min(5, score),
    evidence,
    metrics: {
      marketCap,
      revenuePerEmployee,
    },
  };
}

/**
 * Analyze moat durability
 *
 * Factors:
 * - Consistency of financial metrics
 * - Trend of competitive advantages
 * - Industry dynamics
 */
function analyzeDurability(
  financials: Financials,
  ratios: ReturnType<typeof calculateFinancialRatios>,
  overallScore: number
): MoatAnalysis['durability'] {
  const factors: string[] = [];
  let durabilityScore = overallScore; // Start with moat score

  // ROE consistency
  const roeValues: number[] = [];
  for (let i = 0; i < financials.incomeStatements.length && i < financials.balanceSheets.length; i++) {
    const netIncome = financials.incomeStatements[i]?.netIncome || 0;
    const equity = financials.balanceSheets[i]?.totalEquity || 1;
    roeValues.push(netIncome / equity);
  }

  const roeStability = calculateStability(roeValues);
  const avgRoe = roeValues.reduce((a, b) => a + b, 0) / roeValues.length;

  if (avgRoe >= 0.15 && roeStability >= 0.8) {
    durabilityScore += 1;
    factors.push('Consistently high ROE indicates durable advantage');
  } else if (avgRoe >= 0.10 && roeStability >= 0.6) {
    factors.push('Moderately consistent ROE');
  } else {
    durabilityScore -= 0.5;
    factors.push('Inconsistent ROE raises durability concerns');
  }

  // Free cash flow consistency
  const fcfValues = financials.cashFlowStatements.map((stmt) => stmt.freeCashFlow);
  const positiveFcfYears = fcfValues.filter((fcf) => fcf > 0).length;

  if (positiveFcfYears === fcfValues.length && fcfValues.length >= 3) {
    durabilityScore += 0.5;
    factors.push('Consistently positive free cash flow');
  } else if (positiveFcfYears >= fcfValues.length * 0.8) {
    factors.push('Generally positive free cash flow');
  } else {
    durabilityScore -= 0.5;
    factors.push('Inconsistent free cash flow');
  }

  // Determine assessment
  let assessment: 'weak' | 'moderate' | 'strong';
  if (durabilityScore >= 4) {
    assessment = 'strong';
    factors.push('Moat appears sustainable long-term');
  } else if (durabilityScore >= 2.5) {
    assessment = 'moderate';
    factors.push('Moat durability is uncertain');
  } else {
    assessment = 'weak';
    factors.push('Competitive advantages may be temporary');
  }

  return {
    score: Math.max(1, Math.min(5, durabilityScore)),
    assessment,
    factors,
  };
}

/**
 * Calculate stability score (0 to 1)
 * Higher score = more stable/consistent values
 */
function calculateStability(values: number[]): number {
  if (values.length < 2) return 1;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (lower = more stable)
  const cv = stdDev / Math.abs(mean);

  // Convert to stability score (0-1)
  return Math.max(0, Math.min(1, 1 - cv));
}
