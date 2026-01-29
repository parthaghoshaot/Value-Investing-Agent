/**
 * Finnhub Data Provider
 *
 * Uses the Finnhub API for financial data.
 * Free tier: 60 API calls per minute
 *
 * Get your free API key at: https://finnhub.io/register
 */

import { BaseProvider, ApiKeyError, TickerNotFoundError, RateLimitError } from './base.js';
import type {
  StockQuote,
  Financials,
  CompanyProfile,
  NewsItem,
  IncomeStatement,
  BalanceSheet,
  CashFlowStatement,
  ProviderConfig,
} from './types.js';

/**
 * Finnhub Provider
 *
 * Recommended alternative to Yahoo Finance with generous rate limits.
 */
export class FinnhubProvider extends BaseProvider {
  readonly name = 'finnhub';
  readonly displayName = 'Finnhub';
  readonly requiresApiKey = true;

  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(config?: ProviderConfig) {
    super(config);

    this.apiKey = config?.apiKey || process.env.FINNHUB_API_KEY || '';

    if (!this.apiKey) {
      throw new ApiKeyError(this.name);
    }
  }

  /**
   * Make API request
   */
  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('token', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    const response = await fetch(url.toString());

    if (response.status === 429) {
      throw new RateLimitError(this.name);
    }

    if (response.status === 401) {
      throw new ApiKeyError(this.name);
    }

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetch real-time stock quote
   */
  protected async fetchQuote(ticker: string): Promise<StockQuote> {
    // Get quote data
    const [quoteData, profileData, metricsData] = await Promise.all([
      this.request<{
        c: number;  // Current price
        d: number;  // Change
        dp: number; // Percent change
        h: number;  // High
        l: number;  // Low
        o: number;  // Open
        pc: number; // Previous close
        t: number;  // Timestamp
      }>('/quote', { symbol: ticker }),
      this.request<{
        name: string;
        ticker: string;
        exchange: string;
        currency: string;
        marketCapitalization: number;
        shareOutstanding: number;
      }>('/stock/profile2', { symbol: ticker }),
      this.request<{
        metric: {
          '52WeekHigh': number;
          '52WeekLow': number;
          peBasicExclExtraTTM: number;
          pbAnnual: number;
          psAnnual: number;
          dividendYieldIndicatedAnnual: number;
        };
      }>('/stock/metric', { symbol: ticker, metric: 'all' }),
    ]);

    if (!quoteData.c || quoteData.c === 0) {
      throw new TickerNotFoundError(this.name, ticker);
    }

    const metrics = metricsData.metric || {};

    return {
      ticker: profileData.ticker || ticker,
      name: profileData.name || ticker,
      price: quoteData.c,
      open: quoteData.o,
      high: quoteData.h,
      low: quoteData.l,
      previousClose: quoteData.pc,
      change: quoteData.d,
      changePercent: quoteData.dp,
      volume: 0, // Not available in basic quote
      marketCap: (profileData.marketCapitalization || 0) * 1_000_000, // Finnhub returns in millions
      pe: metrics['peBasicExclExtraTTM'] ?? null,
      pb: metrics['pbAnnual'] ?? null,
      ps: metrics['psAnnual'] ?? null,
      dividendYield: metrics['dividendYieldIndicatedAnnual']
        ? metrics['dividendYieldIndicatedAnnual'] / 100
        : null,
      week52High: metrics['52WeekHigh'] || quoteData.c,
      week52Low: metrics['52WeekLow'] || quoteData.c,
      timestamp: new Date(quoteData.t * 1000),
      currency: profileData.currency || 'USD',
      exchange: profileData.exchange || 'UNKNOWN',
    };
  }

  /**
   * Fetch financial statements
   */
  protected async fetchFinancials(ticker: string, years: number): Promise<Financials> {
    const financialsData = await this.request<{
      financials: Array<{
        year: number;
        quarter: number;
        revenue: number;
        grossProfit: number;
        operatingIncome: number;
        netIncome: number;
        eps: number;
        ebitda: number;
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number;
        totalCash: number;
        totalDebt: number;
        operatingCashFlow: number;
        capitalExpenditure: number;
        freeCashFlow: number;
        dividendsPaid: number;
      }>;
    }>('/stock/financials-reported', { symbol: ticker, freq: 'annual' });

    // Get basic financials as backup
    const basicFinancials = await this.request<{
      metric: Record<string, number>;
      series: {
        annual: {
          eps: Array<{ period: string; v: number }>;
          revenue: Array<{ period: string; v: number }>;
          netIncome: Array<{ period: string; v: number }>;
        };
      };
    }>('/stock/metric', { symbol: ticker, metric: 'all' });

    const incomeStatements: IncomeStatement[] = [];
    const balanceSheets: BalanceSheet[] = [];
    const cashFlowStatements: CashFlowStatement[] = [];

    // Parse from series data if available
    const series = basicFinancials.series?.annual || {};
    const epsData = series.eps || [];
    const revenueData = series.revenue || [];

    for (let i = 0; i < Math.min(years, epsData.length); i++) {
      const year = epsData[i]?.period?.substring(0, 4) || `${new Date().getFullYear() - i}`;

      incomeStatements.push({
        fiscalYear: year,
        revenue: revenueData[i]?.v || 0,
        costOfRevenue: 0,
        grossProfit: 0,
        researchAndDevelopment: null,
        sellingGeneralAdmin: null,
        operatingIncome: 0,
        interestExpense: null,
        netIncome: (series as Record<string, Array<{ v: number }>>).netIncome?.[i]?.v || 0,
        eps: epsData[i]?.v || 0,
        epsDiluted: epsData[i]?.v || 0,
        ebitda: 0,
        sharesOutstanding: 0,
        reportDate: year,
      });

      balanceSheets.push({
        fiscalYear: year,
        totalAssets: 0,
        currentAssets: 0,
        cash: 0,
        shortTermInvestments: null,
        accountsReceivable: null,
        inventory: null,
        totalLiabilities: 0,
        currentLiabilities: 0,
        longTermDebt: 0,
        totalDebt: 0,
        totalEquity: 0,
        retainedEarnings: null,
        bookValuePerShare: basicFinancials.metric?.bookValuePerShareAnnual || 0,
        reportDate: year,
      });

      cashFlowStatements.push({
        fiscalYear: year,
        netIncome: 0,
        depreciation: 0,
        operatingCashFlow: 0,
        capitalExpenditure: 0,
        investingCashFlow: 0,
        financingCashFlow: 0,
        freeCashFlow: basicFinancials.metric?.freeCashFlowPerShareTTM || 0,
        dividendsPaid: null,
        stockRepurchases: null,
        reportDate: year,
      });
    }

    return {
      ticker,
      incomeStatements,
      balanceSheets,
      cashFlowStatements,
      currency: 'USD',
      lastUpdated: new Date(),
    };
  }

  /**
   * Fetch company profile
   */
  protected async fetchCompanyProfile(ticker: string): Promise<CompanyProfile> {
    const profile = await this.request<{
      name: string;
      ticker: string;
      country: string;
      currency: string;
      exchange: string;
      finnhubIndustry: string;
      weburl: string;
      logo: string;
      employeeTotal: number;
    }>('/stock/profile2', { symbol: ticker });

    if (!profile.name) {
      throw new TickerNotFoundError(this.name, ticker);
    }

    return {
      ticker: profile.ticker || ticker,
      name: profile.name,
      description: '', // Not provided by Finnhub basic endpoint
      sector: profile.finnhubIndustry || 'Unknown',
      industry: profile.finnhubIndustry || 'Unknown',
      employees: profile.employeeTotal || null,
      website: profile.weburl || '',
      country: profile.country || 'Unknown',
    };
  }

  /**
   * Get news
   */
  async getNews(ticker: string, days = 7): Promise<NewsItem[]> {
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const news = await this.request<
      Array<{
        headline: string;
        source: string;
        url: string;
        datetime: number;
        summary: string;
        related: string;
      }>
    >('/company-news', {
      symbol: ticker,
      from: fromDate,
      to: toDate,
    });

    return news.map((item) => ({
      title: item.headline,
      source: item.source,
      url: item.url,
      publishedAt: new Date(item.datetime * 1000),
      summary: item.summary,
      relatedTickers: item.related?.split(','),
    }));
  }

  /**
   * Search stocks
   */
  async searchStocks(
    query: string
  ): Promise<Array<{ ticker: string; name: string; exchange: string }>> {
    const results = await this.request<{
      result: Array<{
        symbol: string;
        description: string;
        type: string;
        displaySymbol: string;
      }>;
    }>('/search', { q: query });

    return (results.result || [])
      .filter((r) => r.type === 'Common Stock')
      .slice(0, 10)
      .map((r) => ({
        ticker: r.symbol,
        name: r.description,
        exchange: '',
      }));
  }
}
