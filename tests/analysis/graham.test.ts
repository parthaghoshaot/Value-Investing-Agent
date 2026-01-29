/**
 * Graham Valuation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateGrahamNumber,
  calculateGrahamGrowthValue,
} from '../../src/analysis/graham.js';

describe('Graham Number', () => {
  it('should calculate correctly with valid inputs', () => {
    // Graham Number = √(22.5 × EPS × Book Value)
    // For EPS = 5 and BVPS = 30:
    // √(22.5 × 5 × 30) = √3375 = 58.09
    const result = calculateGrahamNumber(5, 30);
    expect(result).toBeCloseTo(58.09, 1);
  });

  it('should return 0 for negative EPS', () => {
    const result = calculateGrahamNumber(-5, 30);
    expect(result).toBe(0);
  });

  it('should return 0 for negative book value', () => {
    const result = calculateGrahamNumber(5, -30);
    expect(result).toBe(0);
  });

  it('should return 0 for zero EPS', () => {
    const result = calculateGrahamNumber(0, 30);
    expect(result).toBe(0);
  });

  it('should handle small values', () => {
    const result = calculateGrahamNumber(0.5, 5);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(7.5, 1);
  });
});

describe('Graham Growth Value', () => {
  it('should calculate correctly with valid inputs', () => {
    // V = EPS × (8.5 + 2g) × 4.4 / Y
    // For EPS = 5, g = 10% (0.10), Y = 4% (0.04):
    // V = 5 × (8.5 + 2×10) × 4.4 / 4 = 5 × 28.5 × 1.1 = 156.75
    const result = calculateGrahamGrowthValue(5, 0.10, 0.04);
    expect(result).toBeCloseTo(156.75, 1);
  });

  it('should return null for negative EPS', () => {
    const result = calculateGrahamGrowthValue(-5, 0.10, 0.04);
    expect(result).toBeNull();
  });

  it('should return null for zero bond yield', () => {
    const result = calculateGrahamGrowthValue(5, 0.10, 0);
    expect(result).toBeNull();
  });

  it('should handle zero growth rate', () => {
    // V = EPS × 8.5 × 4.4 / Y
    const result = calculateGrahamGrowthValue(5, 0, 0.04);
    expect(result).toBeCloseTo(46.75, 1);
  });

  it('should return higher value for higher growth', () => {
    const lowGrowth = calculateGrahamGrowthValue(5, 0.05, 0.04);
    const highGrowth = calculateGrahamGrowthValue(5, 0.15, 0.04);

    expect(highGrowth).toBeGreaterThan(lowGrowth!);
  });

  it('should return lower value for higher bond yield', () => {
    const lowYield = calculateGrahamGrowthValue(5, 0.10, 0.03);
    const highYield = calculateGrahamGrowthValue(5, 0.10, 0.05);

    expect(lowYield).toBeGreaterThan(highYield!);
  });
});
