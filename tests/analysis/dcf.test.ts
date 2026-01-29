/**
 * DCF Model Tests
 */

import { describe, it, expect } from 'vitest';
import { calculateDCF } from '../../src/analysis/dcf.js';
import type { Financials, StockQuote } from '../../src/providers/types.js';

// Mock data
const mockFinancials: Financials = {
  ticker: 'TEST',
  incomeStatements: [
    {
      fiscalYear: '2023',
      revenue: 100_000_000,
      costOfRevenue: 40_000_000,
      grossProfit: 60_000_000,
      researchAndDevelopment: 5_000_000,
      sellingGeneralAdmin: 10_000_000,
      operatingIncome: 45_000_000,
      interestExpense: 1_000_000,
      netIncome: 35_000_000,
      eps: 3.50,
      epsDiluted: 3.45,
      ebitda: 50_000_000,
      sharesOutstanding: 10_000_000,
      reportDate: '2023-12-31',
    },
    {
      fiscalYear: '2022',
      revenue: 90_000_000,
      costOfRevenue: 36_000_000,
      grossProfit: 54_000_000,
      researchAndDevelopment: 4_500_000,
      sellingGeneralAdmin: 9_000_000,
      operatingIncome: 40_500_000,
      interestExpense: 1_000_000,
      netIncome: 31_500_000,
      eps: 3.15,
      epsDiluted: 3.10,
      ebitda: 45_000_000,
      sharesOutstanding: 10_000_000,
      reportDate: '2022-12-31',
    },
  ],
  balanceSheets: [
    {
      fiscalYear: '2023',
      totalAssets: 200_000_000,
      currentAssets: 80_000_000,
      cash: 30_000_000,
      shortTermInvestments: 10_000_000,
      accountsReceivable: 20_000_000,
      inventory: 15_000_000,
      totalLiabilities: 80_000_000,
      currentLiabilities: 30_000_000,
      longTermDebt: 40_000_000,
      totalDebt: 50_000_000,
      totalEquity: 120_000_000,
      retainedEarnings: 80_000_000,
      bookValuePerShare: 12.00,
      reportDate: '2023-12-31',
    },
  ],
  cashFlowStatements: [
    {
      fiscalYear: '2023',
      netIncome: 35_000_000,
      depreciation: 5_000_000,
      operatingCashFlow: 42_000_000,
      capitalExpenditure: 7_000_000,
      investingCashFlow: -10_000_000,
      financingCashFlow: -20_000_000,
      freeCashFlow: 35_000_000,
      dividendsPaid: 10_000_000,
      stockRepurchases: 5_000_000,
      reportDate: '2023-12-31',
    },
    {
      fiscalYear: '2022',
      netIncome: 31_500_000,
      depreciation: 4_500_000,
      operatingCashFlow: 38_000_000,
      capitalExpenditure: 6_000_000,
      investingCashFlow: -8_000_000,
      financingCashFlow: -18_000_000,
      freeCashFlow: 32_000_000,
      dividendsPaid: 9_000_000,
      stockRepurchases: 4_000_000,
      reportDate: '2022-12-31',
    },
  ],
  currency: 'USD',
  lastUpdated: new Date(),
};

const mockQuote: StockQuote = {
  ticker: 'TEST',
  name: 'Test Company',
  price: 50.00,
  open: 49.50,
  high: 51.00,
  low: 49.00,
  previousClose: 49.00,
  change: 1.00,
  changePercent: 2.04,
  volume: 1_000_000,
  marketCap: 500_000_000,
  pe: 14.29,
  pb: 4.17,
  ps: 5.00,
  dividendYield: 0.02,
  week52High: 60.00,
  week52Low: 40.00,
  timestamp: new Date(),
  currency: 'USD',
  exchange: 'NASDAQ',
};

describe('DCF Model', () => {
  it('should calculate intrinsic value', () => {
    const result = calculateDCF(mockFinancials, mockQuote, {
      discountRate: 0.10,
      terminalGrowthRate: 0.03,
      projectionYears: 10,
    });

    expect(result.intrinsicValue).toBeGreaterThan(0);
    expect(result.projectedFcf).toHaveLength(10);
    expect(result.terminalValue).toBeGreaterThan(0);
  });

  it('should use custom growth rate when provided', () => {
    const result = calculateDCF(mockFinancials, mockQuote, {
      discountRate: 0.10,
      terminalGrowthRate: 0.03,
      projectionYears: 10,
      customGrowthRate: 0.15,
    });

    expect(result.assumptions.estimatedGrowthRate).toBe(0.15);
  });

  it('should handle negative FCF', () => {
    const negativeFcfFinancials = {
      ...mockFinancials,
      cashFlowStatements: [
        {
          ...mockFinancials.cashFlowStatements[0],
          freeCashFlow: -5_000_000,
          operatingCashFlow: -5_000_000,
        },
      ],
    };

    const result = calculateDCF(negativeFcfFinancials, mockQuote, {
      discountRate: 0.10,
      terminalGrowthRate: 0.03,
      projectionYears: 10,
    });

    expect(result.intrinsicValue).toBe(0);
  });

  it('should cap growth rate at reasonable levels', () => {
    const result = calculateDCF(mockFinancials, mockQuote, {
      discountRate: 0.10,
      terminalGrowthRate: 0.03,
      projectionYears: 10,
      customGrowthRate: 0.50, // 50% - unreasonably high
    });

    expect(result.assumptions.estimatedGrowthRate).toBeLessThanOrEqual(0.25);
  });

  it('should return higher value with lower discount rate', () => {
    const lowDiscount = calculateDCF(mockFinancials, mockQuote, {
      discountRate: 0.08,
      terminalGrowthRate: 0.03,
      projectionYears: 10,
    });

    const highDiscount = calculateDCF(mockFinancials, mockQuote, {
      discountRate: 0.12,
      terminalGrowthRate: 0.03,
      projectionYears: 10,
    });

    expect(lowDiscount.intrinsicValue).toBeGreaterThan(highDiscount.intrinsicValue);
  });
});
