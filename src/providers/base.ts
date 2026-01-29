/**
 * Base Data Provider
 *
 * Provides common functionality for all data providers.
 * Extend this class to create custom providers.
 */

import type {
  DataProvider,
  StockQuote,
  Financials,
  CompanyProfile,
  NewsItem,
  HistoricalPrice,
  ProviderConfig,
} from './types.js';

/**
 * Abstract base class for data providers
 *
 * Provides common functionality like ticker normalization and error handling.
 * Extend this class and implement the abstract methods to create a new provider.
 *
 * @example
 * ```typescript
 * class MyProvider extends BaseProvider {
 *   readonly name = 'my-provider';
 *   readonly displayName = 'My Custom Provider';
 *   readonly requiresApiKey = true;
 *
 *   constructor(config?: ProviderConfig) {
 *     super(config);
 *     // Initialize your provider
 *   }
 *
 *   protected async fetchQuote(ticker: string): Promise<StockQuote> {
 *     // Implement quote fetching
 *   }
 *   // ... implement other methods
 * }
 * ```
 */
export abstract class BaseProvider implements DataProvider {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly requiresApiKey: boolean;

  protected config: ProviderConfig;

  constructor(config?: ProviderConfig) {
    this.config = config || { name: 'unknown' };
  }

  /**
   * Normalize ticker symbol
   * - Converts to uppercase
   * - Removes leading/trailing whitespace
   */
  protected normalizeTicker(ticker: string): string {
    return ticker.trim().toUpperCase();
  }

  /**
   * Handle provider errors with consistent formatting
   */
  protected handleError(operation: string, ticker: string, error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[${this.name}] Failed to ${operation} for ${ticker}: ${message}`);
  }

  /**
   * Get real-time stock quote
   */
  async getQuote(ticker: string): Promise<StockQuote> {
    const normalizedTicker = this.normalizeTicker(ticker);
    try {
      return await this.fetchQuote(normalizedTicker);
    } catch (error) {
      this.handleError('get quote', normalizedTicker, error);
    }
  }

  /**
   * Get financial statements
   */
  async getFinancials(ticker: string, years = 5): Promise<Financials> {
    const normalizedTicker = this.normalizeTicker(ticker);
    try {
      return await this.fetchFinancials(normalizedTicker, years);
    } catch (error) {
      this.handleError('get financials', normalizedTicker, error);
    }
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(ticker: string): Promise<CompanyProfile> {
    const normalizedTicker = this.normalizeTicker(ticker);
    try {
      return await this.fetchCompanyProfile(normalizedTicker);
    } catch (error) {
      this.handleError('get company profile', normalizedTicker, error);
    }
  }

  /**
   * Get news (optional - subclasses can override)
   */
  async getNews?(ticker: string, days?: number): Promise<NewsItem[]>;

  /**
   * Get historical prices (optional - subclasses can override)
   */
  async getHistoricalPrices?(ticker: string, years?: number): Promise<HistoricalPrice[]>;

  /**
   * Health check - verify provider is working
   * Default implementation tries to fetch a known stock (AAPL)
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getQuote('AAPL');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Search stocks (optional - subclasses can override)
   */
  async searchStocks?(query: string): Promise<Array<{ ticker: string; name: string; exchange: string }>>;

  // Abstract methods that must be implemented by subclasses
  protected abstract fetchQuote(ticker: string): Promise<StockQuote>;
  protected abstract fetchFinancials(ticker: string, years: number): Promise<Financials>;
  protected abstract fetchCompanyProfile(ticker: string): Promise<CompanyProfile>;
}

/**
 * Provider error types
 */
export class ProviderError extends Error {
  constructor(
    public provider: string,
    public operation: string,
    public ticker: string,
    message: string,
    public cause?: Error
  ) {
    super(`[${provider}] ${operation} failed for ${ticker}: ${message}`);
    this.name = 'ProviderError';
  }
}

export class TickerNotFoundError extends ProviderError {
  constructor(provider: string, ticker: string) {
    super(provider, 'lookup', ticker, 'Ticker not found');
    this.name = 'TickerNotFoundError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(provider: string, retryAfterMs?: number) {
    super(provider, 'request', '', `Rate limit exceeded${retryAfterMs ? `. Retry after ${retryAfterMs}ms` : ''}`);
    this.name = 'RateLimitError';
  }
}

export class ApiKeyError extends ProviderError {
  constructor(provider: string) {
    super(provider, 'authenticate', '', 'API key is invalid or missing');
    this.name = 'ApiKeyError';
  }
}
