import { GoogleGenerativeAI } from '@google/generative-ai';
import { createProvider, type AIClient } from '../utils/provider-factory';
import { getProviderConfig } from '../utils/provider-configs';

/**
 * Functional Gemini client adapter - no classes!
 */
const createGeminiClientAdapter = (apiKey: string): AIClient => {
  const client = new GoogleGenerativeAI(apiKey);

  return {
    async generateContent(prompt: string, options: any): Promise<any> {
      const genModel = client.getGenerativeModel({
        model: options.model || 'gemini-1.5-flash',
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
        },
      });

      const result = await genModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    },

    async validateKey(): Promise<boolean> {
      try {
        const genModel = client.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });
        await genModel.generateContent('Hello');
        return true;
      } catch {
        return false;
      }
    },
  };
};

/**
 * Gemini provider created with pure functional approach
 */
export const geminiProvider = createProvider(
  getProviderConfig('gemini'),

  // Create client function - returns functional adapter
  createGeminiClientAdapter,

  // Generate content function
  async (client, options, systemPrompt, userPrompt) => {
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    return await client.generateContent(combinedPrompt, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });
  }

  // No custom validation - use default factory validation
);
