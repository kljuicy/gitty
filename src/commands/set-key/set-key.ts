import type { AIProvider } from '../../types/index';
import { getApiKey, saveApiKey } from '../../config/manager';
import { validateApiKey } from '../../providers';
import { promptWithGracefulExit } from '../../ui/prompts';
import { createSpinner } from '../../ui/spinner';
import {
  showSection,
  showSuccess,
  showHint,
  showSuggestion,
  showGoodbye,
  showError,
} from '../../ui/ui';
import { shouldShowProgress } from '../../utils/environment';

export async function setApiKey(provider?: AIProvider): Promise<void> {
  try {
    showSection("Let's set up your AI API key", '🔑');

    let targetProvider = provider;

    // Prompt for provider if not provided
    if (!targetProvider) {
      const { selectedProvider } = await promptWithGracefulExit<{
        selectedProvider: AIProvider;
      }>([
        {
          type: 'list',
          name: 'selectedProvider',
          message: 'Select your AI provider:',
          choices: [
            { name: 'OpenAI (ChatGPT)', value: 'openai' },
            { name: 'Google Gemini', value: 'gemini' },
          ],
        },
      ]);
      targetProvider = selectedProvider;
    }

    // Check existing API key and prompt for overwrite if needed
    try {
      const existingKey = getApiKey(targetProvider);
      if (existingKey && existingKey.length > 10) {
        // Only prompt if the key looks substantial
        const { overwrite } = await promptWithGracefulExit<{
          overwrite: boolean;
        }>([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'API key already exists. Overwrite?',
            default: false,
          },
        ]);

        if (!overwrite) {
          showHint(`Keeping existing ${targetProvider} API key`);
          return;
        }
      }
    } catch {
      // No existing key found, proceed with setup
    }

    // Prompt for new API key
    const { apiKey } = await promptWithGracefulExit<{ apiKey: string }>([
      {
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${targetProvider} API key:`,
        mask: '*',
        validate: (input: string) =>
          input.trim().length > 0 || 'API key cannot be empty',
      },
    ]);

    // Validate the API key before saving
    let spinner: any = null;
    try {
      spinner = shouldShowProgress() ? await createSpinner() : null;
      if (spinner) {
        spinner.start(`Validating ${targetProvider} API key...`);
      }

      await validateApiKey(targetProvider, apiKey);
      if (spinner) {
        spinner.succeed('API key validated successfully!');
      }
    } catch (error) {
      if (spinner) {
        spinner.fail('API key validation failed');
      }
      showError(
        `Invalid API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return;
    }

    // Save the API key
    saveApiKey(apiKey.trim(), targetProvider);

    showSuccess('API key saved successfully! 🎉');
    showHint(`You can now use gitty with ${targetProvider}`);
    showSuggestion('Try generating a commit:', 'gitty');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes('User force closed') ||
      errorMessage.includes('canceled') ||
      errorMessage.includes('SIGINT')
    ) {
      showGoodbye();
      process.exit(0);
    }

    throw error;
  }
}
