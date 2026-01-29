/**
 * Input Validation Utilities
 *
 * Validation functions for tool inputs using Zod schemas.
 */

import { z } from 'zod';

/**
 * Ticker symbol schema
 * - 1-10 characters
 * - Alphanumeric with optional dots and hyphens
 */
export const TickerSchema = z
  .string()
  .min(1, 'Ticker is required')
  .max(10, 'Ticker must be 10 characters or less')
  .regex(/^[A-Za-z0-9.-]+$/, 'Ticker must contain only letters, numbers, dots, and hyphens')
  .transform((t) => t.toUpperCase());

/**
 * Years parameter schema
 */
export const YearsSchema = z
  .number()
  .int('Years must be an integer')
  .min(1, 'Years must be at least 1')
  .max(20, 'Years cannot exceed 20')
  .default(5);

/**
 * Discount rate schema (for DCF)
 */
export const DiscountRateSchema = z
  .number()
  .min(0.01, 'Discount rate must be at least 1%')
  .max(0.30, 'Discount rate cannot exceed 30%')
  .default(0.10);

/**
 * Growth rate schema
 */
export const GrowthRateSchema = z
  .number()
  .min(-0.50, 'Growth rate cannot be less than -50%')
  .max(0.50, 'Growth rate cannot exceed 50%')
  .optional();

/**
 * Terminal growth rate schema
 */
export const TerminalGrowthRateSchema = z
  .number()
  .min(0, 'Terminal growth rate cannot be negative')
  .max(0.10, 'Terminal growth rate cannot exceed 10%')
  .default(0.03);

/**
 * Projection years schema
 */
export const ProjectionYearsSchema = z
  .number()
  .int('Projection years must be an integer')
  .min(5, 'Projection years must be at least 5')
  .max(20, 'Projection years cannot exceed 20')
  .default(10);

/**
 * Days parameter schema (for news)
 */
export const DaysSchema = z
  .number()
  .int('Days must be an integer')
  .min(1, 'Days must be at least 1')
  .max(30, 'Days cannot exceed 30')
  .default(7);

/**
 * Limit parameter schema
 */
export const LimitSchema = z
  .number()
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(50, 'Limit cannot exceed 50')
  .default(10);

/**
 * Language schema
 */
export const LanguageSchema = z.enum(['en', 'zh']).default('en');

/**
 * Watchlist action schema
 */
export const WatchlistActionSchema = z.enum([
  'add',
  'remove',
  'list',
  'add_group',
  'remove_group',
  'move_to_group',
]);

/**
 * Alert threshold schema
 */
export const AlertThresholdSchema = z
  .number()
  .min(1, 'Alert threshold must be at least 1%')
  .max(20, 'Alert threshold cannot exceed 20%')
  .default(5);

// ============= Tool Input Schemas =============

/**
 * get_stock_quote input schema
 */
export const GetStockQuoteInputSchema = z.object({
  ticker: TickerSchema,
});

/**
 * get_financials input schema
 */
export const GetFinancialsInputSchema = z.object({
  ticker: TickerSchema,
  years: YearsSchema,
});

/**
 * calculate_intrinsic_value input schema
 */
export const CalculateIntrinsicValueInputSchema = z.object({
  ticker: TickerSchema,
  discountRate: DiscountRateSchema,
  terminalGrowthRate: TerminalGrowthRateSchema,
  projectionYears: ProjectionYearsSchema,
  customGrowthRate: GrowthRateSchema,
});

/**
 * analyze_moat input schema
 */
export const AnalyzeMoatInputSchema = z.object({
  ticker: TickerSchema,
});

/**
 * get_news input schema
 */
export const GetNewsInputSchema = z.object({
  ticker: TickerSchema,
  days: DaysSchema,
  limit: LimitSchema,
});

/**
 * manage_watchlist input schema
 */
export const ManageWatchlistInputSchema = z.object({
  action: WatchlistActionSchema,
  ticker: TickerSchema.optional(),
  group: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * generate_daily_report input schema
 */
export const GenerateDailyReportInputSchema = z.object({
  includeNews: z.boolean().default(true),
  alertThreshold: AlertThresholdSchema,
});

/**
 * generate_stock_report input schema
 */
export const GenerateStockReportInputSchema = z.object({
  ticker: TickerSchema,
  language: LanguageSchema,
});

/**
 * set_provider input schema
 */
export const SetProviderInputSchema = z.object({
  provider: z.string().min(1, 'Provider name is required'),
  apiKey: z.string().optional(),
});

/**
 * Validate tool input and return typed result
 */
export function validateInput<T extends z.ZodType>(
  schema: T,
  input: unknown
): z.infer<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Invalid input: ${errors.join('; ')}`);
  }

  return result.data;
}

/**
 * Check if a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

/**
 * Ensure value is a positive number
 */
export function ensurePositive(value: number, fieldName: string): number {
  if (value <= 0) {
    throw new Error(`${fieldName} must be positive`);
  }
  return value;
}

/**
 * Ensure value is in range
 */
export function ensureInRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): number {
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  return value;
}
