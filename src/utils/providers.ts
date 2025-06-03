import type { AIProvider } from '../types/index';

/**
 * Get human-readable display name for AI provider
 */
export function getProviderDisplayName(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'gemini':
      return 'Google Gemini';
    default:
      return provider;
  }
}
