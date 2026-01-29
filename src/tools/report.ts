/**
 * Report Generation Tools
 *
 * Generates daily summaries and deep analysis reports.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getProvider } from '../providers/index.js';
import {
  validateInput,
  GenerateDailyReportInputSchema,
  GenerateStockReportInputSchema,
} from '../utils/validators.js';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  formatDateTime,
  formatMarketCap,
  formatRatio,
  formatValuationStatus,
  formatMoatRating,
  formatStars,
  generateMarkdownTable,
} from '../utils/formatters.js';
import { loadWatchlist, loadConfig, getDataDir } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import { calculateFinancialRatios } from '../analysis/ratios.js';
import { calculateDCF } from '../analysis/dcf.js';
import { calculateGrahamValuation } from '../analysis/graham.js';
import { calculateMarginOfSafety, formatMarginOfSafety } from '../analysis/margin-of-safety.js';
import { analyzeMoat } from '../analysis/moat-scorer.js';
import type { StockQuote, Financials, CompanyProfile, NewsItem } from '../providers/types.js';

const logger = createLogger('report');

/**
 * Tool definitions for MCP
 */
export const generateDailyReportDefinition: Tool = {
  name: 'generate_daily_report',
  description:
    'Generate a daily summary report for all stocks in your watchlist. ' +
    'Includes price changes, alerts for big movers, and news highlights.',
  inputSchema: {
    type: 'object',
    properties: {
      includeNews: {
        type: 'boolean',
        description: 'Include news highlights (default: true)',
        default: true,
      },
      alertThreshold: {
        type: 'number',
        description: 'Alert threshold for big movers in % (default: 5)',
        default: 5,
      },
    },
  },
};

export const generateStockReportDefinition: Tool = {
  name: 'generate_stock_report',
  description:
    'Generate a comprehensive value investing analysis report for a single stock. ' +
    'Includes company overview, financial health, intrinsic value, moat analysis, and investment recommendation.',
  inputSchema: {
    type: 'object',
    properties: {
      ticker: {
        type: 'string',
        description: 'Stock ticker symbol (e.g., AAPL, MSFT)',
      },
      language: {
        type: 'string',
        enum: ['en', 'zh'],
        description: 'Report language (default: en)',
        default: 'en',
      },
    },
    required: ['ticker'],
  },
};

/**
 * Generate daily report handler
 */
export async function generateDailyReport(
  args: Record<string, unknown>
): Promise<string> {
  const input = validateInput(GenerateDailyReportInputSchema, args);
  const { includeNews, alertThreshold } = input;

  logger.info('Generating daily report');

  const watchlist = loadWatchlist();

  if (watchlist.stocks.length === 0) {
    return `
# Daily Watchlist Report

📋 Your watchlist is empty. Add stocks using the \`manage_watchlist\` tool.
`.trim();
  }

  const provider = getProvider();
  const today = new Date();

  // Fetch quotes for all stocks
  const quotePromises = watchlist.stocks.map((stock) =>
    provider.getQuote(stock.ticker).catch((err) => {
      logger.warn(`Failed to fetch quote for ${stock.ticker}`, err);
      return null;
    })
  );

  const quotes = await Promise.all(quotePromises);

  // Build report data
  const stockData: Array<{
    ticker: string;
    name: string;
    group: string;
    quote: StockQuote | null;
  }> = watchlist.stocks.map((stock, i) => ({
    ticker: stock.ticker,
    name: stock.name,
    group: stock.group,
    quote: quotes[i],
  }));

  // Filter successful quotes
  const validStocks = stockData.filter((s) => s.quote !== null);

  // Identify alerts
  const bigMovers = validStocks
    .filter((s) => Math.abs(s.quote!.changePercent) >= alertThreshold)
    .sort((a, b) => Math.abs(b.quote!.changePercent) - Math.abs(a.quote!.changePercent));

  const near52WeekLow = validStocks
    .filter((s) => {
      const distanceFromLow = ((s.quote!.price - s.quote!.week52Low) / s.quote!.week52Low) * 100;
      return distanceFromLow <= 10;
    })
    .sort((a, b) => {
      const distA = ((a.quote!.price - a.quote!.week52Low) / a.quote!.week52Low);
      const distB = ((b.quote!.price - b.quote!.week52Low) / b.quote!.week52Low);
      return distA - distB;
    });

  // Build report
  let report = `# Daily Watchlist Report\n\n`;
  report += `📅 **Date:** ${formatDate(today, 'long')}\n`;
  report += `📊 **Stocks tracked:** ${validStocks.length} of ${watchlist.stocks.length}\n\n`;

  // Alerts section
  if (bigMovers.length > 0 || near52WeekLow.length > 0) {
    report += `## ⚠️ Alerts\n\n`;

    if (bigMovers.length > 0) {
      report += `### Big Movers (>${alertThreshold}% change)\n\n`;
      for (const stock of bigMovers) {
        const emoji = stock.quote!.changePercent >= 0 ? '🟢' : '🔴';
        report += `- ${emoji} **${stock.ticker}**: ${formatPercent(stock.quote!.changePercent / 100, 2, true)}\n`;
      }
      report += '\n';
    }

    if (near52WeekLow.length > 0) {
      report += `### Near 52-Week Low (potential opportunities)\n\n`;
      for (const stock of near52WeekLow) {
        const distanceFromLow = ((stock.quote!.price - stock.quote!.week52Low) / stock.quote!.week52Low) * 100;
        report += `- 📉 **${stock.ticker}**: ${distanceFromLow.toFixed(1)}% above 52-week low\n`;
      }
      report += '\n';
    }
  }

  // Price summary table
  report += `## 📈 Price Summary\n\n`;

  const headers = ['Ticker', 'Price', 'Change', 'Volume', 'P/E', '52W Range'];
  const rows = validStocks.map((stock) => {
    const q = stock.quote!;
    const rangePosition = ((q.price - q.week52Low) / (q.week52High - q.week52Low) * 100).toFixed(0);
    return [
      stock.ticker,
      formatCurrency(q.price, q.currency),
      formatPercent(q.changePercent / 100, 2, true),
      (q.volume / 1e6).toFixed(2) + 'M',
      formatRatio(q.pe),
      `${rangePosition}%`,
    ];
  });

  report += generateMarkdownTable(headers, rows);

  // Group breakdown
  const groupCounts: Record<string, number> = {};
  for (const stock of validStocks) {
    groupCounts[stock.group] = (groupCounts[stock.group] || 0) + 1;
  }

  report += `\n\n## 📂 By Group\n\n`;
  for (const [groupId, count] of Object.entries(groupCounts)) {
    const group = watchlist.groups.find((g) => g.id === groupId);
    report += `- **${group?.name || groupId}:** ${count} stock(s)\n`;
  }

  // News section (if enabled)
  if (includeNews) {
    report += `\n\n## 📰 News Highlights\n\n`;
    report += `*News fetching requires separate API calls. Use \`get_news\` for individual stocks.*\n`;
  }

  // Footer
  report += `\n\n---\n\n`;
  report += `*Generated at: ${formatDateTime(today)}*\n`;
  report += `*Data source: ${provider.displayName}*\n\n`;
  report += `⚠️ **Disclaimer:** This report is for educational purposes only and does not constitute investment advice.`;

  return report;
}

/**
 * Generate comprehensive stock report handler
 */
export async function generateStockReport(
  args: Record<string, unknown>
): Promise<string> {
  const input = validateInput(GenerateStockReportInputSchema, args);
  const { ticker, language } = input;

  logger.info(`Generating stock report for: ${ticker} (${language})`);

  const provider = getProvider();
  const config = loadConfig();

  // Fetch all required data in parallel
  const [quote, financials, profile] = await Promise.all([
    provider.getQuote(ticker),
    provider.getFinancials(ticker, 5),
    provider.getCompanyProfile(ticker),
  ]);

  // Perform analysis
  const ratios = calculateFinancialRatios(financials, quote);
  const dcfResult = calculateDCF(financials, quote, {
    discountRate: config.analysis.discountRate,
    terminalGrowthRate: config.analysis.terminalGrowthRate,
    projectionYears: config.analysis.projectionYears,
  });
  const grahamResult = calculateGrahamValuation(financials, quote, config.analysis.riskFreeRate);
  const moatAnalysis = analyzeMoat(financials, quote, profile);
  const dcfMargin = calculateMarginOfSafety(quote.price, dcfResult.intrinsicValue);
  const grahamMargin = calculateMarginOfSafety(quote.price, grahamResult.grahamNumber);

  // Build report
  const reportDate = new Date();
  const currency = quote.currency;

  // Use appropriate language
  const labels = language === 'zh' ? LABELS_ZH : LABELS_EN;

  let report = `# ${labels.title}: ${quote.name} (${ticker})\n\n`;
  report += `📅 ${labels.date}: ${formatDate(reportDate, 'long')}\n`;
  report += `💹 ${labels.currentPrice}: ${formatCurrency(quote.price, currency)}\n`;
  report += `📊 ${labels.marketCap}: ${formatMarketCap(quote.marketCap, currency)}\n\n`;

  // Executive Summary
  report += `## ${labels.executiveSummary}\n\n`;
  report += generateExecutiveSummary(quote, dcfResult, grahamResult, moatAnalysis, labels);

  // Company Overview
  report += `\n## ${labels.companyOverview}\n\n`;
  report += `**${labels.sector}:** ${profile.sector}\n`;
  report += `**${labels.industry}:** ${profile.industry}\n`;
  report += `**${labels.employees}:** ${profile.employees?.toLocaleString() || 'N/A'}\n`;
  report += `**${labels.country}:** ${profile.country}\n\n`;
  report += `${profile.description}\n`;

  // Economic Moat
  report += `\n## ${labels.economicMoat}\n\n`;
  report += `**${labels.moatRating}:** ${formatMoatRating(moatAnalysis.moatRating)}\n`;
  report += `**${labels.moatScore}:** ${formatStars(moatAnalysis.overallScore)} (${moatAnalysis.overallScore.toFixed(1)}/5)\n`;
  report += `**${labels.durability}:** ${moatAnalysis.durability.assessment}\n\n`;

  // Financial Health
  report += `\n## ${labels.financialHealth}\n\n`;

  report += `### ${labels.profitability}\n`;
  report += `- ${labels.grossMargin}: ${formatPercent(ratios.grossMargin)}\n`;
  report += `- ${labels.operatingMargin}: ${formatPercent(ratios.operatingMargin)}\n`;
  report += `- ${labels.netMargin}: ${formatPercent(ratios.netMargin)}\n`;
  report += `- ROE: ${formatPercent(ratios.roe)}\n`;
  report += `- ROA: ${formatPercent(ratios.roa)}\n`;

  report += `\n### ${labels.financialSafety}\n`;
  report += `- ${labels.currentRatio}: ${ratios.currentRatio.toFixed(2)}\n`;
  report += `- ${labels.debtToEquity}: ${ratios.debtToEquity.toFixed(2)}\n`;
  report += `- ${labels.interestCoverage}: ${ratios.interestCoverage?.toFixed(1) || 'N/A'}x\n`;

  report += `\n### ${labels.cashFlow}\n`;
  report += `- ${labels.fcfYield}: ${ratios.fcfYield ? formatPercent(ratios.fcfYield) : 'N/A'}\n`;
  report += `- ${labels.cashConversion}: ${ratios.cashConversion ? formatPercent(ratios.cashConversion) : 'N/A'}\n`;

  // Intrinsic Value
  report += `\n## ${labels.intrinsicValue}\n\n`;
  report += `| ${labels.method} | ${labels.value} | ${labels.marginOfSafety} |\n`;
  report += `| --- | --- | --- |\n`;
  report += `| DCF | ${formatCurrency(dcfResult.intrinsicValue, currency)} | ${formatMarginOfSafety(dcfMargin.marginOfSafety)} |\n`;
  report += `| Graham Number | ${formatCurrency(grahamResult.grahamNumber, currency)} | ${formatMarginOfSafety(grahamMargin.marginOfSafety)} |\n`;

  // Valuation Assessment
  report += `\n## ${labels.valuationAssessment}\n\n`;
  report += `${formatValuationStatus(dcfMargin.status)}\n\n`;
  report += `${dcfMargin.recommendation}\n`;

  // Risk Factors
  report += `\n## ${labels.riskFactors}\n\n`;
  report += generateRiskFactors(ratios, moatAnalysis, labels);

  // Conclusion
  report += `\n## ${labels.conclusion}\n\n`;
  report += generateConclusion(quote, dcfResult, grahamResult, moatAnalysis, dcfMargin, labels);

  // Disclaimer
  report += `\n---\n\n`;
  report += `⚠️ **${labels.disclaimer}**\n\n`;
  report += labels.disclaimerText;

  report += `\n\n---\n*${labels.generatedAt}: ${formatDateTime(reportDate)}*\n`;
  report += `*${labels.dataSource}: ${provider.displayName}*`;

  return report;
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(
  quote: StockQuote,
  dcf: ReturnType<typeof calculateDCF>,
  graham: ReturnType<typeof calculateGrahamValuation>,
  moat: ReturnType<typeof analyzeMoat>,
  labels: typeof LABELS_EN
): string {
  const avgValue = (dcf.intrinsicValue + graham.grahamNumber) / 2;
  const upside = ((avgValue - quote.price) / quote.price) * 100;
  const status = upside > 25 ? 'undervalued' : upside > 0 ? 'fair' : 'overvalued';

  return `
- ${labels.valuationStatus}: **${formatValuationStatus(status)}**
- ${labels.avgIntrinsicValue}: **${formatCurrency(avgValue, quote.currency)}** (${upside > 0 ? '+' : ''}${upside.toFixed(1)}% ${labels.upside})
- ${labels.moatRating}: **${formatMoatRating(moat.moatRating)}**
- ${labels.defenderCriteria}: ${graham.passesDefensiveCriteria ? '✅ ' + labels.passed : '❌ ' + labels.notPassed}
`.trim();
}

/**
 * Generate risk factors
 */
function generateRiskFactors(
  ratios: ReturnType<typeof calculateFinancialRatios>,
  moat: ReturnType<typeof analyzeMoat>,
  labels: typeof LABELS_EN
): string {
  const risks: string[] = [];

  if (ratios.debtToEquity > 1.5) {
    risks.push(`- ${labels.highDebt}: ${ratios.debtToEquity.toFixed(2)}x`);
  }
  if (ratios.currentRatio < 1.0) {
    risks.push(`- ${labels.lowLiquidity}: ${ratios.currentRatio.toFixed(2)}`);
  }
  if (moat.moatRating === 'none') {
    risks.push(`- ${labels.noMoat}`);
  }
  if (moat.durability.assessment === 'weak') {
    risks.push(`- ${labels.weakDurability}`);
  }
  if (ratios.grossMargin < 0.25) {
    risks.push(`- ${labels.lowMargins}`);
  }

  return risks.length > 0 ? risks.join('\n') : `- ${labels.noMajorRisks}`;
}

/**
 * Generate conclusion
 */
function generateConclusion(
  quote: StockQuote,
  dcf: ReturnType<typeof calculateDCF>,
  graham: ReturnType<typeof calculateGrahamValuation>,
  moat: ReturnType<typeof analyzeMoat>,
  margin: ReturnType<typeof calculateMarginOfSafety>,
  labels: typeof LABELS_EN
): string {
  if (moat.moatRating === 'wide' && margin.marginOfSafety >= 0.25) {
    return labels.strongBuy;
  }
  if (moat.moatRating !== 'none' && margin.marginOfSafety >= 0.15) {
    return labels.consider;
  }
  if (margin.marginOfSafety < 0) {
    return labels.avoid;
  }
  return labels.hold;
}

// English labels
const LABELS_EN = {
  title: 'Value Investing Analysis',
  date: 'Report Date',
  currentPrice: 'Current Price',
  marketCap: 'Market Cap',
  executiveSummary: 'Executive Summary',
  companyOverview: 'Company Overview',
  sector: 'Sector',
  industry: 'Industry',
  employees: 'Employees',
  country: 'Country',
  economicMoat: 'Economic Moat Analysis',
  moatRating: 'Moat Rating',
  moatScore: 'Moat Score',
  durability: 'Durability',
  financialHealth: 'Financial Health',
  profitability: 'Profitability',
  grossMargin: 'Gross Margin',
  operatingMargin: 'Operating Margin',
  netMargin: 'Net Margin',
  financialSafety: 'Financial Safety',
  currentRatio: 'Current Ratio',
  debtToEquity: 'Debt to Equity',
  interestCoverage: 'Interest Coverage',
  cashFlow: 'Cash Flow Quality',
  fcfYield: 'FCF Yield',
  cashConversion: 'Cash Conversion',
  intrinsicValue: 'Intrinsic Value Estimation',
  method: 'Method',
  value: 'Value',
  marginOfSafety: 'Margin of Safety',
  valuationAssessment: 'Valuation Assessment',
  riskFactors: 'Risk Factors',
  conclusion: 'Value Investing Conclusion',
  disclaimer: 'Disclaimer',
  disclaimerText: 'This analysis is for educational and research purposes only. It does not constitute investment advice. Investing involves risks, including the possible loss of principal. Always conduct your own due diligence.',
  generatedAt: 'Generated at',
  dataSource: 'Data source',
  valuationStatus: 'Valuation',
  avgIntrinsicValue: 'Average Intrinsic Value',
  upside: 'upside',
  defenderCriteria: 'Graham Defensive Criteria',
  passed: 'Passed',
  notPassed: 'Not Passed',
  highDebt: 'High debt levels',
  lowLiquidity: 'Low liquidity (current ratio)',
  noMoat: 'No clear competitive advantage',
  weakDurability: 'Competitive advantages may not be durable',
  lowMargins: 'Low profit margins',
  noMajorRisks: 'No major red flags identified',
  strongBuy: 'Strong candidate for value investors. Wide moat with significant margin of safety.',
  consider: 'Worth considering. Has some competitive advantages with reasonable valuation.',
  avoid: 'Currently overvalued. Wait for better entry point.',
  hold: 'Hold or watch. Not a clear buy at current prices.',
};

// Chinese labels
const LABELS_ZH = {
  title: '价值投资分析报告',
  date: '报告日期',
  currentPrice: '当前价格',
  marketCap: '市值',
  executiveSummary: '执行摘要',
  companyOverview: '公司概况',
  sector: '行业板块',
  industry: '细分行业',
  employees: '员工人数',
  country: '国家',
  economicMoat: '经济护城河分析',
  moatRating: '护城河评级',
  moatScore: '护城河评分',
  durability: '持久性',
  financialHealth: '财务健康度',
  profitability: '盈利能力',
  grossMargin: '毛利率',
  operatingMargin: '营业利润率',
  netMargin: '净利率',
  financialSafety: '财务安全性',
  currentRatio: '流动比率',
  debtToEquity: '负债权益比',
  interestCoverage: '利息覆盖率',
  cashFlow: '现金流质量',
  fcfYield: '自由现金流收益率',
  cashConversion: '现金转换率',
  intrinsicValue: '内在价值估算',
  method: '估值方法',
  value: '估值',
  marginOfSafety: '安全边际',
  valuationAssessment: '估值评估',
  riskFactors: '风险因素',
  conclusion: '价值投资结论',
  disclaimer: '免责声明',
  disclaimerText: '本分析报告仅供教育和研究目的，不构成任何投资建议。投资有风险，入市需谨慎。请始终进行自己的尽职调查。',
  generatedAt: '生成时间',
  dataSource: '数据来源',
  valuationStatus: '估值状态',
  avgIntrinsicValue: '平均内在价值',
  upside: '上涨空间',
  defenderCriteria: '格雷厄姆防御性标准',
  passed: '通过',
  notPassed: '未通过',
  highDebt: '债务水平较高',
  lowLiquidity: '流动性较低（流动比率）',
  noMoat: '无明显竞争优势',
  weakDurability: '竞争优势可能不持久',
  lowMargins: '利润率较低',
  noMajorRisks: '未发现重大风险信号',
  strongBuy: '价值投资者的优质标的。拥有宽护城河和显著安全边际。',
  consider: '值得关注。具有一定竞争优势，估值合理。',
  avoid: '当前估值偏高。建议等待更好的买入时机。',
  hold: '持有观望。当前价格不是明显的买入机会。',
};
