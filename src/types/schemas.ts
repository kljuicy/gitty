import { z } from 'zod';

export const OpenAIConfigSchema = z.object({
  apiKey: z.string().default(''),
  model: z.string().default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(500),
});

export const GeminiConfigSchema = z.object({
  apiKey: z.string().default(''),
  model: z.string().default('gemini-1.5-flash'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8192).default(2048),
});

export const ProviderConfigSchema = z.object({
  openai: OpenAIConfigSchema.default({}),
  gemini: GeminiConfigSchema.default({}),
});

export const GittyConfigSchema = z.object({
  defaultProvider: z.enum(['openai', 'gemini']).default('openai'),
  providers: ProviderConfigSchema.default({}),
  default: z
    .object({
      prepend: z.string().default(''),
      style: z.enum(['concise', 'detailed', 'funny']).default('concise'),
      language: z.string().default('en'),
    })
    .default({}),
  presets: z
    .record(
      z.string(),
      z.object({
        prepend: z.string().default(''),
        style: z.enum(['concise', 'detailed', 'funny']).default('concise'),
        language: z.string().default('en'),
        defaultProvider: z.enum(['openai', 'gemini']).optional(),
        providers: z
          .object({
            openai: OpenAIConfigSchema.partial().optional(),
            gemini: GeminiConfigSchema.partial().optional(),
          })
          .optional(),
      })
    )
    .default({}),
});

export const LocalConfigSchema = z.object({
  preset: z.string().optional(),
  prepend: z.string().optional(),
  style: z.enum(['concise', 'detailed', 'funny']).optional(),
  language: z.string().optional(),
  defaultProvider: z.enum(['openai', 'gemini']).optional(),
  providers: z
    .object({
      openai: OpenAIConfigSchema.partial().optional(),
      gemini: GeminiConfigSchema.partial().optional(),
    })
    .optional(),
});
