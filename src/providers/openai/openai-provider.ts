import OpenAI from 'openai';
import { createProvider, type AIClient } from '../utils/provider-factory';
import { getProviderConfig } from '../utils/provider-configs';

/**
 * Functional OpenAI client adapter - no classes!
 */
const createOpenAIClientAdapter = (apiKey: string): AIClient => {
  const client = new OpenAI({ apiKey });

  return {
    async generateContent(prompt: string, options: any): Promise<any> {
      return client.chat.completions.create({
        model: options.model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      });
    },

    async validateKey(): Promise<boolean> {
      try {
        await client.models.list();
        return true;
      } catch {
        return false;
      }
    },
  };
};

/**
 * OpenAI provider created with pure functional approach
 */
export const openaiProvider = createProvider(
  getProviderConfig('openai'),

  // Create client function - returns functional adapter
  createOpenAIClientAdapter,

  // Generate content function
  async (client, options, systemPrompt, userPrompt) => {
    const response = await client.generateContent(userPrompt, {
      model: options.model,
      systemPrompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  }

  // No custom validation - use default factory validation
);
