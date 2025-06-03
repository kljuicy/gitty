import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptWithGracefulExit } from './prompts';
import type { MockedFunction } from 'vitest';
import type { IInquirer } from '../__tests__/interfaces';

// Import our centralized test utilities
import { createTestData } from '../__tests__/test-data';
import { testSigintHandling, setupConsoleSpy } from '../__tests__/utils';

const mocks = vi.hoisted(() => ({
  inquirer: {
    default: {
      prompt: vi.fn() as MockedFunction<IInquirer['prompt']>,
    },
  },
  ui: {
    showGoodbye: vi.fn().mockImplementation(() => {
      console.log('Oh! OK - See you soon! 🐥');
    }),
  },
}));

vi.mock('inquirer', () => mocks.inquirer);
vi.mock('./ui', () => mocks.ui);

describe('Prompts', () => {
  const consoleSpy = setupConsoleSpy();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('promptWithGracefulExit', () => {
    it('should return prompt result on success', async () => {
      const mockResponse = { provider: createTestData.provider.openai };
      mocks.inquirer.default.prompt.mockResolvedValue(mockResponse);

      const promptConfig = [
        {
          type: 'list',
          name: 'provider',
          message: 'Select provider:',
          choices: [
            createTestData.provider.openai,
            createTestData.provider.gemini,
          ],
        },
      ];

      const result = await promptWithGracefulExit(promptConfig);

      expect(mocks.inquirer.default.prompt).toHaveBeenCalledWith(promptConfig);
      expect(result).toEqual(mockResponse);
    });

    it('should handle SIGINT errors gracefully', async () => {
      mocks.inquirer.default.prompt.mockRejectedValue(
        new Error('User force closed the prompt with SIGINT')
      );

      const promptConfig = [
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter API key:',
        },
      ];

      try {
        await promptWithGracefulExit(promptConfig);
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      // Check that showGoodbye was called, which will call console.log with the goodbye message
      expect(mocks.ui.showGoodbye).toHaveBeenCalled();
      expect(consoleSpy.processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle different SIGINT error messages', async () => {
      const sigintMessages = [
        'User force closed the prompt with SIGINT',
        'Prompt was canceled',
        'SIGINT received',
        'force closed the prompt',
      ];

      for (const message of sigintMessages) {
        vi.clearAllMocks();
        mocks.inquirer.default.prompt.mockRejectedValue(new Error(message));

        try {
          await promptWithGracefulExit([
            { type: 'input', name: 'test', message: 'Test:' },
          ]);
        } catch (error: any) {
          expect(error.message).toBe('process.exit called');
        }

        expect(mocks.ui.showGoodbye).toHaveBeenCalled();
        expect(consoleSpy.processExitSpy).toHaveBeenCalledWith(0);
      }
    });

    it('should re-throw non-SIGINT errors', async () => {
      const networkError = new Error('Network timeout');
      mocks.inquirer.default.prompt.mockRejectedValue(networkError);

      const promptConfig = [
        {
          type: 'input',
          name: 'test',
          message: 'Test input:',
        },
      ];

      await expect(promptWithGracefulExit(promptConfig)).rejects.toThrow(
        'Network timeout'
      );

      // Should NOT show goodbye message for non-SIGINT errors
      testSigintHandling.expectNoGracefulExit(
        consoleSpy.consoleLogSpy,
        consoleSpy.processExitSpy
      );
    });

    it('should handle complex prompt configurations', async () => {
      const mockResponse = {
        provider: createTestData.provider.gemini,
        confirm: true,
        apiKey: createTestData.validGeminiKey,
      };
      mocks.inquirer.default.prompt.mockResolvedValue(mockResponse);

      const complexPromptConfig = [
        {
          type: 'list',
          name: 'provider',
          message: 'Select AI provider:',
          choices: [
            { name: 'OpenAI', value: createTestData.provider.openai },
            { name: 'Google Gemini', value: createTestData.provider.gemini },
          ],
        },
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure?',
          default: true,
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter API key:',
          mask: '*',
        },
      ];

      const result = await promptWithGracefulExit(complexPromptConfig);

      expect(mocks.inquirer.default.prompt).toHaveBeenCalledWith(
        complexPromptConfig
      );
      expect(result).toEqual(mockResponse);
      expect(result.provider).toBe(createTestData.provider.gemini);
      expect(result.confirm).toBe(true);
      expect(result.apiKey).toBe(createTestData.validGeminiKey);
    });

    it('should work with typed responses', async () => {
      interface ProviderResponse {
        provider: string;
        model: string;
      }

      const mockResponse: ProviderResponse = {
        provider: createTestData.provider.openai,
        model: 'gpt-4o-mini',
      };
      mocks.inquirer.default.prompt.mockResolvedValue(mockResponse);

      const promptConfig = [
        {
          type: 'list',
          name: 'provider',
          message: 'Select provider:',
          choices: [createTestData.provider.openai],
        },
        {
          type: 'list',
          name: 'model',
          message: 'Select model:',
          choices: ['gpt-4o-mini', 'gpt-4o'],
        },
      ];

      const result =
        await promptWithGracefulExit<ProviderResponse>(promptConfig);

      expect(result).toEqual(mockResponse);
      expect(result.provider).toBe(createTestData.provider.openai);
      expect(result.model).toBe('gpt-4o-mini');
    });

    it('should handle empty prompt configurations', async () => {
      mocks.inquirer.default.prompt.mockResolvedValue({});

      const result = await promptWithGracefulExit([]);

      expect(mocks.inquirer.default.prompt).toHaveBeenCalledWith([]);
      expect(result).toEqual({});
    });

    it("should handle validation errors that aren't SIGINT", async () => {
      const validationError = new Error('Invalid input provided');
      mocks.inquirer.default.prompt.mockRejectedValue(validationError);

      await expect(
        promptWithGracefulExit([
          {
            type: 'input',
            name: 'value',
            message: 'Enter value:',
            validate: (input: string) => input.length > 0 || 'Required',
          },
        ])
      ).rejects.toThrow('Invalid input provided');

      // Should not trigger SIGINT handling
      testSigintHandling.expectNoGracefulExit(
        consoleSpy.consoleLogSpy,
        consoleSpy.processExitSpy
      );
    });
  });

  describe('Integration with Real Command Scenarios', () => {
    it('should work with setApiKey prompt patterns', async () => {
      const mockResponse = {
        selectedProvider: createTestData.provider.openai,
        apiKey: createTestData.validOpenAIKey,
      };
      mocks.inquirer.default.prompt.mockResolvedValue(mockResponse);

      const setApiKeyPrompts = [
        {
          type: 'list',
          name: 'selectedProvider',
          message: 'Which AI provider would you like to configure?',
          choices: [
            {
              name: 'OpenAI (GPT-4, GPT-3.5)',
              value: createTestData.provider.openai,
            },
            {
              name: 'Google Gemini',
              value: createTestData.provider.gemini,
            },
          ],
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter your API key:',
          mask: '*',
        },
      ];

      const result = await promptWithGracefulExit(setApiKeyPrompts);

      expect(result.selectedProvider).toBe(createTestData.provider.openai);
      expect(result.apiKey).toBe(createTestData.validOpenAIKey);
    });

    it('should work with setProvider prompt patterns', async () => {
      const mockResponse = {
        provider: createTestData.provider.gemini,
      };
      mocks.inquirer.default.prompt.mockResolvedValue(mockResponse);

      const setProviderPrompts = [
        {
          type: 'list',
          name: 'provider',
          message: 'Select your default AI provider:',
          choices: [
            { name: 'OpenAI', value: createTestData.provider.openai },
            { name: 'Google Gemini', value: createTestData.provider.gemini },
          ],
        },
      ];

      const result = await promptWithGracefulExit(setProviderPrompts);

      expect(result.provider).toBe(createTestData.provider.gemini);
    });

    it('should work with menu choice patterns', async () => {
      const mockResponse = { action: 0 };
      mocks.inquirer.default.prompt.mockResolvedValue(mockResponse);

      const menuPrompts = [
        {
          type: 'list',
          name: 'action',
          message: 'Select a commit message:',
          choices: [
            { name: '[90%] feat: add user authentication', value: 0 },
            { name: '[85%] feat: implement login system', value: 1 },
            { name: '✏️  Edit selected message', value: 'edit' },
            { name: '❌ Cancel commit', value: 'quit' },
          ],
        },
      ];

      const result = await promptWithGracefulExit(menuPrompts);

      expect(result.action).toBe(0);
    });
  });

  describe('Error Message Pattern Recognition', () => {
    it('should recognize case-insensitive SIGINT patterns', async () => {
      const sigintVariations = [
        'user force closed the prompt with sigint',
        'PROMPT WAS CANCELED',
        'Force Closed',
        'SIGINT RECEIVED',
      ];

      for (const message of sigintVariations) {
        vi.clearAllMocks();
        mocks.inquirer.default.prompt.mockRejectedValue(new Error(message));

        try {
          await promptWithGracefulExit([
            { type: 'input', name: 'test', message: 'Test:' },
          ]);
        } catch (error: any) {
          expect(error.message).toBe('process.exit called');
        }

        expect(mocks.ui.showGoodbye).toHaveBeenCalled();
        expect(consoleSpy.processExitSpy).toHaveBeenCalledWith(0);
      }
    });

    it('should not trigger SIGINT handling for similar but different errors', async () => {
      const nonSigintErrors = [
        'Network timeout failed', // Network error, no SIGINT keywords
        'Cancelled by user', // Similar to "canceled" but different spelling
        'Force restart required', // Contains "Force" but not "force closed"
        'Signal INT received', // Similar to SIGINT but different
        'Connection error', // Completely different error
      ];

      for (const message of nonSigintErrors) {
        vi.clearAllMocks();
        mocks.inquirer.default.prompt.mockRejectedValue(new Error(message));

        await expect(
          promptWithGracefulExit([
            { type: 'input', name: 'test', message: 'Test:' },
          ])
        ).rejects.toThrow(message);

        // Should NOT trigger SIGINT handling
        testSigintHandling.expectNoGracefulExit(
          consoleSpy.consoleLogSpy,
          consoleSpy.processExitSpy
        );
      }
    });
  });
});
