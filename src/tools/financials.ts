/**
 * Financials Tool
 *
 * Fetches financial statement data (income, balance sheet, cash flow).
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getProvider } from '../providers/index.js';
import { validateInput, GetFinancialsInputSchema } from '../utils/validators.js';
import { formatLargeNumber, formatPercent, generateMarkdownTable } from '../utils/formatters.js';
import { financialsCache, createCacheKey } from '../utils/cache.js';
import { createLogger } from '../utils/logger.js';
import { calculateFinancialRatios } from '../analysis/ratios.js';
import type { Financials } from '../providers/types.js';

const logger = createLogger('financials');

/**
 * Tool definition for MCP
 */
export const getFinancialsDefinition: Tool = {
  name: 'get_financials',
  description:
    'Get financial statement data including income statement, balance sheet, and cash flow statement. ' +
    'Also calculates key financial ratios for value investing analysis.',
  inputSchema: {
    type: 'object',
    properties: {
      ticker: {
        type: 'string',
        description: 'Stock ticker symbol (e.g., AAPL, MSFT)',
      },
      years: {
        type: 'number',
        description: 'Number of years of data to fetch (default: 5, max: 10)',
        default: 5,
      },
    },
    required: ['ticker'],
  },
};

/**
 * Format financials data for output
 */
function formatFinancialsOutput(financials: Financials): string {
  const { incomeStatements, balanceSheets, cashFlowStatements, ticker, currency } = financials;

  // Calculate ratios
  const ratios = calculateFinancialRatios(financials);

  // Build income statement table
  const incomeHeaders = ['Year', 'Revenue', 'Gross Profit', 'Op. Income', 'Net Income', 'EPS'];
  const incomeRows = incomeStatements.map((stmt) => [
    stmt.fiscalYear,
    formatLargeNumber(stmt.revenue),
    formatLargeNumber(stmt.grossProfit),
    formatLargeNumber(stmt.operatingIncome),
    formatLargeNumber(stmt.netIncome),
    stmt.eps.toFixed(2),
  ]);

  // Build balance sheet table
  const balanceHeaders = ['Year', 'Assets', 'Liabilities', 'Equity', 'Cash', 'Debt'];
  const balanceRows = balanceSheets.map((stmt) => [
    stmt.fiscalYear,
    formatLargeNumber(stmt.totalAssets),
    formatLargeNumber(stmt.totalLiabilities),
    formatLargeNumber(stmt.totalEquity),
    formatLargeNumber(stmt.cash),
    formatLargeNumber(stmt.totalDebt),
  ]);

  // Build cash flow table
  const cfHeaders = ['Year', 'Op. CF', 'Inv. CF', 'Fin. CF', 'FCF', 'CapEx'];
  const cfRows = cashFlowStatements.map((stmt) => [
    stmt.fiscalYear,
    formatLargeNumber(stmt.operatingCashFlow),
    formatLargeNumber(stmt.investingCashFlow),
    formatLargeNumber(stmt.financingCashFlow),
    formatLargeNumber(stmt.freeCashFlow),
    formatLargeNumber(stmt.capitalExpenditure),
  ]);

  const output = `
# Financial Statements: ${ticker}

## Income Statement (${currency})
${generateMarkdownTable(incomeHeaders, incomeRows)}

## Balance Sheet (${currency})
${generateMarkdownTable(balanceHeaders, balanceRows)}

## Cash Flow Statement (${currency})
${generateMarkdownTable(cfHeaders, cfRows)}

## Key Financial Ratios

### Profitability
- **Gross Margin:** ${formatPercent(ratios.grossMargin)}
- **Operating Margin:** ${formatPercent(ratios.operatingMargin)}
- **Net Margin:** ${formatPercent(ratios.netMargin)}
- **ROE:** ${formatPercent(ratios.roe)}
- **ROA:** ${formatPercent(ratios.roa)}
${ratios.roic ? `- **ROIC:** ${formatPercent(ratios.roic)}` : ''}

### Liquidity & Solvency
- **Current Ratio:** ${ratios.currentRatio.toFixed(2)}
- **Quick Ratio:** ${ratios.quickRatio.toFixed(2)}
- **Debt to Equity:** ${ratios.debtToEquity.toFixed(2)}
- **Debt to Assets:** ${formatPercent(ratios.debtToAssets)}
${ratios.interestCoverage ? `- **Interest Coverage:** ${ratios.interestCoverage.toFixed(1)}x` : ''}

### Cash Flow Quality
${ratios.fcfYield ? `- **FCF Yield:** ${formatPercent(ratios.fcfYield)}` : ''}
${ratios.cashConversion ? `- **Cash Conversion:** ${formatPercent(ratios.cashConversion)}` : ''}

### Growth (5-Year CAGR)
${ratios.revenueGrowth5Y !== null ? `- **Revenue Growth:** ${formatPercent(ratios.revenueGrowth5Y)}` : ''}
${ratios.epsGrowth5Y !== null ? `- **EPS Growth:** ${formatPercent(ratios.epsGrowth5Y)}` : ''}
${ratios.fcfGrowth5Y !== null ? `- **FCF Growth:** ${formatPercent(ratios.fcfGrowth5Y)}` : ''}

---
*Data source: ${getProvider().displayName}*
`;

  return output.trim();
}

/**
 * Get financials handler
 */
export async function getFinancials(
  args: Record<string, unknown>
): Promise<string> {
  // Validate input
  const input = validateInput(GetFinancialsInputSchema, args);
  const { ticker, years } = input;

  logger.info(`Getting financials for: ${ticker} (${years} years)`);

  // Check cache first
  const cacheKey = createCacheKey('financials', ticker, years);
  const cached = financialsCache.get(cacheKey);

  if (cached) {
    logger.debug(`Cache hit for ${ticker}`);
    return formatFinancialsOutput(cached as Financials);
  }

  // Fetch from provider
  const provider = getProvider();
  const financials = await provider.getFinancials(ticker, years);

  // Cache the result
  financialsCache.set(cacheKey, financials);

  return formatFinancialsOutput(financials);
}
