import type { ProviderConfig } from './provider-factory';

/**
 * Centralized provider configurations for supported providers
 */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    maxDiffLength: 4000,
  },

  gemini: {
    name: 'Gemini',
    defaultModel: 'gemini-1.5-flash',
    maxDiffLength: 6000,
  },
} as const;

/**
 * Provider name type safety
 */
export type ProviderName = keyof typeof PROVIDER_CONFIGS;

/**
 * Get provider config by name
 */
export const getProviderConfig = (name: ProviderName): ProviderConfig => {
  const config = PROVIDER_CONFIGS[name];
  if (!config) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return config;
};

/**
 * List all available provider names
 */
export const getAvailableProviders = (): ProviderName[] => {
  return Object.keys(PROVIDER_CONFIGS) as ProviderName[];
};

/**
 * Check if provider is supported
 */
export const isProviderSupported = (name: string): name is ProviderName => {
  return name in PROVIDER_CONFIGS;
};
