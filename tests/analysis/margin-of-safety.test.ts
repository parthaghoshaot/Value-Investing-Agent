/**
 * Margin of Safety Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMarginOfSafety,
  calculateTargetPrice,
  calculateRequiredDrop,
} from '../../src/analysis/margin-of-safety.js';

describe('Margin of Safety Calculation', () => {
  it('should calculate positive margin of safety', () => {
    // Intrinsic value: $100, Current price: $70
    // Margin = (100 - 70) / 100 = 30%
    const result = calculateMarginOfSafety(70, 100);

    expect(result.marginOfSafety).toBeCloseTo(0.30, 2);
    expect(result.status).toBe('undervalued');
  });

  it('should identify overvalued stock', () => {
    // Intrinsic value: $100, Current price: $130
    // Margin = (100 - 130) / 100 = -30%
    const result = calculateMarginOfSafety(130, 100);

    expect(result.marginOfSafety).toBeCloseTo(-0.30, 2);
    expect(result.status).toBe('overvalued');
  });

  it('should identify fair value', () => {
    // Intrinsic value: $100, Current price: $90
    // Margin = 10% (between 0 and 25%)
    const result = calculateMarginOfSafety(90, 100);

    expect(result.marginOfSafety).toBeCloseTo(0.10, 2);
    expect(result.status).toBe('fair');
  });

  it('should handle zero intrinsic value', () => {
    const result = calculateMarginOfSafety(50, 0);

    expect(result.marginOfSafety).toBe(0);
    expect(result.status).toBe('overvalued');
  });

  it('should handle zero current price', () => {
    const result = calculateMarginOfSafety(0, 100);

    expect(result.marginOfSafety).toBe(0);
    expect(result.status).toBe('overvalued');
  });

  it('should provide appropriate risk level', () => {
    // Excellent margin (>50%)
    expect(calculateMarginOfSafety(40, 100).riskLevel).toBe('low');

    // Good margin (25-50%)
    expect(calculateMarginOfSafety(60, 100).riskLevel).toBe('low');

    // Low margin (0-25%)
    expect(calculateMarginOfSafety(90, 100).riskLevel).toBe('medium');

    // Overvalued
    expect(calculateMarginOfSafety(150, 100).riskLevel).toBe('high');
  });
});

describe('Target Price Calculation', () => {
  it('should calculate target price for 25% margin', () => {
    // Intrinsic value: $100, Desired margin: 25%
    // Target = 100 × (1 - 0.25) = $75
    const target = calculateTargetPrice(100, 0.25);

    expect(target).toBe(75);
  });

  it('should calculate target price for 50% margin', () => {
    const target = calculateTargetPrice(100, 0.50);

    expect(target).toBe(50);
  });

  it('should use default 25% margin', () => {
    const target = calculateTargetPrice(100);

    expect(target).toBe(75);
  });

  it('should handle zero intrinsic value', () => {
    const target = calculateTargetPrice(0, 0.25);

    expect(target).toBe(0);
  });
});

describe('Required Drop Calculation', () => {
  it('should calculate required price drop', () => {
    // Current: $100, Intrinsic: $100, Required margin: 25%
    // Target: $75, Drop: 25%
    const result = calculateRequiredDrop(100, 100, 0.25);

    expect(result.targetPrice).toBe(75);
    expect(result.percentDrop).toBeCloseTo(0.25, 2);
    expect(result.isAlreadyAdequate).toBe(false);
  });

  it('should identify already adequate margin', () => {
    // Current: $60, Intrinsic: $100, Required margin: 25%
    // Target: $75, Current price is below target
    const result = calculateRequiredDrop(60, 100, 0.25);

    expect(result.isAlreadyAdequate).toBe(true);
  });

  it('should handle overvalued stock', () => {
    // Current: $150, Intrinsic: $100
    // Needs to drop significantly
    const result = calculateRequiredDrop(150, 100, 0.25);

    expect(result.percentDrop).toBeCloseTo(0.50, 2); // 50% drop needed
    expect(result.isAlreadyAdequate).toBe(false);
  });
});
