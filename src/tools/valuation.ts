/**
 * Intrinsic Value Calculation Tool
 *
 * Calculates stock intrinsic value using DCF and Graham methods.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getProvider } from '../providers/index.js';
import { validateInput, CalculateIntrinsicValueInputSchema } from '../utils/validators.js';
import { formatCurrency, formatPercent, generateMarkdownTable } from '../utils/formatters.js';
import { financialsCache, quoteCache, createCacheKey } from '../utils/cache.js';
import { createLogger } from '../utils/logger.js';
import { loadConfig } from '../config/index.js';
import { calculateDCF, dcfSensitivity } from '../analysis/dcf.js';
import { calculateGrahamValuation } from '../analysis/graham.js';
import {
  calculateMarginOfSafety,
  calculateCombinedMarginOfSafety,
  formatMarginOfSafety,
  calculateTargetPrice,
} from '../analysis/margin-of-safety.js';
import type { Financials, StockQuote } from '../providers/types.js';
import type { IntrinsicValueResult } from '../types/index.js';

const logger = createLogger('valuation');

/**
 * Tool definition for MCP
 */
export const calculateIntrinsicValueDefinition: Tool = {
  name: 'calculate_intrinsic_value',
  description:
    'Calculate stock intrinsic value using DCF (Discounted Cash Flow) model and Graham formulas. ' +
    'Returns valuation with margin of safety analysis based on value investing principles.',
  inputSchema: {
    type: 'object',
    properties: {
      ticker: {
        type: 'string',
        description: 'Stock ticker symbol (e.g., AAPL, MSFT)',
      },
      discountRate: {
        type: 'number',
        description: 'Discount rate for DCF (default: 10%, range: 1-30%)',
        default: 0.10,
      },
      terminalGrowthRate: {
        type: 'number',
        description: 'Terminal growth rate (default: 3%, max: 10%)',
        default: 0.03,
      },
      projectionYears: {
        type: 'number',
        description: 'Years to project in DCF model (default: 10, range: 5-20)',
        default: 10,
      },
      customGrowthRate: {
        type: 'number',
        description: 'Override estimated growth rate (optional, -50% to 50%)',
      },
    },
    required: ['ticker'],
  },
};

/**
 * Format intrinsic value result for output
 */
function formatValuationOutput(
  ticker: string,
  quote: StockQuote,
  result: IntrinsicValueResult
): string {
  const currency = quote.currency;

  // Format sensitivity table
  const sensitivityData = dcfSensitivity(
    { incomeStatements: [], balanceSheets: [], cashFlowStatements: [], ticker, currency, lastUpdated: new Date() } as Financials,
    quote,
    {
      discountRate: result.dcfAssumptions.discountRate,
      terminalGrowthRate: result.dcfAssumptions.terminalGrowthRate,
      projectionYears: result.dcfAssumptions.projectionYears,
      customGrowthRate: result.dcfAssumptions.estimatedGrowthRate,
    }
  );

  // Determine status emoji
  let statusEmoji = '🟡';
  if (result.valuationSummary.status === 'undervalued') {
    statusEmoji = '🟢';
  } else if (result.valuationSummary.status === 'overvalued') {
    statusEmoji = '🔴';
  }

  const output = `
# Intrinsic Value Analysis: ${ticker}

## Current Market Data
- **Current Price:** ${formatCurrency(result.currentPrice, currency)}
- **Market Cap:** ${formatCurrency(quote.marketCap, currency)}

---

## Valuation Summary
${statusEmoji} **Status:** ${result.valuationSummary.status.toUpperCase()}
- **Average Intrinsic Value:** ${formatCurrency(result.valuationSummary.averageIntrinsicValue, currency)}
- **Current Price:** ${formatCurrency(result.currentPrice, currency)}
- **Upside/Downside:** ${formatPercent((result.valuationSummary.averageIntrinsicValue - result.currentPrice) / result.currentPrice, 1, true)}

### Recommendation
${result.valuationSummary.recommendation}

---

## DCF Valuation
- **DCF Intrinsic Value:** ${formatCurrency(result.dcfValue, currency)}
- **Margin of Safety vs DCF:** ${formatMarginOfSafety(result.marginOfSafety.vsDcf)}

### DCF Assumptions
- Discount Rate: ${formatPercent(result.dcfAssumptions.discountRate)}
- Terminal Growth Rate: ${formatPercent(result.dcfAssumptions.terminalGrowthRate)}
- Projection Period: ${result.dcfAssumptions.projectionYears} years
- Estimated Growth Rate: ${formatPercent(result.dcfAssumptions.estimatedGrowthRate)}
- Starting Free Cash Flow: ${formatCurrency(result.dcfAssumptions.projectedFcf[0] || 0, currency)}
- Terminal Value: ${formatCurrency(result.dcfAssumptions.terminalValue, currency)}

---

## Graham Valuation
- **Graham Number:** ${formatCurrency(result.grahamNumber, currency)}
${result.grahamValue !== null ? `- **Graham Growth Value:** ${formatCurrency(result.grahamValue, currency)}` : '- **Graham Growth Value:** N/A (requires positive growth)'}
- **Margin of Safety vs Graham:** ${formatMarginOfSafety(result.marginOfSafety.vsGraham)}

### Graham Assumptions
- EPS (TTM): ${formatCurrency(result.grahamAssumptions.eps, currency)}
- Book Value/Share: ${formatCurrency(result.grahamAssumptions.bookValuePerShare, currency)}
${result.grahamAssumptions.growthRate !== null ? `- Historical Growth Rate: ${formatPercent(result.grahamAssumptions.growthRate)}` : ''}
- Bond Yield (for Graham formula): ${formatPercent(result.grahamAssumptions.bondYield)}

---

## Margin of Safety Analysis

| Valuation Method | Intrinsic Value | Margin of Safety | Status |
| --- | --- | --- | --- |
| DCF | ${formatCurrency(result.dcfValue, currency)} | ${formatPercent(result.marginOfSafety.vsDcf, 1)} | ${result.marginOfSafety.vsDcf >= 0.25 ? '✅' : '⚠️'} |
| Graham Number | ${formatCurrency(result.grahamNumber, currency)} | ${formatPercent(result.marginOfSafety.vsGraham, 1)} | ${result.marginOfSafety.vsGraham >= 0.25 ? '✅' : '⚠️'} |

### Target Buy Prices (for 25% margin of safety)
- Based on DCF: ${formatCurrency(calculateTargetPrice(result.dcfValue, 0.25), currency)}
- Based on Graham: ${formatCurrency(calculateTargetPrice(result.grahamNumber, 0.25), currency)}

---

## Key Principles Applied

**Warren Buffett's Criteria:**
> "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price."

**Benjamin Graham's Margin of Safety:**
> "The margin of safety is always dependent on the price paid. It will be large at one price, small at some higher price, nonexistent at some still higher price."

---

*Calculated at: ${result.calculatedAt.toLocaleString()}*
*Data source: ${getProvider().displayName}*

⚠️ **Disclaimer:** This analysis is for educational purposes only and does not constitute investment advice.
`;

  return output.trim();
}

/**
 * Calculate intrinsic value handler
 */
export async function calculateIntrinsicValue(
  args: Record<string, unknown>
): Promise<string> {
  // Validate input
  const input = validateInput(CalculateIntrinsicValueInputSchema, args);
  const { ticker, discountRate, terminalGrowthRate, projectionYears, customGrowthRate } = input;

  logger.info(`Calculating intrinsic value for: ${ticker}`);

  const provider = getProvider();
  const config = loadConfig();

  // Fetch data (use cache if available)
  const quoteCacheKey = createCacheKey('quote', ticker);
  const financialsCacheKey = createCacheKey('financials', ticker, 5);

  let quote = quoteCache.get(quoteCacheKey) as StockQuote | undefined;
  let financials = financialsCache.get(financialsCacheKey) as Financials | undefined;

  // Fetch in parallel if not cached
  if (!quote || !financials) {
    const [fetchedQuote, fetchedFinancials] = await Promise.all([
      quote ? Promise.resolve(quote) : provider.getQuote(ticker),
      financials ? Promise.resolve(financials) : provider.getFinancials(ticker, 5),
    ]);

    quote = fetchedQuote;
    financials = fetchedFinancials;

    // Cache the results
    quoteCache.set(quoteCacheKey, quote);
    financialsCache.set(financialsCacheKey, financials);
  }

  // Calculate DCF value
  const dcfResult = calculateDCF(financials, quote, {
    discountRate,
    terminalGrowthRate,
    projectionYears,
    customGrowthRate,
  });

  // Calculate Graham valuation
  const grahamResult = calculateGrahamValuation(
    financials,
    quote,
    config.analysis.riskFreeRate
  );

  // Calculate margins of safety
  const dcfMargin = calculateMarginOfSafety(quote.price, dcfResult.intrinsicValue);
  const grahamMargin = calculateMarginOfSafety(quote.price, grahamResult.grahamNumber);

  // Combine valuations
  const combined = calculateCombinedMarginOfSafety(quote.price, {
    dcf: dcfResult.intrinsicValue,
    grahamNumber: grahamResult.grahamNumber,
    grahamGrowth: grahamResult.grahamGrowthValue,
  });

  // Build result
  const result: IntrinsicValueResult = {
    ticker,
    currentPrice: quote.price,
    currency: quote.currency,

    dcfValue: dcfResult.intrinsicValue,
    dcfAssumptions: {
      discountRate,
      terminalGrowthRate: dcfResult.assumptions.terminalGrowthRate,
      projectionYears,
      estimatedGrowthRate: dcfResult.assumptions.estimatedGrowthRate,
      projectedFcf: dcfResult.projectedFcf,
      terminalValue: dcfResult.terminalValue,
    },

    grahamNumber: grahamResult.grahamNumber,
    grahamValue: grahamResult.grahamGrowthValue,
    grahamAssumptions: {
      eps: grahamResult.eps,
      bookValuePerShare: grahamResult.bookValuePerShare,
      growthRate: grahamResult.growthRate,
      bondYield: grahamResult.bondYield,
    },

    marginOfSafety: {
      vsDcf: dcfMargin.marginOfSafety,
      vsGraham: grahamMargin.marginOfSafety,
    },

    valuationSummary: {
      averageIntrinsicValue: combined.averageIntrinsicValue,
      status: combined.status,
      recommendation: combined.recommendation,
    },

    calculatedAt: new Date(),
  };

  return formatValuationOutput(ticker, quote, result);
}
