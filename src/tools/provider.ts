/**
 * Provider Management Tools
 *
 * Tools for switching and listing data providers.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  setProvider,
  getProvider,
  getProviderInfo,
  hasProvider,
  getCurrentProviderName,
} from '../providers/index.js';
import { validateInput, SetProviderInputSchema } from '../utils/validators.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('provider');

/**
 * Tool definitions for MCP
 */
export const setProviderDefinition: Tool = {
  name: 'set_provider',
  description:
    'Switch to a different data provider. Available providers: yahoo-finance (default, free), ' +
    'alpha-vantage (requires API key). Custom providers can be added.',
  inputSchema: {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        description: 'Provider name (e.g., yahoo-finance, alpha-vantage)',
      },
      apiKey: {
        type: 'string',
        description: 'API key (if required by the provider)',
      },
    },
    required: ['provider'],
  },
};

export const listProvidersDefinition: Tool = {
  name: 'list_providers',
  description: 'List all available data providers and their status.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

/**
 * Set provider handler
 */
export async function setProviderTool(
  args: Record<string, unknown>
): Promise<string> {
  const input = validateInput(SetProviderInputSchema, args);
  const { provider: providerName, apiKey } = input;

  logger.info(`Switching to provider: ${providerName}`);

  // Check if provider exists
  if (!hasProvider(providerName)) {
    const available = getProviderInfo()
      .map((p) => p.name)
      .join(', ');
    return `❌ Unknown provider: "${providerName}"\n\nAvailable providers: ${available}`;
  }

  try {
    await setProvider(providerName, {
      name: providerName,
      apiKey,
    });

    const newProvider = getProvider();

    let response = `✅ Switched to **${newProvider.displayName}**\n\n`;
    response += `**Provider:** ${newProvider.name}\n`;
    response += `**Requires API Key:** ${newProvider.requiresApiKey ? 'Yes' : 'No'}\n`;

    if (newProvider.requiresApiKey && !apiKey) {
      response += `\n⚠️ **Warning:** This provider requires an API key. Some features may not work.`;
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to switch provider`, error);
    return `❌ Failed to switch to "${providerName}": ${message}`;
  }
}

/**
 * List providers handler
 */
export async function listProviders(): Promise<string> {
  logger.info('Listing providers');

  const providers = getProviderInfo();
  const currentName = getCurrentProviderName();

  let output = `# Available Data Providers\n\n`;
  output += `**Current Provider:** ${currentName}\n\n`;

  output += `| Provider | Display Name | API Key Required | Status |\n`;
  output += `| --- | --- | --- | --- |\n`;

  for (const provider of providers) {
    const activeIndicator = provider.isActive ? '✅ Active' : '';
    output += `| ${provider.name} | ${provider.displayName} | ${provider.requiresApiKey ? 'Yes' : 'No'} | ${activeIndicator} |\n`;
  }

  output += `\n## Adding Custom Providers\n\n`;
  output += `To add a custom data provider:\n\n`;
  output += `1. Copy \`src/providers/provider-template.ts\` as a starting point\n`;
  output += `2. Implement the required methods for your data source\n`;
  output += `3. Register the provider in \`src/providers/index.ts\`\n`;
  output += `4. Use \`set_provider\` to switch to your custom provider\n`;

  output += `\n## Provider Details\n\n`;

  output += `### yahoo-finance (Default)\n`;
  output += `- **Description:** Uses the yahoo-finance2 npm package\n`;
  output += `- **API Key:** Not required\n`;
  output += `- **Rate Limits:** Yes (use caching for best results)\n`;
  output += `- **Data:** Quotes, financials, profiles, historical prices\n\n`;

  output += `### alpha-vantage\n`;
  output += `- **Description:** Alpha Vantage financial data API\n`;
  output += `- **API Key:** Required (free tier available)\n`;
  output += `- **Rate Limits:** 5 calls/minute (free), higher for premium\n`;
  output += `- **Get Key:** https://www.alphavantage.co/support/#api-key\n`;

  return output;
}
