/**
 * Provider Registry and Factory
 *
 * Central point for managing data providers.
 * Users can register custom providers here.
 */

import type { DataProvider, ProviderConfig, ProviderFactory } from './types.js';
import { YahooFinanceProvider } from './yahoo-finance.js';
import { AlphaVantageProvider } from './alpha-vantage.js';
import { FinnhubProvider } from './finnhub.js';

// Re-export types and classes
export * from './types.js';
export * from './base.js';
export { YahooFinanceProvider } from './yahoo-finance.js';
export { AlphaVantageProvider } from './alpha-vantage.js';
export { FinnhubProvider } from './finnhub.js';

/**
 * Provider Registry
 *
 * Register new providers by adding them to this map.
 * The key is the provider name used in configuration.
 */
const providerFactories: Map<string, ProviderFactory> = new Map([
  ['yahoo-finance', (config) => new YahooFinanceProvider(config)],
  ['alpha-vantage', (config) => new AlphaVantageProvider(config)],
  ['finnhub', (config) => new FinnhubProvider(config)],
]);

/**
 * Current active provider instance
 */
let currentProvider: DataProvider | null = null;
let currentProviderName = 'yahoo-finance';

/**
 * Register a new provider
 *
 * @param name - Provider identifier
 * @param factory - Factory function to create provider instances
 *
 * @example
 * ```typescript
 * import { registerProvider } from './providers';
 * import { MyCustomProvider } from './my-custom-provider';
 *
 * registerProvider('my-provider', (config) => new MyCustomProvider(config));
 * ```
 */
export function registerProvider(name: string, factory: ProviderFactory): void {
  providerFactories.set(name.toLowerCase(), factory);
}

/**
 * Get list of available provider names
 */
export function getAvailableProviders(): string[] {
  return Array.from(providerFactories.keys());
}

/**
 * Get provider info for all registered providers
 */
export function getProviderInfo(): Array<{
  name: string;
  displayName: string;
  requiresApiKey: boolean;
  isActive: boolean;
}> {
  const providers: Array<{
    name: string;
    displayName: string;
    requiresApiKey: boolean;
    isActive: boolean;
  }> = [];

  for (const [name, factory] of providerFactories) {
    try {
      const instance = factory();
      providers.push({
        name,
        displayName: instance.displayName,
        requiresApiKey: instance.requiresApiKey,
        isActive: name === currentProviderName,
      });
    } catch {
      providers.push({
        name,
        displayName: name,
        requiresApiKey: false,
        isActive: name === currentProviderName,
      });
    }
  }

  return providers;
}

/**
 * Create a provider instance
 *
 * @param name - Provider name (defaults to yahoo-finance)
 * @param config - Provider configuration
 */
export function createProvider(name = 'yahoo-finance', config?: ProviderConfig): DataProvider {
  const factory = providerFactories.get(name.toLowerCase());

  if (!factory) {
    const available = getAvailableProviders().join(', ');
    throw new Error(`Unknown provider: ${name}. Available providers: ${available}`);
  }

  return factory(config);
}

/**
 * Set the active provider
 *
 * @param name - Provider name
 * @param config - Provider configuration
 */
export async function setProvider(name: string, config?: ProviderConfig): Promise<void> {
  const provider = createProvider(name, config);

  // Verify provider is working
  const healthy = await provider.healthCheck();
  if (!healthy) {
    throw new Error(`Provider ${name} health check failed. Check API key and network.`);
  }

  currentProvider = provider;
  currentProviderName = name;
}

/**
 * Get the current active provider
 * Creates default provider if none is set
 */
export function getProvider(): DataProvider {
  if (!currentProvider) {
    currentProvider = createProvider('yahoo-finance');
  }
  return currentProvider;
}

/**
 * Get current provider name
 */
export function getCurrentProviderName(): string {
  return currentProviderName;
}

/**
 * Check if a provider exists
 */
export function hasProvider(name: string): boolean {
  return providerFactories.has(name.toLowerCase());
}
