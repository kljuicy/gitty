import { showSuggestion, showHint } from './ui';

/**
 * Show help for API key setup
 */
export function helpApiKeySetup(provider: string): void {
  showSuggestion(
    'Set up your API key:',
    `gitty --set-key --provider ${provider}`
  );
}

/**
 * Show help for provider setup
 */
export function helpProviderSetup(): void {
  showSuggestion('Configure your provider:', 'gitty --set-provider');
}

/**
 * Show general help
 */
export function helpGeneral(): void {
  showSuggestion('For help:', 'gitty --help');
}

/**
 * Show git repository setup help
 */
export function helpGitSetup(): void {
  showSuggestion('Initialize a git repository:', 'git init');
  showSuggestion('Check git status:', 'git status');
}

/**
 * Show preset setup help
 */
export function helpPresetSetup(): void {
  showHint('Edit ~/.gitty/config.json to add presets');
}

/**
 * Comprehensive error recovery based on error type
 */
export function helpForError(
  errorType: 'api-key' | 'provider' | 'git' | 'config' | 'general',
  provider?: string
): void {
  switch (errorType) {
    case 'api-key':
      if (provider) helpApiKeySetup(provider);
      break;
    case 'provider':
      helpProviderSetup();
      break;
    case 'git':
      helpGitSetup();
      break;
    case 'config':
      helpPresetSetup();
      break;
    case 'general':
    default:
      helpGeneral();
      break;
  }
}
