import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setProvider } from './set-provider';
import { createTestData } from '../../__tests__/test-data';
import { promptWithGracefulExit } from '../../ui/prompts';
import type { MockedFunction } from 'vitest';

// Import our centralized test utilities
import { setupMockCleanup } from '../../__tests__/utils';

// 🎯 Type-Safe Hoisted Mocks: Only define what we actually use!
const mocks = vi.hoisted(() => ({
  prompts: {
    promptWithGracefulExit: vi.fn() as MockedFunction<
      typeof promptWithGracefulExit
    >,
  },
  configManager: {
    getGlobalConfig: vi.fn(),
    setDefaultProvider: vi.fn(),
    getApiKey: vi.fn(),
  },
}));

// Apply hoisted mocks
vi.mock('../../ui/prompts.js', () => mocks.prompts);
vi.mock('../../config/manager', () => mocks.configManager);

const mockedPromptWithGracefulExit = vi.mocked(promptWithGracefulExit);

describe('Set Provider Command', () => {
  setupMockCleanup();

  beforeEach(() => {
    // Setup ConfigManager with our test data
    mocks.configManager.getGlobalConfig.mockReturnValue(
      createTestData.gittyConfig()
    );

    // Default to having API keys configured
    mocks.configManager.getApiKey.mockImplementation(provider => {
      return provider === createTestData.provider.openai
        ? createTestData.validOpenAIKey
        : createTestData.validGeminiKey;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Selection', () => {
    it('should successfully set provider when selected', async () => {
      mockedPromptWithGracefulExit.mockResolvedValue({
        selectedProvider: createTestData.provider.gemini,
      });

      await setProvider();

      expect(mocks.configManager.setDefaultProvider).toHaveBeenCalledWith(
        createTestData.provider.gemini
      );
    });

    it('should work with OpenAI provider', async () => {
      mockedPromptWithGracefulExit.mockResolvedValue({
        selectedProvider: createTestData.provider.openai,
      });

      await setProvider();

      expect(mocks.configManager.setDefaultProvider).toHaveBeenCalledWith(
        createTestData.provider.openai
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle prompt errors gracefully', async () => {
      const error = new Error('Selection failed');
      mockedPromptWithGracefulExit.mockRejectedValue(error);

      await expect(setProvider()).rejects.toThrow('Selection failed');
    });

    it('should handle ConfigManager errors', async () => {
      mockedPromptWithGracefulExit.mockResolvedValue({
        selectedProvider: createTestData.provider.gemini,
      });

      mocks.configManager.setDefaultProvider.mockImplementation(() => {
        throw new Error('Failed to save provider');
      });

      await expect(setProvider()).rejects.toThrow('Failed to save provider');
    });
  });
});
