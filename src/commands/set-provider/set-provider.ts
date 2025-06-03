import type { AIProvider } from '../../types/index';
import {
  getGlobalConfig,
  setDefaultProvider,
  getApiKey,
} from '../../config/manager';
import { getProviderDisplayName } from '../../utils/providers';
import { promptWithGracefulExit } from '../../ui/prompts';
import { showSection, showSuccess, showConfigLine } from '../../ui/ui';
import { helpApiKeySetup } from '../../ui/error-help';

export async function setProvider(): Promise<void> {
  showSection("Let's set your default AI provider", '🤖');

  const currentProvider = getGlobalConfig().defaultProvider;

  const { selectedProvider } = await promptWithGracefulExit<{
    selectedProvider: AIProvider;
  }>([
    {
      type: 'list',
      name: 'selectedProvider',
      message: 'Select your default AI provider:',
      choices: [
        {
          name: `OpenAI (ChatGPT)${currentProvider === 'openai' ? ' ← current' : ''}`,
          value: 'openai',
        },
        {
          name: `Google Gemini${currentProvider === 'gemini' ? ' ← current' : ''}`,
          value: 'gemini',
        },
      ],
    },
  ]);

  setDefaultProvider(selectedProvider);

  showSuccess('Default provider updated successfully! 🎉');
  showConfigLine(
    'New default provider',
    getProviderDisplayName(selectedProvider)
  );

  await checkApiKeys(selectedProvider);
}

async function checkApiKeys(provider: AIProvider): Promise<void> {
  try {
    getApiKey(provider);
    showSuccess(`API key configured for ${provider}`);
  } catch {
    showConfigLine('API key status', `No API key found for ${provider}`);
    helpApiKeySetup(provider);
  }

  // Check for the other provider too
  const otherProvider: AIProvider = provider === 'openai' ? 'gemini' : 'openai';
  try {
    getApiKey(otherProvider);
    showSuccess(`API key also configured for ${otherProvider}`);
  } catch {
    showConfigLine('API key status', `No API key found for ${otherProvider}`);
    helpApiKeySetup(otherProvider);
  }
}
