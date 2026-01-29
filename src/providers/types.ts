/**
 * Data Provider Types
 *
 * This file defines the core interfaces that all data providers must implement.
 * Users can add their own data sources by implementing the DataProvider interface.
 */

/**
 * Real-time stock quote data
 */
export interface StockQuote {
  /** Stock ticker symbol (e.g., AAPL, MSFT) */
  ticker: string;
  /** Company name */
  name: string;
  /** Current price */
  price: number;
  /** Opening price */
  open: number;
  /** Day's high */
  high: number;
  /** Day's low */
  low: number;
  /** Previous close price */
  previousClose: number;
  /** Price change from previous close */
  change: number;
  /** Percent change from previous close */
  changePercent: number;
  /** Trading volume */
  volume: number;
  /** Market capitalization */
  marketCap: number;
  /** Price to Earnings ratio (TTM) */
  pe: number | null;
  /** Price to Book ratio */
  pb: number | null;
  /** Price to Sales ratio */
  ps: number | null;
  /** Dividend yield */
  dividendYield: number | null;
  /** 52-week high */
  week52High: number;
  /** 52-week low */
  week52Low: number;
  /** Quote timestamp */
  timestamp: Date;
  /** Currency */
  currency: string;
  /** Exchange */
  exchange: string;
}

/**
 * Income statement data
 */
export interface IncomeStatement {
  /** Fiscal year (e.g., "2023") */
  fiscalYear: string;
  /** Fiscal quarter (e.g., "Q4") - optional for annual data */
  fiscalQuarter?: string;
  /** Total revenue */
  revenue: number;
  /** Cost of goods sold */
  costOfRevenue: number;
  /** Gross profit */
  grossProfit: number;
  /** Research and development expenses */
  researchAndDevelopment: number | null;
  /** Selling, general, and administrative expenses */
  sellingGeneralAdmin: number | null;
  /** Operating income */
  operatingIncome: number;
  /** Interest expense */
  interestExpense: number | null;
  /** Net income */
  netIncome: number;
  /** Earnings per share (basic) */
  eps: number;
  /** Earnings per share (diluted) */
  epsDiluted: number;
  /** EBITDA */
  ebitda: number;
  /** Shares outstanding */
  sharesOutstanding: number;
  /** Report date */
  reportDate: string;
}

/**
 * Balance sheet data
 */
export interface BalanceSheet {
  /** Fiscal year (e.g., "2023") */
  fiscalYear: string;
  /** Fiscal quarter - optional for annual data */
  fiscalQuarter?: string;
  /** Total assets */
  totalAssets: number;
  /** Current assets */
  currentAssets: number;
  /** Cash and cash equivalents */
  cash: number;
  /** Short-term investments */
  shortTermInvestments: number | null;
  /** Accounts receivable */
  accountsReceivable: number | null;
  /** Inventory */
  inventory: number | null;
  /** Total liabilities */
  totalLiabilities: number;
  /** Current liabilities */
  currentLiabilities: number;
  /** Long-term debt */
  longTermDebt: number;
  /** Total debt */
  totalDebt: number;
  /** Total stockholders' equity */
  totalEquity: number;
  /** Retained earnings */
  retainedEarnings: number | null;
  /** Book value per share */
  bookValuePerShare: number;
  /** Report date */
  reportDate: string;
}

/**
 * Cash flow statement data
 */
export interface CashFlowStatement {
  /** Fiscal year (e.g., "2023") */
  fiscalYear: string;
  /** Fiscal quarter - optional for annual data */
  fiscalQuarter?: string;
  /** Net income */
  netIncome: number;
  /** Depreciation and amortization */
  depreciation: number;
  /** Operating cash flow */
  operatingCashFlow: number;
  /** Capital expenditure */
  capitalExpenditure: number;
  /** Investing cash flow */
  investingCashFlow: number;
  /** Financing cash flow */
  financingCashFlow: number;
  /** Free cash flow (Operating - CapEx) */
  freeCashFlow: number;
  /** Dividends paid */
  dividendsPaid: number | null;
  /** Stock repurchases */
  stockRepurchases: number | null;
  /** Report date */
  reportDate: string;
}

/**
 * Combined financial statements
 */
export interface Financials {
  /** Stock ticker symbol */
  ticker: string;
  /** Income statements (annual, sorted by most recent first) */
  incomeStatements: IncomeStatement[];
  /** Balance sheets (annual, sorted by most recent first) */
  balanceSheets: BalanceSheet[];
  /** Cash flow statements (annual, sorted by most recent first) */
  cashFlowStatements: CashFlowStatement[];
  /** Data currency */
  currency: string;
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * News article
 */
export interface NewsItem {
  /** Article title */
  title: string;
  /** News source */
  source: string;
  /** Article URL */
  url: string;
  /** Publication date */
  publishedAt: Date;
  /** Article summary (if available) */
  summary?: string;
  /** Related tickers */
  relatedTickers?: string[];
  /** Sentiment score (-1 to 1, if available) */
  sentiment?: number;
}

/**
 * Company profile information
 */
export interface CompanyProfile {
  /** Stock ticker symbol */
  ticker: string;
  /** Company name */
  name: string;
  /** Company description */
  description: string;
  /** Industry sector */
  sector: string;
  /** Industry sub-category */
  industry: string;
  /** Number of employees */
  employees: number | null;
  /** Company website */
  website: string;
  /** Country of headquarters */
  country: string;
  /** CEO name */
  ceo?: string;
  /** Founded year */
  foundedYear?: number;
  /** IPO date */
  ipoDate?: string;
}

/**
 * Historical price data
 */
export interface HistoricalPrice {
  /** Date */
  date: Date;
  /** Opening price */
  open: number;
  /** Day's high */
  high: number;
  /** Day's low */
  low: number;
  /** Closing price */
  close: number;
  /** Trading volume */
  volume: number;
  /** Adjusted close (for dividends/splits) */
  adjustedClose: number;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider name */
  name: string;
  /** API key (if required) */
  apiKey?: string;
  /** Base URL (for custom endpoints) */
  baseUrl?: string;
  /** Additional options */
  options?: Record<string, unknown>;
}

/**
 * Core Data Provider Interface
 *
 * All data providers must implement this interface.
 * To add a new data source, create a class that implements DataProvider.
 *
 * @example
 * ```typescript
 * class MyCustomProvider implements DataProvider {
 *   name = 'my-custom-provider';
 *
 *   async getQuote(ticker: string): Promise<StockQuote> {
 *     // Your implementation here
 *   }
 *   // ... implement other methods
 * }
 * ```
 */
export interface DataProvider {
  /** Provider identifier */
  readonly name: string;

  /** Provider display name */
  readonly displayName: string;

  /** Whether API key is required */
  readonly requiresApiKey: boolean;

  /**
   * Get real-time stock quote
   * @param ticker - Stock ticker symbol
   */
  getQuote(ticker: string): Promise<StockQuote>;

  /**
   * Get financial statements
   * @param ticker - Stock ticker symbol
   * @param years - Number of years of data (default: 5)
   */
  getFinancials(ticker: string, years?: number): Promise<Financials>;

  /**
   * Get company profile
   * @param ticker - Stock ticker symbol
   */
  getCompanyProfile(ticker: string): Promise<CompanyProfile>;

  /**
   * Get stock-related news (optional)
   * If not implemented, will fallback to default news provider
   * @param ticker - Stock ticker symbol
   * @param days - Number of days to look back (default: 7)
   */
  getNews?(ticker: string, days?: number): Promise<NewsItem[]>;

  /**
   * Get historical price data (optional)
   * @param ticker - Stock ticker symbol
   * @param years - Number of years of data (default: 5)
   */
  getHistoricalPrices?(ticker: string, years?: number): Promise<HistoricalPrice[]>;

  /**
   * Verify API connection is working
   * @returns true if connection is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Search for stocks by name or ticker
   * @param query - Search query
   */
  searchStocks?(query: string): Promise<Array<{ ticker: string; name: string; exchange: string }>>;
}

/**
 * Provider factory function type
 */
export type ProviderFactory = (config?: ProviderConfig) => DataProvider;
