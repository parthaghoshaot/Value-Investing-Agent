/**
 * Formatting Utilities
 *
 * Helper functions for formatting numbers, dates, and currency.
 */

/**
 * Format number as currency
 * @param value - Number to format
 * @param currency - Currency code (default: USD)
 * @param decimals - Number of decimal places
 */
export function formatCurrency(
  value: number,
  currency = 'USD',
  decimals = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format large numbers with abbreviations (K, M, B, T)
 * @param value - Number to format
 */
export function formatLargeNumber(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1e12) {
    return `${(value / 1e12).toFixed(2)}T`;
  }
  if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  }
  if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }

  return value.toFixed(2);
}

/**
 * Format market cap with appropriate suffix
 * @param marketCap - Market cap value
 * @param currency - Currency code
 */
export function formatMarketCap(marketCap: number, currency = 'USD'): string {
  const formatted = formatLargeNumber(marketCap);
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${formatted}`;
}

/**
 * Format percentage
 * @param value - Decimal value (0.05 = 5%)
 * @param decimals - Number of decimal places
 * @param includeSign - Include + for positive numbers
 */
export function formatPercent(
  value: number,
  decimals = 2,
  includeSign = false
): string {
  const percent = value * 100;
  const formatted = percent.toFixed(decimals);
  const sign = includeSign && percent > 0 ? '+' : '';
  return `${sign}${formatted}%`;
}

/**
 * Format ratio (for P/E, P/B, etc.)
 * @param value - Ratio value
 * @param decimals - Number of decimal places
 */
export function formatRatio(value: number | null, decimals = 2): string {
  if (value === null || value === undefined || !isFinite(value)) {
    return 'N/A';
  }
  return value.toFixed(decimals);
}

/**
 * Format date
 * @param date - Date to format
 * @param format - Format style
 */
export function formatDate(
  date: Date,
  format: 'short' | 'long' | 'iso' = 'short'
): string {
  if (format === 'iso') {
    return date.toISOString().split('T')[0];
  }

  const options: Intl.DateTimeFormatOptions =
    format === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };

  return date.toLocaleDateString('en-US', options);
}

/**
 * Format datetime
 * @param date - Date to format
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get currency symbol
 * @param currency - Currency code
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    HKD: 'HK$',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    KRW: '₩',
    INR: '₹',
  };

  return symbols[currency.toUpperCase()] || currency;
}

/**
 * Format price change with color indicator
 * @param change - Price change
 * @param changePercent - Percentage change (decimal)
 * @param currency - Currency code
 */
export function formatPriceChange(
  change: number,
  changePercent: number,
  currency = 'USD'
): string {
  const symbol = getCurrencySymbol(currency);
  const sign = change >= 0 ? '+' : '';
  const emoji = change >= 0 ? '🟢' : '🔴';

  return `${emoji} ${sign}${symbol}${change.toFixed(2)} (${formatPercent(changePercent, 2, true)})`;
}

/**
 * Format valuation status with indicator
 * @param status - Valuation status
 */
export function formatValuationStatus(
  status: 'undervalued' | 'fair' | 'overvalued'
): string {
  const indicators: Record<string, string> = {
    undervalued: '🟢 Undervalued',
    fair: '🟡 Fair Value',
    overvalued: '🔴 Overvalued',
  };

  return indicators[status] || status;
}

/**
 * Format moat rating
 * @param rating - Moat rating
 */
export function formatMoatRating(rating: 'none' | 'narrow' | 'wide'): string {
  const ratings: Record<string, string> = {
    none: '❌ No Moat',
    narrow: '🏰 Narrow Moat',
    wide: '🏯 Wide Moat',
  };

  return ratings[rating] || rating;
}

/**
 * Format score as stars
 * @param score - Score (1-5)
 */
export function formatStars(score: number): string {
  const fullStars = Math.floor(score);
  const halfStar = score % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
}

/**
 * Format table row for markdown
 */
export function formatTableRow(...cells: (string | number)[]): string {
  return `| ${cells.map((c) => String(c)).join(' | ')} |`;
}

/**
 * Format table header for markdown
 */
export function formatTableHeader(...headers: string[]): string {
  const headerRow = formatTableRow(...headers);
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
  return `${headerRow}\n${separatorRow}`;
}

/**
 * Generate markdown table
 */
export function generateMarkdownTable(
  headers: string[],
  rows: (string | number)[][]
): string {
  const lines = [formatTableHeader(...headers)];
  for (const row of rows) {
    lines.push(formatTableRow(...row));
  }
  return lines.join('\n');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
