# Custom Data Provider Guide

This guide explains how to add your own data provider to Value Investing Agent.

## Architecture Overview

Value Investing Agent uses a pluggable provider architecture. All providers implement the `DataProvider` interface, making it easy to swap data sources.

```
┌─────────────────┐
│  MCP Tools      │
└────────┬────────┘
         │
    getProvider()
         │
         ▼
┌─────────────────┐
│ Provider Factory│
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────┐
│Yahoo │  │Custom│
│Finance│ │Provider│
└──────┘  └──────┘
```

## The DataProvider Interface

Every provider must implement this interface:

```typescript
interface DataProvider {
  readonly name: string;           // Unique identifier
  readonly displayName: string;    // Human-readable name
  readonly requiresApiKey: boolean; // API key requirement

  // Required methods
  getQuote(ticker: string): Promise<StockQuote>;
  getFinancials(ticker: string, years?: number): Promise<Financials>;
  getCompanyProfile(ticker: string): Promise<CompanyProfile>;
  healthCheck(): Promise<boolean>;

  // Optional methods
  getNews?(ticker: string, days?: number): Promise<NewsItem[]>;
  getHistoricalPrices?(ticker: string, years?: number): Promise<HistoricalPrice[]>;
  searchStocks?(query: string): Promise<Array<{ ticker: string; name: string; exchange: string }>>;
}
```

## Step-by-Step: Creating a Provider

### Step 1: Copy the Template

Copy `src/providers/provider-template.ts` to a new file:

```bash
cp src/providers/provider-template.ts src/providers/my-provider.ts
```

### Step 2: Implement Required Methods

```typescript
import { BaseProvider } from './base.js';
import type {
  StockQuote,
  Financials,
  CompanyProfile,
  ProviderConfig,
} from './types.js';

export class MyProvider extends BaseProvider {
  readonly name = 'my-provider';
  readonly displayName = 'My Custom Provider';
  readonly requiresApiKey = true;

  private apiKey: string;
  private baseUrl: string;

  constructor(config?: ProviderConfig) {
    super(config);
    this.apiKey = config?.apiKey || process.env.MY_PROVIDER_API_KEY || '';
    this.baseUrl = config?.baseUrl || 'https://api.example.com';
  }

  protected async fetchQuote(ticker: string): Promise<StockQuote> {
    const response = await fetch(
      `${this.baseUrl}/quote/${ticker}?apikey=${this.apiKey}`
    );
    const data = await response.json();

    return {
      ticker: data.symbol,
      name: data.companyName,
      price: data.latestPrice,
      open: data.open,
      high: data.high,
      low: data.low,
      previousClose: data.previousClose,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume,
      marketCap: data.marketCap,
      pe: data.peRatio,
      pb: data.priceToBook,
      ps: data.priceToSales,
      dividendYield: data.dividendYield,
      week52High: data.week52High,
      week52Low: data.week52Low,
      timestamp: new Date(),
      currency: data.currency || 'USD',
      exchange: data.exchange,
    };
  }

  protected async fetchFinancials(ticker: string, years: number): Promise<Financials> {
    // Implement API calls for financial data
    // You may need multiple endpoints
  }

  protected async fetchCompanyProfile(ticker: string): Promise<CompanyProfile> {
    // Implement company profile fetching
  }
}
```

### Step 3: Register the Provider

Edit `src/providers/index.ts`:

```typescript
import { MyProvider } from './my-provider.js';

// Add to the providerFactories Map
const providerFactories: Map<string, ProviderFactory> = new Map([
  ['yahoo-finance', (config) => new YahooFinanceProvider(config)],
  ['my-provider', (config) => new MyProvider(config)],  // Add this line
]);
```

### Step 4: Test Your Provider

```typescript
// Quick test
import { setProvider, getProvider } from './providers/index.js';

async function test() {
  await setProvider('my-provider', { apiKey: 'your-api-key' });
  const provider = getProvider();

  const quote = await provider.getQuote('AAPL');
  console.log(quote);
}
```

## Data Normalization

It's important to normalize data to match the interface exactly:

### Numbers
- Return actual numbers, not strings
- Return `null` for missing values (not `0` or `undefined`)
- Convert percentages to decimals where appropriate

### Dates
- Use JavaScript `Date` objects
- Fiscal years should be strings like "2023"

### Currency
- Always include currency code
- Use standard ISO codes (USD, EUR, etc.)

## Error Handling

Use the provided error classes:

```typescript
import { TickerNotFoundError, RateLimitError, ApiKeyError } from './base.js';

protected async fetchQuote(ticker: string): Promise<StockQuote> {
  const response = await fetch(/*...*/);

  if (response.status === 404) {
    throw new TickerNotFoundError(this.name, ticker);
  }

  if (response.status === 429) {
    throw new RateLimitError(this.name);
  }

  if (response.status === 401) {
    throw new ApiKeyError(this.name);
  }

  // ...
}
```

## Caching Considerations

The caching system is implemented at the tool level, but providers can implement their own:

```typescript
private cache = new Map<string, { data: any; expiry: number }>();

private getCached<T>(key: string): T | null {
  const cached = this.cache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T;
  }
  return null;
}

private setCache(key: string, data: any, ttlMs: number): void {
  this.cache.set(key, { data, expiry: Date.now() + ttlMs });
}
```

## Example: Alpha Vantage Provider

See `src/providers/alpha-vantage.ts` for a complete example of implementing a real API provider.

## Common Data Sources

Here are some popular financial data APIs you might integrate:

| Provider | Free Tier | Data Available |
|----------|-----------|----------------|
| Alpha Vantage | Yes (5 calls/min) | Quotes, financials, news |
| Polygon.io | Yes (limited) | Real-time, historical |
| IEX Cloud | Yes (limited) | Comprehensive data |
| Financial Modeling Prep | Yes (limited) | Full financial data |
| Twelve Data | Yes (limited) | Global markets |
| Finnhub | Yes (60 calls/min) | News, quotes, fundamentals |

## Best Practices

1. **Rate Limiting:** Implement backoff for rate-limited APIs
2. **Caching:** Cache responses to reduce API calls
3. **Error Messages:** Provide helpful error messages
4. **Logging:** Use the provided logger
5. **Validation:** Validate API responses before returning
6. **Testing:** Test with various tickers including edge cases

## Contributing

If you build a provider for a common API, consider contributing it back:

1. Ensure it's well-tested
2. Document any API key requirements
3. Follow the existing code style
4. Submit a pull request
