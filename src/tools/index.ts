/**
 * MCP Tools Registry
 *
 * Central registry for all tool definitions and handlers.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// Import tool handlers
import { getStockQuote, getStockQuoteDefinition } from './quote.js';
import { getFinancials, getFinancialsDefinition } from './financials.js';
import { calculateIntrinsicValue, calculateIntrinsicValueDefinition } from './valuation.js';
import { analyzeMoat, analyzeMoatDefinition } from './moat.js';
import { getNews, getNewsDefinition } from './news.js';
import { manageWatchlist, manageWatchlistDefinition } from './watchlist.js';
import { generateDailyReport, generateDailyReportDefinition } from './report.js';
import { generateStockReport, generateStockReportDefinition } from './report.js';
import { setProviderTool, setProviderDefinition } from './provider.js';
import { listProviders, listProvidersDefinition } from './provider.js';

/**
 * All tool definitions
 */
export const toolDefinitions: Tool[] = [
  getStockQuoteDefinition,
  getFinancialsDefinition,
  calculateIntrinsicValueDefinition,
  analyzeMoatDefinition,
  getNewsDefinition,
  manageWatchlistDefinition,
  generateDailyReportDefinition,
  generateStockReportDefinition,
  setProviderDefinition,
  listProvidersDefinition,
];

/**
 * Tool handler map
 */
const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  get_stock_quote: getStockQuote,
  get_financials: getFinancials,
  calculate_intrinsic_value: calculateIntrinsicValue,
  analyze_moat: analyzeMoat,
  get_news: getNews,
  manage_watchlist: manageWatchlist,
  generate_daily_report: generateDailyReport,
  generate_stock_report: generateStockReport,
  set_provider: setProviderTool,
  list_providers: listProviders,
};

/**
 * Handle a tool call
 * @param name - Tool name
 * @param args - Tool arguments
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const handler = toolHandlers[name];

  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return handler(args);
}

// Re-export individual tools
export {
  getStockQuote,
  getFinancials,
  calculateIntrinsicValue,
  analyzeMoat,
  getNews,
  manageWatchlist,
  generateDailyReport,
  generateStockReport,
  setProviderTool,
  listProviders,
};
