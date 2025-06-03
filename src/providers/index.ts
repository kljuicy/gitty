import { providerRegistry } from './utils/provider-factory';
import { openaiProvider } from './openai/openai-provider';
import { geminiProvider } from './gemini/gemini-provider';
import type { ProviderName } from './utils/provider-configs';
import type { CommitMessage, GenerateCommitOptions } from '../types/index';

// Register all providers
providerRegistry.register('openai', openaiProvider);
providerRegistry.register('gemini', geminiProvider);

/**
 * Unified interface for generating commit messages
 */
export const generateCommitMessages = async (
  providerName: ProviderName,
  options: GenerateCommitOptions
): Promise<CommitMessage[]> => {
  const provider = providerRegistry.get(providerName);
  if (!provider) {
    throw new Error(`Provider '${providerName}' not found`);
  }

  return provider.generateCommitMessages(options);
};

/**
 * Unified interface for validating API keys
 */
export const validateApiKey = async (
  providerName: ProviderName,
  apiKey: string
): Promise<boolean> => {
  const provider = providerRegistry.get(providerName);
  if (!provider) {
    throw new Error(`Provider '${providerName}' not found`);
  }

  return provider.validateApiKey(apiKey);
};

/**
 * Get list of available providers
 */
export const getAvailableProviders = (): ProviderName[] => {
  return providerRegistry.list() as ProviderName[];
};

/**
 * Check if provider is available
 */
export const isProviderAvailable = (
  providerName: string
): providerName is ProviderName => {
  return providerRegistry.has(providerName);
};

// Re-export types and configs for convenience
export type { ProviderName } from './utils/provider-configs';
export {
  getProviderConfig,
  isProviderSupported,
} from './utils/provider-configs';
