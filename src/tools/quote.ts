/**
 * Stock Quote Tool
 *
 * Fetches real-time stock quotes and basic valuation metrics.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getProvider } from '../providers/index.js';
import { validateInput, GetStockQuoteInputSchema } from '../utils/validators.js';
import {
  formatCurrency,
  formatMarketCap,
  formatPercent,
  formatRatio,
  formatDateTime,
} from '../utils/formatters.js';
import { quoteCache, createCacheKey } from '../utils/cache.js';
import { createLogger } from '../utils/logger.js';
import type { StockQuote } from '../providers/types.js';

const logger = createLogger('quote');

/**
 * Tool definition for MCP
 */
export const getStockQuoteDefinition: Tool = {
  name: 'get_stock_quote',
  description:
    'Get real-time stock quote with price, valuation metrics (PE, PB, PS), and 52-week range. ' +
    'Supports ticker symbols (AAPL, MSFT) or company names (Apple, Microsoft).',
  inputSchema: {
    type: 'object',
    properties: {
      ticker: {
        type: 'string',
        description:
          'Stock ticker symbol (e.g., AAPL, MSFT, GOOGL) or company name (e.g., Apple, Microsoft, Google)',
      },
    },
    required: ['ticker'],
  },
};

/**
 * Format quote data for output
 */
function formatQuoteOutput(quote: StockQuote): string {
  const priceChangeEmoji = quote.change >= 0 ? '🟢' : '🔴';
  const priceChangeSign = quote.change >= 0 ? '+' : '';

  // Calculate distance from 52-week high/low
  const distanceFromHigh = ((quote.week52High - quote.price) / quote.week52High) * 100;
  const distanceFromLow = ((quote.price - quote.week52Low) / quote.week52Low) * 100;

  const output = `
# ${quote.name} (${quote.ticker})

## Price Information
- **Current Price:** ${formatCurrency(quote.price, quote.currency)}
- **Change:** ${priceChangeEmoji} ${priceChangeSign}${formatCurrency(quote.change, quote.currency)} (${formatPercent(quote.changePercent / 100, 2, true)})
- **Open:** ${formatCurrency(quote.open, quote.currency)}
- **High:** ${formatCurrency(quote.high, quote.currency)}
- **Low:** ${formatCurrency(quote.low, quote.currency)}
- **Previous Close:** ${formatCurrency(quote.previousClose, quote.currency)}

## 52-Week Range
- **52-Week High:** ${formatCurrency(quote.week52High, quote.currency)} (${distanceFromHigh.toFixed(1)}% below)
- **52-Week Low:** ${formatCurrency(quote.week52Low, quote.currency)} (${distanceFromLow.toFixed(1)}% above)
- **Position in Range:** ${((quote.price - quote.week52Low) / (quote.week52High - quote.week52Low) * 100).toFixed(1)}%

## Valuation Metrics
- **P/E Ratio (TTM):** ${formatRatio(quote.pe)}
- **P/B Ratio:** ${formatRatio(quote.pb)}
- **P/S Ratio:** ${formatRatio(quote.ps)}
- **Dividend Yield:** ${quote.dividendYield ? formatPercent(quote.dividendYield, 2) : 'N/A'}

## Market Data
- **Market Cap:** ${formatMarketCap(quote.marketCap, quote.currency)}
- **Volume:** ${quote.volume.toLocaleString()}
- **Exchange:** ${quote.exchange}

---
*Data as of ${formatDateTime(quote.timestamp)}*
*Data source: ${getProvider().displayName}*
`;

  return output.trim();
}

/**
 * Get stock quote handler
 */
export async function getStockQuote(
  args: Record<string, unknown>
): Promise<string> {
  // Validate input
  const input = validateInput(GetStockQuoteInputSchema, args);
  let ticker = input.ticker;

  logger.info(`Getting quote for: ${ticker}`);

  const provider = getProvider();

  // If input looks like a company name, try to search for it
  if (!/^[A-Z0-9.-]+$/i.test(ticker) || ticker.length > 6) {
    logger.debug(`Input "${ticker}" looks like company name, searching...`);

    if (provider.searchStocks) {
      const searchResults = await provider.searchStocks(ticker);
      if (searchResults.length > 0) {
        ticker = searchResults[0].ticker;
        logger.debug(`Found ticker: ${ticker}`);
      }
    }
  }

  // Check cache first
  const cacheKey = createCacheKey('quote', ticker);
  const cached = quoteCache.get(cacheKey);

  if (cached) {
    logger.debug(`Cache hit for ${ticker}`);
    return formatQuoteOutput(cached as StockQuote);
  }

  // Fetch from provider
  const quote = await provider.getQuote(ticker);

  // Cache the result
  quoteCache.set(cacheKey, quote);

  return formatQuoteOutput(quote);
}
