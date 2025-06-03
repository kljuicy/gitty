import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setApiKey } from './set-key';
import type { MockedFunction } from 'vitest';
import type { IInquirer } from '../../__tests__/interfaces';

// Import our centralized test utilities
import { createTestData } from '../../__tests__/test-data';
import { testSigintHandling, setupConsoleSpy } from '../../__tests__/utils';

// 🎯 Type-Safe Mocks: Only define what we actually use!
const mocks = vi.hoisted(() => ({
  inquirer: {
    default: {
      prompt: vi.fn() as MockedFunction<IInquirer['prompt']>,
    } satisfies Partial<IInquirer>,
    prompt: vi.fn() as MockedFunction<IInquirer['prompt']>,
  },
  configManager: {
    getApiKey: vi.fn(),
    saveApiKey: vi.fn(),
  },
  prompts: {
    promptWithGracefulExit: vi.fn(),
  },
  providers: {
    validateOpenAIApiKey: vi.fn(),
    validateGeminiApiKey: vi.fn(),
    validateApiKey: vi.fn(),
  },
  spinner: {
    createSpinner: vi.fn().mockResolvedValue({
      start: vi.fn().mockReturnValue({}),
      succeed: vi.fn().mockReturnValue({}),
      fail: vi.fn().mockReturnValue({}),
      stop: vi.fn(),
    }),
  },
  ui: {
    showSection: vi.fn(),
    showSuccess: vi.fn(),
    showHint: vi.fn(),
    showSuggestion: vi.fn(),
    showGoodbye: vi.fn(),
    showError: vi.fn(),
  },
}));

// Clean vi.mock calls using our hoisted mocks
vi.mock('inquirer', () => mocks.inquirer);
vi.mock('../../config/manager', () => mocks.configManager);
vi.mock('../../ui/prompts', () => mocks.prompts);
vi.mock('../../ui/spinner', () => mocks.spinner);
vi.mock('../../ui/ui', () => mocks.ui);
vi.mock('../../providers/openai/openai-client', () => ({
  validateOpenAIApiKey: mocks.providers.validateOpenAIApiKey,
}));
vi.mock('../../providers/gemini/gemini-client', () => ({
  validateGeminiApiKey: mocks.providers.validateGeminiApiKey,
}));
vi.mock('../../providers', () => ({
  validateApiKey: mocks.providers.validateApiKey,
}));

// Use our clean hoisted mock references
const mockedConfigManager = mocks.configManager;

describe('setApiKey', () => {
  const consoleSpy = setupConsoleSpy();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset spinner mock
    mocks.spinner.createSpinner.mockResolvedValue({
      start: vi.fn().mockReturnValue({}),
      succeed: vi.fn().mockReturnValue({}),
      fail: vi.fn().mockReturnValue({}),
      stop: vi.fn(),
    });
  });

  describe('Provider Selection', () => {
    it('should prompt for provider selection when no provider is specified', async () => {
      // Mock promptWithGracefulExit to return appropriate responses
      mocks.prompts.promptWithGracefulExit
        .mockResolvedValueOnce({
          selectedProvider: createTestData.provider.openai,
        })
        .mockResolvedValueOnce({ apiKey: createTestData.validOpenAIKey });

      mockedConfigManager.getApiKey.mockImplementation(() => {
        throw new Error('No API key found');
      });

      mocks.providers.validateApiKey.mockResolvedValue(true);

      await setApiKey(undefined);

      expect(mocks.prompts.promptWithGracefulExit).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'selectedProvider',
          message: expect.stringContaining('Select your AI provider'),
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'openai' }),
            expect.objectContaining({ value: 'gemini' }),
          ]),
        }),
      ]);
    });

    it('should skip provider selection when provider is specified', async () => {
      mocks.prompts.promptWithGracefulExit.mockResolvedValueOnce({
        apiKey: createTestData.validOpenAIKey,
      });

      mockedConfigManager.getApiKey.mockImplementation(() => {
        throw new Error('No API key found');
      });

      mocks.providers.validateApiKey.mockResolvedValue(true);

      await setApiKey(createTestData.provider.openai);

      // Should only prompt for API key, not provider selection
      expect(mocks.prompts.promptWithGracefulExit).toHaveBeenCalledTimes(1);
      expect(mocks.prompts.promptWithGracefulExit).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'apiKey',
          type: 'password',
        }),
      ]);
    });

    it('should work with gemini provider', async () => {
      mocks.prompts.promptWithGracefulExit.mockResolvedValueOnce({
        apiKey: createTestData.validGeminiKey,
      });

      mockedConfigManager.getApiKey.mockImplementation(() => {
        throw new Error('No API key found');
      });

      mocks.providers.validateApiKey.mockResolvedValue(true);

      await setApiKey(createTestData.provider.gemini);

      expect(mockedConfigManager.saveApiKey).toHaveBeenCalledWith(
        createTestData.validGeminiKey,
        createTestData.provider.gemini
      );
    });
  });

  describe('Existing API Key Handling', () => {
    it('should prompt for overwrite confirmation when API key exists', async () => {
      mockedConfigManager.getApiKey.mockReturnValue(createTestData.existingKey);
      mocks.prompts.promptWithGracefulExit.mockResolvedValueOnce({
        overwrite: false,
      });

      await setApiKey(createTestData.provider.openai);

      expect(mocks.prompts.promptWithGracefulExit).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'overwrite',
          message: expect.stringContaining('API key already exists'),
          default: false,
        }),
      ]);

      expect(mockedConfigManager.saveApiKey).not.toHaveBeenCalled();
    });

    it('should proceed with new key when user confirms overwrite', async () => {
      mockedConfigManager.getApiKey.mockReturnValue(createTestData.existingKey);
      mocks.prompts.promptWithGracefulExit
        .mockResolvedValueOnce({ overwrite: true })
        .mockResolvedValueOnce({ apiKey: createTestData.validOpenAIKey });

      mocks.providers.validateApiKey.mockResolvedValue(true);

      await setApiKey(createTestData.provider.openai);

      expect(mockedConfigManager.saveApiKey).toHaveBeenCalledWith(
        createTestData.validOpenAIKey,
        createTestData.provider.openai
      );
    });

    it('should not prompt for overwrite when existing key is short', async () => {
      mockedConfigManager.getApiKey.mockReturnValue(createTestData.shortKey);
      mocks.prompts.promptWithGracefulExit.mockResolvedValueOnce({
        apiKey: createTestData.validOpenAIKey,
      });

      mocks.providers.validateApiKey.mockResolvedValue(true);

      await setApiKey(createTestData.provider.openai);

      // Should not prompt for overwrite, directly proceed to API key input
      expect(mocks.prompts.promptWithGracefulExit).toHaveBeenCalledTimes(1);
      expect(mockedConfigManager.saveApiKey).toHaveBeenCalledWith(
        createTestData.validOpenAIKey,
        createTestData.provider.openai
      );
    });

    it('should proceed when getApiKey throws an error (no existing key)', async () => {
      mockedConfigManager.getApiKey.mockImplementation(() => {
        throw new Error('No API key found');
      });
      mocks.prompts.promptWithGracefulExit.mockResolvedValueOnce({
        apiKey: createTestData.validOpenAIKey,
      });

      mocks.providers.validateApiKey.mockResolvedValue(true);

      await setApiKey(createTestData.provider.openai);

      expect(mockedConfigManager.saveApiKey).toHaveBeenCalledWith(
        createTestData.validOpenAIKey,
        createTestData.provider.openai
      );
    });
  });

  describe('Saving and Success Messages', () => {
    beforeEach(() => {
      mockedConfigManager.getApiKey.mockImplementation(() => {
        throw new Error('No API key found');
      });
    });

    it('should save API key successfully and show success messages', async () => {
      mocks.prompts.promptWithGracefulExit.mockResolvedValueOnce({
        apiKey: createTestData.validOpenAIKey,
      });

      mocks.providers.validateApiKey.mockResolvedValue(true);

      await setApiKey(createTestData.provider.openai);

      expect(mockedConfigManager.saveApiKey).toHaveBeenCalledWith(
        createTestData.validOpenAIKey,
        createTestData.provider.openai
      );

      // Test that UI functions were called
      expect(mocks.ui.showSection).toHaveBeenCalledWith(
        "Let's set up your AI API key",
        '🔑'
      );
      expect(mocks.ui.showSuccess).toHaveBeenCalledWith(
        'API key saved successfully! 🎉'
      );
      expect(mocks.ui.showHint).toHaveBeenCalledWith(
        'You can now use gitty with openai'
      );
      expect(mocks.ui.showSuggestion).toHaveBeenCalledWith(
        'Try generating a commit:',
        'gitty'
      );
    });

    it('should handle save errors gracefully', async () => {
      mocks.prompts.promptWithGracefulExit.mockResolvedValueOnce({
        apiKey: createTestData.validOpenAIKey,
      });

      mocks.providers.validateApiKey.mockResolvedValue(true);
      mockedConfigManager.saveApiKey.mockImplementation(() => {
        throw new Error('Save failed');
      });

      await expect(setApiKey(createTestData.provider.openai)).rejects.toThrow(
        'Save failed'
      );
    });
  });

  describe('SIGINT Handling', () => {
    it('should show friendly goodbye message on SIGINT during provider selection', async () => {
      mocks.prompts.promptWithGracefulExit.mockRejectedValue(
        new Error('User force closed the prompt with SIGINT')
      );

      try {
        await setApiKey(undefined);
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      // This test might need adjustment based on how SIGINT is handled in set-key
      expect(consoleSpy.processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle other errors normally', async () => {
      const networkError = new Error('Network timeout');
      mocks.prompts.promptWithGracefulExit.mockRejectedValue(networkError);

      await expect(setApiKey(undefined)).rejects.toThrow('Network timeout');
      testSigintHandling.expectNoGracefulExit(
        consoleSpy.consoleLogSpy,
        consoleSpy.processExitSpy
      );
    });
  });
});
