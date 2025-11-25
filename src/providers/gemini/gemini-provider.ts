import { GoogleGenAI } from '@google/genai';
import { createProvider, type AIClient } from '../utils/provider-factory';
import { getProviderConfig } from '../utils/provider-configs';

/**
 * Functional Gemini client adapter - no classes!
 */
const createGeminiClientAdapter = (apiKey: string): AIClient => {
  const client = new GoogleGenAI({ apiKey });

  return {
    async generateContent(prompt: string, options: any): Promise<any> {
      const response = await client.models.generateContent({
        model: options.model || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: options.systemPrompt,
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
        },
      });

      return response.text || '';
    },

    async validateKey(): Promise<boolean> {
      try {
        await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'Hello',
        });
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
    return await client.generateContent(userPrompt, {
      model: options.model,
      systemPrompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });
  }

  // No custom validation - use default factory validation
);
