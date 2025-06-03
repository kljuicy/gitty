import type { CommitMessage, GenerateCommitOptions } from '../../types/index';
import type { BaseAIFunctions } from '../base-client';
import { baseAIFunctions } from '../base-client';
import { withRetry } from '../utils/retry-strategy';

/**
 * Provider configuration for different AI services
 */
export interface ProviderConfig {
  name: string;
  defaultModel: string;
  maxDiffLength: number;
  apiKeyValidator?: (key: string) => Promise<boolean>;
}

/**
 * Generic AI client interface - providers should implement this shape
 */
export interface AIClient {
  generateContent(prompt: string, options: any): Promise<any>;
  validateKey?(apiKey: string): Promise<boolean>;
}

/**
 * Functional provider interface
 */
export interface AIProvider {
  config: ProviderConfig;
  generateCommitMessages(
    options: GenerateCommitOptions,
    client?: AIClient,
    baseFunctions?: BaseAIFunctions
  ): Promise<CommitMessage[]>;
  validateApiKey(apiKey: string, client?: AIClient): Promise<boolean>;
}

/**
 * Provider creation factory - reduces boilerplate for new providers
 */
export function createProvider(
  config: ProviderConfig,
  createClient: (apiKey: string) => AIClient,
  generateContent: (
    client: AIClient,
    options: GenerateCommitOptions,
    systemPrompt: string,
    userPrompt: string
  ) => Promise<string>,
  validateClient?: (client: AIClient, apiKey: string) => Promise<boolean>
): AIProvider {
  return {
    config,

    async generateCommitMessages(
      options: GenerateCommitOptions,
      client?: AIClient,
      baseFunctions: BaseAIFunctions = baseAIFunctions
    ): Promise<CommitMessage[]> {
      const actualClient = client || createClient(options.apiKey || '');
      const { diff, style, language, prepend, temperature } = options;

      const systemPrompt = baseFunctions.buildSystemPrompt(
        style,
        language,
        prepend
      );
      const userPrompt = baseFunctions.buildUserPrompt(
        diff,
        config.maxDiffLength
      );

      return withRetry(
        async (attempt, retryTemperature) => {
          const content = await generateContent(
            actualClient,
            { ...options, temperature: retryTemperature },
            systemPrompt,
            userPrompt
          );

          if (!content) throw new Error(`No response from ${config.name}`);

          const messages = baseFunctions.parseResponse(content, prepend);
          if (messages.length > 0) return messages;

          // Return fallback on final attempt
          if (attempt === 3) {
            return [
              {
                message: baseFunctions.formatMessage(
                  'Update code and documentation',
                  prepend
                ),
                confidence: 0.5,
              },
            ];
          }

          throw new Error('Empty response, retrying...');
        },
        { baseTemperature: temperature }
      );
    },

    async validateApiKey(apiKey: string, client?: AIClient): Promise<boolean> {
      try {
        const actualClient = client || createClient(apiKey);
        if (validateClient) {
          return await validateClient(actualClient, apiKey);
        }
        // Default validation - try a simple request
        await generateContent(
          actualClient,
          {
            model: config.defaultModel,
            temperature: 0.1,
          } as GenerateCommitOptions,
          'Test',
          'Hello'
        );
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Functional provider registry
 */
interface ProviderRegistry {
  providers: Map<string, AIProvider>;
  register: (name: string, provider: AIProvider) => void;
  get: (name: string) => AIProvider | undefined;
  list: () => string[];
  has: (name: string) => boolean;
}

export const createProviderRegistry = (): ProviderRegistry => {
  const providers = new Map<string, AIProvider>();

  return {
    providers,
    register: (name: string, provider: AIProvider) =>
      providers.set(name, provider),
    get: (name: string) => providers.get(name),
    list: () => Array.from(providers.keys()),
    has: (name: string) => providers.has(name),
  };
};

// Global registry instance
export const providerRegistry = createProviderRegistry();
