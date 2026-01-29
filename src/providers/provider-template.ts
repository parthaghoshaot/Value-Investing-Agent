/**
 * Custom Provider Template
 *
 * Use this as a starting point to create your own data provider.
 * Copy this file and implement the methods for your data source.
 *
 * After implementing, register your provider in src/providers/index.ts:
 *
 * ```typescript
 * import { MyCustomProvider } from './my-custom-provider';
 * registerProvider('my-custom', (config) => new MyCustomProvider(config));
 * ```
 */

import { BaseProvider } from './base.js';
import type {
  StockQuote,
  Financials,
  CompanyProfile,
  NewsItem,
  HistoricalPrice,
  ProviderConfig,
} from './types.js';

/**
 * Custom Provider Implementation
 *
 * Replace 'MyCustomProvider' with your provider name.
 */
export class MyCustomProvider extends BaseProvider {
  // Provider identifier - used for configuration
  readonly name = 'my-custom-provider';

  // Display name shown to users
  readonly displayName = 'My Custom Provider';

  // Set to true if your API requires an API key
  readonly requiresApiKey = true;

  private apiKey: string;
  private baseUrl: string;

  constructor(config?: ProviderConfig) {
    super(config);

    // Get API key from config
    this.apiKey = config?.apiKey || process.env.MY_PROVIDER_API_KEY || '';
    this.baseUrl = config?.baseUrl || 'https://api.example.com';

    if (this.requiresApiKey && !this.apiKey) {
      throw new Error(`${this.displayName} requires an API key`);
    }
  }

  /**
   * Implement: Fetch stock quote
   *
   * Must return a StockQuote object with current price and metrics.
   */
  protected async fetchQuote(ticker: string): Promise<StockQuote> {
    // Example implementation:
    // const response = await fetch(`${this.baseUrl}/quote/${ticker}?apikey=${this.apiKey}`);
    // const data = await response.json();

    // TODO: Implement your API call here
    throw new Error('Not implemented: fetchQuote');

    // Return format:
    // return {
    //   ticker: data.symbol,
    //   name: data.companyName,
    //   price: data.latestPrice,
    //   open: data.open,
    //   high: data.high,
    //   low: data.low,
    //   previousClose: data.previousClose,
    //   change: data.change,
    //   changePercent: data.changePercent,
    //   volume: data.volume,
    //   marketCap: data.marketCap,
    //   pe: data.peRatio,
    //   pb: data.priceToBook,
    //   ps: data.priceToSales,
    //   dividendYield: data.dividendYield,
    //   week52High: data.week52High,
    //   week52Low: data.week52Low,
    //   timestamp: new Date(),
    //   currency: data.currency || 'USD',
    //   exchange: data.exchange,
    // };
  }

  /**
   * Implement: Fetch financial statements
   *
   * Must return income statements, balance sheets, and cash flow statements.
   */
  protected async fetchFinancials(ticker: string, years: number): Promise<Financials> {
    // TODO: Implement your API calls for financial data
    throw new Error('Not implemented: fetchFinancials');

    // Tip: You may need multiple API calls to get all three statement types.
    // Return format: see src/providers/types.ts for Financials interface
  }

  /**
   * Implement: Fetch company profile
   *
   * Must return basic company information.
   */
  protected async fetchCompanyProfile(ticker: string): Promise<CompanyProfile> {
    // TODO: Implement your API call here
    throw new Error('Not implemented: fetchCompanyProfile');

    // Return format:
    // return {
    //   ticker,
    //   name: data.companyName,
    //   description: data.description,
    //   sector: data.sector,
    //   industry: data.industry,
    //   employees: data.employees,
    //   website: data.website,
    //   country: data.country,
    // };
  }

  /**
   * Optional: Fetch news
   *
   * If not implemented, the default news provider will be used.
   */
  async getNews(ticker: string, days = 7): Promise<NewsItem[]> {
    // TODO: Implement if your API provides news
    // Or remove this method to use the default fallback

    return [];
  }

  /**
   * Optional: Fetch historical prices
   *
   * Useful for charting and historical analysis.
   */
  async getHistoricalPrices(ticker: string, years = 5): Promise<HistoricalPrice[]> {
    // TODO: Implement if your API provides historical data
    // Or remove this method

    return [];
  }

  /**
   * Optional: Search for stocks
   *
   * Allows users to search by company name.
   */
  async searchStocks(query: string): Promise<Array<{ ticker: string; name: string; exchange: string }>> {
    // TODO: Implement if your API provides search
    // Or remove this method

    return [];
  }

  /**
   * Health check
   *
   * Override if you have a better way to verify API connectivity.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test API by fetching a known ticker
      await this.fetchQuote('AAPL');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Tips for implementing a custom provider:
 *
 * 1. Handle rate limits gracefully - implement exponential backoff
 * 2. Cache responses when possible to reduce API calls
 * 3. Handle API errors with meaningful messages
 * 4. Normalize data to match the interface exactly
 * 5. Handle null/undefined values appropriately
 * 6. Test with various tickers including edge cases
 *
 * Common data sources you might integrate:
 * - Alpha Vantage: https://www.alphavantage.co/
 * - Polygon.io: https://polygon.io/
 * - IEX Cloud: https://iexcloud.io/
 * - Financial Modeling Prep: https://financialmodelingprep.com/
 * - Twelve Data: https://twelvedata.com/
 */
