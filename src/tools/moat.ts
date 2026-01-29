/**
 * Economic Moat Analysis Tool
 *
 * Analyzes a company's competitive advantages based on Warren Buffett's principles.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getProvider } from '../providers/index.js';
import { validateInput, AnalyzeMoatInputSchema } from '../utils/validators.js';
import { formatStars, formatMoatRating, formatPercent } from '../utils/formatters.js';
import { financialsCache, quoteCache, profileCache, createCacheKey } from '../utils/cache.js';
import { createLogger } from '../utils/logger.js';
import { analyzeMoat as analyzeCompanyMoat } from '../analysis/moat-scorer.js';
import type { Financials, StockQuote, CompanyProfile } from '../providers/types.js';
import type { MoatAnalysis } from '../types/index.js';

const logger = createLogger('moat');

/**
 * Tool definition for MCP
 */
export const analyzeMoatDefinition: Tool = {
  name: 'analyze_moat',
  description:
    'Analyze a company\'s economic moat (competitive advantage) based on Warren Buffett\'s principles. ' +
    'Evaluates brand power, cost advantages, network effects, switching costs, and economies of scale.',
  inputSchema: {
    type: 'object',
    properties: {
      ticker: {
        type: 'string',
        description: 'Stock ticker symbol (e.g., AAPL, MSFT)',
      },
    },
    required: ['ticker'],
  },
};

/**
 * Format dimension analysis
 */
function formatDimension(
  name: string,
  dimension: {
    score: number;
    evidence: string[];
    metrics: Record<string, number | null>;
  }
): string {
  const stars = formatStars(dimension.score);

  let output = `### ${name} ${stars} (${dimension.score.toFixed(1)}/5)\n\n`;

  // Add evidence
  if (dimension.evidence.length > 0) {
    output += '**Evidence:**\n';
    for (const item of dimension.evidence) {
      output += `- ${item}\n`;
    }
    output += '\n';
  }

  // Add key metrics
  const metricEntries = Object.entries(dimension.metrics).filter(([_, v]) => v !== null);
  if (metricEntries.length > 0) {
    output += '**Key Metrics:**\n';
    for (const [key, value] of metricEntries) {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
      output += `- ${formattedKey}: ${formatMetricValue(key, value as number)}\n`;
    }
  }

  return output;
}

/**
 * Format metric value based on metric type
 */
function formatMetricValue(key: string, value: number): string {
  if (key.includes('Margin') || key.includes('Growth') || key.includes('Stability')) {
    return formatPercent(value);
  }
  if (key.includes('marketCap')) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (key.includes('perEmployee')) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(2);
}

/**
 * Format moat analysis for output
 */
function formatMoatOutput(analysis: MoatAnalysis): string {
  const { dimensions, durability } = analysis;

  // Build moat type description
  const strongDimensions = Object.entries(dimensions)
    .filter(([_, dim]) => dim.score >= 3.5)
    .map(([name]) => name.replace(/([A-Z])/g, ' $1').trim());

  const moatTypes = strongDimensions.length > 0
    ? strongDimensions.join(', ')
    : 'No clear moat identified';

  const output = `
# Economic Moat Analysis: ${analysis.companyName} (${analysis.ticker})

## Moat Summary

${formatMoatRating(analysis.moatRating)}

**Overall Score:** ${formatStars(analysis.overallScore)} (${analysis.overallScore.toFixed(1)}/5)

**Primary Moat Sources:** ${moatTypes}

**Durability Assessment:** ${durability.assessment.toUpperCase()} (${durability.score.toFixed(1)}/5)

---

## Warren Buffett's Perspective

> "The key to investing is not assessing how much an industry is going to affect society, or how much it will grow, but rather determining the competitive advantage of any given company and, above all, the durability of that advantage."

---

## Moat Dimensions

${formatDimension('🏷️ Brand Power (Intangible Assets)', dimensions.brandPower)}

${formatDimension('💰 Cost Advantage', dimensions.costAdvantage)}

${formatDimension('🔗 Network Effect', dimensions.networkEffect)}

${formatDimension('🔒 Switching Costs', dimensions.switchingCosts)}

${formatDimension('📈 Economies of Scale', dimensions.scaleEconomies)}

---

## Moat Durability Analysis

**Assessment:** ${durability.assessment.charAt(0).toUpperCase() + durability.assessment.slice(1)}
**Durability Score:** ${formatStars(durability.score)} (${durability.score.toFixed(1)}/5)

**Factors:**
${durability.factors.map((f) => `- ${f}`).join('\n')}

---

## Investment Implications

${getMoatImplications(analysis)}

---

*Analyzed at: ${analysis.analyzedAt.toLocaleString()}*
*Data source: ${getProvider().displayName}*

⚠️ **Disclaimer:** This analysis is for educational purposes only. Moat analysis requires qualitative judgment that may not be fully captured by quantitative metrics.
`;

  return output.trim();
}

/**
 * Get investment implications based on moat analysis
 */
function getMoatImplications(analysis: MoatAnalysis): string {
  const { moatRating, durability, overallScore } = analysis;

  if (moatRating === 'wide' && durability.assessment === 'strong') {
    return `
**Strong Investment Candidate** 🟢

This company appears to have a wide and durable economic moat. According to value investing principles:
- Wide moat companies can maintain high returns on capital for extended periods
- Price volatility may present buying opportunities
- Consider at fair or undervalued prices with a margin of safety

> "A truly great business must have an enduring 'moat' that protects excellent returns on invested capital." - Warren Buffett
`;
  }

  if (moatRating === 'wide' || (moatRating === 'narrow' && durability.assessment !== 'weak')) {
    return `
**Potential Investment Candidate** 🟡

This company has competitive advantages that may provide some protection:
- Monitor moat sources for signs of erosion
- Requires larger margin of safety than wide-moat companies
- Consider the competitive dynamics in the industry

> "The most important thing in valuation is to identify the sources of durable competitive advantage." - Warren Buffett
`;
  }

  if (moatRating === 'narrow') {
    return `
**Exercise Caution** 🟡

The company's competitive advantages appear limited:
- Returns on capital may normalize over time
- Competition may erode current advantages
- Requires deep discount to intrinsic value to compensate for risk
- Monitor closely for competitive deterioration
`;
  }

  return `
**Not a Clear Moat Company** 🔴

Based on available financial data, this company does not display clear competitive advantages:
- May be a commodity business with limited pricing power
- Returns on capital likely to be average or below
- Requires very significant margin of safety if investing
- Consider whether industry dynamics could improve

> "When a management team with a reputation for brilliance tackles a business with a reputation for bad economics, it is the reputation of the business that remains intact." - Warren Buffett
`;
}

/**
 * Analyze moat handler
 */
export async function analyzeMoat(
  args: Record<string, unknown>
): Promise<string> {
  // Validate input
  const input = validateInput(AnalyzeMoatInputSchema, args);
  const { ticker } = input;

  logger.info(`Analyzing moat for: ${ticker}`);

  const provider = getProvider();

  // Check cache
  const quoteCacheKey = createCacheKey('quote', ticker);
  const financialsCacheKey = createCacheKey('financials', ticker, 5);
  const profileCacheKey = createCacheKey('profile', ticker);

  let quote = quoteCache.get(quoteCacheKey) as StockQuote | undefined;
  let financials = financialsCache.get(financialsCacheKey) as Financials | undefined;
  let profile = profileCache.get(profileCacheKey) as CompanyProfile | undefined;

  // Fetch missing data in parallel
  const fetchPromises: Promise<unknown>[] = [];

  if (!quote) {
    fetchPromises.push(
      provider.getQuote(ticker).then((q) => {
        quote = q;
        quoteCache.set(quoteCacheKey, q);
      })
    );
  }

  if (!financials) {
    fetchPromises.push(
      provider.getFinancials(ticker, 5).then((f) => {
        financials = f;
        financialsCache.set(financialsCacheKey, f);
      })
    );
  }

  if (!profile) {
    fetchPromises.push(
      provider.getCompanyProfile(ticker).then((p) => {
        profile = p;
        profileCache.set(profileCacheKey, p);
      })
    );
  }

  await Promise.all(fetchPromises);

  // Perform moat analysis
  const analysis = analyzeCompanyMoat(financials!, quote!, profile!);

  return formatMoatOutput(analysis);
}
