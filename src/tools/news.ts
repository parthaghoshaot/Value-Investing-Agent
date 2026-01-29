/**
 * News Fetching Tool
 *
 * Fetches stock-related news from various sources.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import Parser from 'rss-parser';
import { getProvider } from '../providers/index.js';
import { validateInput, GetNewsInputSchema } from '../utils/validators.js';
import { formatDate, truncate } from '../utils/formatters.js';
import { newsCache, createCacheKey } from '../utils/cache.js';
import { createLogger } from '../utils/logger.js';
import { loadConfig } from '../config/index.js';
import type { NewsItem } from '../providers/types.js';

const logger = createLogger('news');

// RSS Parser instance
const rssParser = new Parser({
  customFields: {
    item: ['media:content', 'source'],
  },
});

/**
 * Tool definition for MCP
 */
export const getNewsDefinition: Tool = {
  name: 'get_news',
  description:
    'Get recent news articles related to a stock. Aggregates from multiple sources ' +
    'including Google News RSS and Finnhub (if API key configured).',
  inputSchema: {
    type: 'object',
    properties: {
      ticker: {
        type: 'string',
        description: 'Stock ticker symbol (e.g., AAPL, MSFT)',
      },
      days: {
        type: 'number',
        description: 'Number of days to look back (default: 7, max: 30)',
        default: 7,
      },
      limit: {
        type: 'number',
        description: 'Maximum number of articles to return (default: 10, max: 50)',
        default: 10,
      },
    },
    required: ['ticker'],
  },
};

/**
 * Fetch news from Google News RSS
 */
async function fetchGoogleNews(ticker: string, companyName: string): Promise<NewsItem[]> {
  try {
    // Search for both ticker and company name
    const query = encodeURIComponent(`${ticker} OR "${companyName}" stock`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

    const feed = await rssParser.parseURL(url);

    return (feed.items || []).map((item) => ({
      title: item.title || '',
      source: item.source || 'Google News',
      url: item.link || '',
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      summary: item.contentSnippet,
    }));
  } catch (error) {
    logger.warn('Failed to fetch Google News', error);
    return [];
  }
}

/**
 * Fetch news from Finnhub API
 */
async function fetchFinnhubNews(ticker: string, apiKey: string): Promise<NewsItem[]> {
  try {
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json() as Array<{
      headline: string;
      source: string;
      url: string;
      datetime: number;
      summary: string;
    }>;

    return data.map((item) => ({
      title: item.headline,
      source: item.source,
      url: item.url,
      publishedAt: new Date(item.datetime * 1000),
      summary: item.summary,
    }));
  } catch (error) {
    logger.warn('Failed to fetch Finnhub news', error);
    return [];
  }
}

/**
 * Format news items for output
 */
function formatNewsOutput(ticker: string, news: NewsItem[], days: number): string {
  if (news.length === 0) {
    return `
# News: ${ticker}

📰 No recent news found for ${ticker} in the last ${days} days.

*Try expanding the search period or check if the ticker symbol is correct.*
`.trim();
  }

  let output = `# News: ${ticker}\n\n`;
  output += `📰 Found ${news.length} article(s) from the last ${days} days\n\n`;
  output += '---\n\n';

  for (const item of news) {
    const dateStr = formatDate(item.publishedAt, 'short');
    output += `### ${item.title}\n`;
    output += `**Source:** ${item.source} | **Date:** ${dateStr}\n`;

    if (item.summary) {
      output += `\n${truncate(item.summary, 300)}\n`;
    }

    output += `\n🔗 [Read more](${item.url})\n`;
    output += '\n---\n\n';
  }

  output += `\n*Fetched at: ${new Date().toLocaleString()}*\n`;
  output += '\n⚠️ **Note:** News articles are from third-party sources. Always verify information before making investment decisions.';

  return output.trim();
}

/**
 * Get news handler
 */
export async function getNews(
  args: Record<string, unknown>
): Promise<string> {
  // Validate input
  const input = validateInput(GetNewsInputSchema, args);
  const { ticker, days, limit } = input;

  logger.info(`Getting news for: ${ticker} (last ${days} days, limit ${limit})`);

  // Check cache
  const cacheKey = createCacheKey('news', ticker, days);
  const cached = newsCache.get(cacheKey) as NewsItem[] | undefined;

  if (cached) {
    logger.debug(`Cache hit for ${ticker} news`);
    return formatNewsOutput(ticker, cached.slice(0, limit), days);
  }

  // Load config for API keys
  const config = loadConfig();

  // Get company name for better search
  let companyName = ticker;
  try {
    const provider = getProvider();
    const profile = await provider.getCompanyProfile(ticker);
    companyName = profile.name;
  } catch {
    logger.debug('Could not fetch company name, using ticker');
  }

  // Fetch news from multiple sources in parallel
  const newsPromises: Promise<NewsItem[]>[] = [
    fetchGoogleNews(ticker, companyName),
  ];

  // Add Finnhub if API key available
  if (config.news.finnhubApiKey) {
    newsPromises.push(fetchFinnhubNews(ticker, config.news.finnhubApiKey));
  }

  // Also check if provider has news
  const provider = getProvider();
  if (provider.getNews) {
    newsPromises.push(provider.getNews(ticker, days));
  }

  const newsArrays = await Promise.all(newsPromises);

  // Combine and deduplicate
  const allNews: NewsItem[] = [];
  const seenUrls = new Set<string>();

  for (const newsItems of newsArrays) {
    for (const item of newsItems) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        allNews.push(item);
      }
    }
  }

  // Filter by date
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentNews = allNews.filter((item) => item.publishedAt >= cutoffDate);

  // Sort by date (most recent first)
  recentNews.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  // Cache the results
  newsCache.set(cacheKey, recentNews);

  // Return limited results
  return formatNewsOutput(ticker, recentNews.slice(0, limit), days);
}
