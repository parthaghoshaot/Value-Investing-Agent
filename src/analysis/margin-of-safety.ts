/**
 * Margin of Safety Calculation
 *
 * Core concept from Benjamin Graham's "The Intelligent Investor":
 * "The margin of safety is the difference between the intrinsic value
 * of a stock and its market price."
 *
 * This provides a buffer against errors in analysis and unforeseen events.
 */

import { VALUE_INVESTING_THRESHOLDS } from '../config/defaults.js';

/**
 * Margin of safety result
 */
export interface MarginOfSafetyResult {
  /** Calculated margin of safety (decimal) */
  marginOfSafety: number;
  /** Current price */
  currentPrice: number;
  /** Intrinsic value */
  intrinsicValue: number;
  /** Status based on margin of safety */
  status: 'undervalued' | 'fair' | 'overvalued';
  /** Recommendation */
  recommendation: string;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Calculate margin of safety
 *
 * Margin of Safety = (Intrinsic Value - Current Price) / Intrinsic Value
 *
 * Example:
 * - Intrinsic Value: $100
 * - Current Price: $70
 * - Margin of Safety: ($100 - $70) / $100 = 30%
 *
 * @param currentPrice - Current market price
 * @param intrinsicValue - Calculated intrinsic value
 * @returns Margin of safety calculation result
 */
export function calculateMarginOfSafety(
  currentPrice: number,
  intrinsicValue: number
): MarginOfSafetyResult {
  // Handle edge cases
  if (intrinsicValue <= 0 || currentPrice <= 0) {
    return {
      marginOfSafety: 0,
      currentPrice,
      intrinsicValue,
      status: 'overvalued',
      recommendation: 'Unable to calculate - invalid values',
      riskLevel: 'high',
    };
  }

  // Calculate margin of safety
  const marginOfSafety = (intrinsicValue - currentPrice) / intrinsicValue;

  // Determine status
  let status: 'undervalued' | 'fair' | 'overvalued';
  let recommendation: string;
  let riskLevel: 'low' | 'medium' | 'high';

  const thresholds = VALUE_INVESTING_THRESHOLDS.marginOfSafety;

  if (marginOfSafety >= thresholds.excellent) {
    // > 50% margin of safety
    status = 'undervalued';
    recommendation =
      'Significantly undervalued with excellent margin of safety. ' +
      'Verify there are no fundamental problems causing the low price.';
    riskLevel = 'low';
  } else if (marginOfSafety >= thresholds.good) {
    // 35-50% margin of safety
    status = 'undervalued';
    recommendation =
      'Undervalued with good margin of safety. ' +
      'Consider for purchase if fundamentals are strong.';
    riskLevel = 'low';
  } else if (marginOfSafety >= thresholds.minimum) {
    // 25-35% margin of safety
    status = 'undervalued';
    recommendation =
      'Moderately undervalued with acceptable margin of safety. ' +
      'May be suitable for patient investors.';
    riskLevel = 'medium';
  } else if (marginOfSafety >= 0) {
    // 0-25% margin of safety
    status = 'fair';
    recommendation =
      'Trading near fair value with minimal safety margin. ' +
      'Wait for a better entry point unless you have high conviction.';
    riskLevel = 'medium';
  } else if (marginOfSafety >= -0.25) {
    // 0 to -25% (up to 25% overvalued)
    status = 'overvalued';
    recommendation =
      'Moderately overvalued. Not recommended for value investors. ' +
      'Consider waiting for a price correction.';
    riskLevel = 'high';
  } else {
    // More than 25% overvalued
    status = 'overvalued';
    recommendation =
      'Significantly overvalued. High risk of price decline. ' +
      'Avoid purchase and consider selling if held.';
    riskLevel = 'high';
  }

  return {
    marginOfSafety,
    currentPrice,
    intrinsicValue,
    status,
    recommendation,
    riskLevel,
  };
}

/**
 * Calculate combined margin of safety from multiple valuation methods
 *
 * Takes multiple intrinsic value estimates and calculates:
 * 1. Individual margins of safety
 * 2. Average intrinsic value (conservative)
 * 3. Combined margin of safety
 *
 * @param currentPrice - Current market price
 * @param valuations - Object with valuation method names and values
 */
export function calculateCombinedMarginOfSafety(
  currentPrice: number,
  valuations: Record<string, number | null>
): {
  individual: Record<string, number | null>;
  averageIntrinsicValue: number;
  combinedMarginOfSafety: number;
  status: 'undervalued' | 'fair' | 'overvalued';
  recommendation: string;
} {
  const individual: Record<string, number | null> = {};
  const validValues: number[] = [];

  // Calculate individual margins of safety
  for (const [method, value] of Object.entries(valuations)) {
    if (value !== null && value > 0) {
      individual[method] = (value - currentPrice) / value;
      validValues.push(value);
    } else {
      individual[method] = null;
    }
  }

  // If no valid valuations, return conservative result
  if (validValues.length === 0) {
    return {
      individual,
      averageIntrinsicValue: 0,
      combinedMarginOfSafety: -1,
      status: 'overvalued',
      recommendation: 'Unable to calculate - no valid valuation methods',
    };
  }

  // Use the MINIMUM of all valuation methods for conservatism
  // This follows Graham's principle of being conservative
  const conservativeValue = Math.min(...validValues);

  // Also calculate average for reference
  const averageValue = validValues.reduce((a, b) => a + b, 0) / validValues.length;

  // Use the more conservative value (lower of min and average)
  const intrinsicValue = Math.min(conservativeValue, averageValue);

  // Calculate combined margin of safety
  const combinedMarginOfSafety = (intrinsicValue - currentPrice) / intrinsicValue;

  // Determine status and recommendation
  const result = calculateMarginOfSafety(currentPrice, intrinsicValue);

  return {
    individual,
    averageIntrinsicValue: intrinsicValue,
    combinedMarginOfSafety,
    status: result.status,
    recommendation: result.recommendation,
  };
}

/**
 * Calculate required purchase price for desired margin of safety
 *
 * @param intrinsicValue - Calculated intrinsic value
 * @param desiredMargin - Desired margin of safety (decimal)
 * @returns Maximum purchase price
 */
export function calculateTargetPrice(
  intrinsicValue: number,
  desiredMargin = 0.25
): number {
  if (intrinsicValue <= 0) return 0;

  // Target Price = Intrinsic Value × (1 - Desired Margin)
  return intrinsicValue * (1 - desiredMargin);
}

/**
 * Calculate how much the stock needs to drop for adequate margin of safety
 *
 * @param currentPrice - Current market price
 * @param intrinsicValue - Calculated intrinsic value
 * @param requiredMargin - Required margin of safety (default: 25%)
 */
export function calculateRequiredDrop(
  currentPrice: number,
  intrinsicValue: number,
  requiredMargin = 0.25
): { targetPrice: number; percentDrop: number; isAlreadyAdequate: boolean } {
  const targetPrice = calculateTargetPrice(intrinsicValue, requiredMargin);
  const percentDrop = (currentPrice - targetPrice) / currentPrice;
  const isAlreadyAdequate = currentPrice <= targetPrice;

  return {
    targetPrice,
    percentDrop,
    isAlreadyAdequate,
  };
}

/**
 * Format margin of safety for display
 *
 * @param marginOfSafety - Margin of safety (decimal)
 * @returns Formatted string with emoji indicator
 */
export function formatMarginOfSafety(marginOfSafety: number): string {
  const percent = (marginOfSafety * 100).toFixed(1);

  if (marginOfSafety >= 0.50) {
    return `🟢 ${percent}% (Excellent)`;
  } else if (marginOfSafety >= 0.35) {
    return `🟢 ${percent}% (Good)`;
  } else if (marginOfSafety >= 0.25) {
    return `🟡 ${percent}% (Acceptable)`;
  } else if (marginOfSafety >= 0) {
    return `🟡 ${percent}% (Low)`;
  } else {
    return `🔴 ${percent}% (Overvalued)`;
  }
}
