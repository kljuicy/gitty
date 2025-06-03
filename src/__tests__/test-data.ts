/* istanbul ignore file */
/**
 * Test data factories - consistent test data across all tests
 */
export const createTestData = {
  validOpenAIKey: 'sk-test123456789012345',
  validGeminiKey: 'gemini-api-key-123456789',
  shortKey: 'short',
  existingKey: 'existing-key-12345',

  provider: {
    openai: 'openai' as const,
    gemini: 'gemini' as const,
  },

  gittyConfig: () => ({
    defaultProvider: 'openai' as const,
    providers: {
      openai: {
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
      },
      gemini: {
        apiKey: 'test-key',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 2048,
      },
    },
    default: {
      prepend: '',
      style: 'concise' as const,
      temperature: 0.7,
      maxTokens: 500,
      language: 'en' as const,
    },
    presets: {},
  }),

  localConfig: () => ({
    defaultProvider: 'gemini' as const,
    preset: 'work' as const,
    style: 'detailed' as const,
  }),

  files: {
    validConfig: () => JSON.stringify(createTestData.gittyConfig(), null, 2),
    invalidJson: () => '{ invalid json content',
    emptyConfig: () => '{}',
    gittyrcLocal: () => JSON.stringify(createTestData.localConfig(), null, 2),
  },
} as const;
