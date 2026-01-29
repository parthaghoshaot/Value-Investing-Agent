/**
 * Watchlist Management Tool
 *
 * Manage a personal stock watchlist for tracking investments.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getProvider } from '../providers/index.js';
import { validateInput, ManageWatchlistInputSchema } from '../utils/validators.js';
import { formatDate, generateMarkdownTable } from '../utils/formatters.js';
import { loadWatchlist, saveWatchlist } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import type { Watchlist, WatchlistStock, WatchlistGroup } from '../config/schema.js';

const logger = createLogger('watchlist');

/**
 * Tool definition for MCP
 */
export const manageWatchlistDefinition: Tool = {
  name: 'manage_watchlist',
  description:
    'Manage your stock watchlist: add, remove, list stocks, and organize them into groups. ' +
    'Default groups: Technology, Consumer, Finance, Healthcare, Industrial, Energy, Other.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['add', 'remove', 'list', 'add_group', 'remove_group', 'move_to_group'],
        description: 'Action to perform',
      },
      ticker: {
        type: 'string',
        description: 'Stock ticker (required for add, remove, move_to_group)',
      },
      group: {
        type: 'string',
        description: 'Group name (for add, add_group, remove_group, move_to_group)',
      },
      notes: {
        type: 'string',
        description: 'Notes about the stock (optional, for add action)',
      },
    },
    required: ['action'],
  },
};

/**
 * Format watchlist for display
 */
function formatWatchlist(watchlist: Watchlist): string {
  if (watchlist.stocks.length === 0) {
    return `
# Stock Watchlist

📋 Your watchlist is empty.

**To add stocks:**
Use \`manage_watchlist\` with action "add" and a ticker symbol.

**Available groups:**
${watchlist.groups.map((g) => `- ${g.name} (${g.nameEn})`).join('\n')}
`.trim();
  }

  // Group stocks
  const stocksByGroup: Record<string, WatchlistStock[]> = {};
  for (const group of watchlist.groups) {
    stocksByGroup[group.id] = [];
  }

  for (const stock of watchlist.stocks) {
    const groupId = stock.group || 'other';
    if (!stocksByGroup[groupId]) {
      stocksByGroup[groupId] = [];
    }
    stocksByGroup[groupId].push(stock);
  }

  let output = `# Stock Watchlist\n\n`;
  output += `**Total stocks:** ${watchlist.stocks.length}\n`;
  output += `**Last updated:** ${formatDate(new Date(watchlist.updatedAt), 'long')}\n\n`;

  // Output each group
  for (const group of watchlist.groups) {
    const stocks = stocksByGroup[group.id];
    if (!stocks || stocks.length === 0) continue;

    output += `## ${group.name} (${group.nameEn})\n\n`;

    const headers = ['Ticker', 'Name', 'Added', 'Notes'];
    const rows = stocks.map((s) => [
      s.ticker,
      s.name,
      s.addedAt,
      s.notes || '-',
    ]);

    output += generateMarkdownTable(headers, rows);
    output += '\n\n';
  }

  return output.trim();
}

/**
 * Add stock to watchlist
 */
async function addStock(
  watchlist: Watchlist,
  ticker: string,
  group: string,
  notes?: string
): Promise<string> {
  // Check if already exists
  const existing = watchlist.stocks.find((s) => s.ticker === ticker);
  if (existing) {
    return `⚠️ ${ticker} is already in your watchlist (${existing.group} group).`;
  }

  // Check max stocks
  if (watchlist.stocks.length >= watchlist.settings.maxStocks) {
    return `⚠️ Watchlist is full (max ${watchlist.settings.maxStocks} stocks).`;
  }

  // Validate group
  const validGroup = watchlist.groups.find((g) => g.id === group || g.name === group);
  const groupId = validGroup?.id || watchlist.settings.defaultGroup;

  // Get stock name from provider
  let stockName = ticker;
  try {
    const provider = getProvider();
    const quote = await provider.getQuote(ticker);
    stockName = quote.name;
  } catch (error) {
    logger.warn(`Could not fetch stock name for ${ticker}`, error);
  }

  // Add stock
  const newStock: WatchlistStock = {
    ticker: ticker.toUpperCase(),
    name: stockName,
    addedAt: new Date().toISOString().split('T')[0],
    group: groupId,
    notes,
  };

  watchlist.stocks.push(newStock);
  saveWatchlist(watchlist);

  const groupInfo = watchlist.groups.find((g) => g.id === groupId);
  return `✅ Added **${stockName}** (${ticker}) to watchlist in group "${groupInfo?.name || groupId}".`;
}

/**
 * Remove stock from watchlist
 */
function removeStock(watchlist: Watchlist, ticker: string): string {
  const index = watchlist.stocks.findIndex((s) => s.ticker === ticker);

  if (index === -1) {
    return `⚠️ ${ticker} is not in your watchlist.`;
  }

  const removed = watchlist.stocks.splice(index, 1)[0];
  saveWatchlist(watchlist);

  return `✅ Removed **${removed.name}** (${ticker}) from watchlist.`;
}

/**
 * Add a new group
 */
function addGroup(watchlist: Watchlist, groupName: string): string {
  const groupId = groupName.toLowerCase().replace(/\s+/g, '-');

  if (watchlist.groups.find((g) => g.id === groupId)) {
    return `⚠️ Group "${groupName}" already exists.`;
  }

  watchlist.groups.push({
    id: groupId,
    name: groupName,
    nameEn: groupName,
  });

  saveWatchlist(watchlist);
  return `✅ Added new group: "${groupName}"`;
}

/**
 * Remove a group
 */
function removeGroup(watchlist: Watchlist, groupName: string): string {
  const groupIndex = watchlist.groups.findIndex(
    (g) => g.id === groupName || g.name === groupName
  );

  if (groupIndex === -1) {
    return `⚠️ Group "${groupName}" not found.`;
  }

  const group = watchlist.groups[groupIndex];

  // Check if default groups
  const defaultGroups = ['tech', 'consumer', 'finance', 'healthcare', 'industrial', 'energy', 'other'];
  if (defaultGroups.includes(group.id)) {
    return `⚠️ Cannot remove default group "${group.name}".`;
  }

  // Move stocks to 'other'
  const stocksInGroup = watchlist.stocks.filter((s) => s.group === group.id);
  for (const stock of stocksInGroup) {
    stock.group = 'other';
  }

  watchlist.groups.splice(groupIndex, 1);
  saveWatchlist(watchlist);

  return `✅ Removed group "${group.name}". ${stocksInGroup.length} stock(s) moved to "Other".`;
}

/**
 * Move stock to a different group
 */
function moveToGroup(watchlist: Watchlist, ticker: string, groupName: string): string {
  const stock = watchlist.stocks.find((s) => s.ticker === ticker);
  if (!stock) {
    return `⚠️ ${ticker} is not in your watchlist.`;
  }

  const group = watchlist.groups.find(
    (g) => g.id === groupName || g.name === groupName
  );
  if (!group) {
    return `⚠️ Group "${groupName}" not found.`;
  }

  const oldGroup = watchlist.groups.find((g) => g.id === stock.group);
  stock.group = group.id;
  saveWatchlist(watchlist);

  return `✅ Moved **${stock.name}** (${ticker}) from "${oldGroup?.name || stock.group}" to "${group.name}".`;
}

/**
 * Manage watchlist handler
 */
export async function manageWatchlist(
  args: Record<string, unknown>
): Promise<string> {
  // Validate input
  const input = validateInput(ManageWatchlistInputSchema, args);
  const { action, ticker, group, notes } = input;

  logger.info(`Watchlist action: ${action}`, { ticker, group });

  // Load current watchlist
  const watchlist = loadWatchlist();

  switch (action) {
    case 'list':
      return formatWatchlist(watchlist);

    case 'add':
      if (!ticker) {
        return '⚠️ Ticker is required for add action.';
      }
      return addStock(watchlist, ticker, group || watchlist.settings.defaultGroup, notes);

    case 'remove':
      if (!ticker) {
        return '⚠️ Ticker is required for remove action.';
      }
      return removeStock(watchlist, ticker);

    case 'add_group':
      if (!group) {
        return '⚠️ Group name is required for add_group action.';
      }
      return addGroup(watchlist, group);

    case 'remove_group':
      if (!group) {
        return '⚠️ Group name is required for remove_group action.';
      }
      return removeGroup(watchlist, group);

    case 'move_to_group':
      if (!ticker || !group) {
        return '⚠️ Both ticker and group are required for move_to_group action.';
      }
      return moveToGroup(watchlist, ticker, group);

    default:
      return `⚠️ Unknown action: ${action}`;
  }
}
