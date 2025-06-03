import {
  showValidationError,
  showError,
  showWarning,
  showHint,
  showSuggestion,
} from '../ui/ui';
import type { AIProvider, CommitStyle } from '../types/index';

/**
 * Validate temperature parameter (0-2 range)
 */
export function validateTemperature(value: string): number {
  const temp = parseFloat(value);

  if (isNaN(temp)) {
    showValidationError(`Temperature must be a number, got "${value}"`);
    showHint('Try --temperature 0.7 (controls AI creativity)');
    process.exit(1);
  }

  if (temp < 0 || temp > 2) {
    showValidationError(`Temperature must be between 0 and 2, got ${temp}`);
    showHint(
      'Lower values (0-0.5) = more focused, higher values (1-2) = more creative'
    );
    process.exit(1);
  }

  return temp;
}

/**
 * Validate maxTokens parameter (positive integer)
 */
export function validateMaxTokens(value: string): number {
  const tokens = parseInt(value);

  if (isNaN(tokens)) {
    showValidationError(`Max tokens must be a number, got "${value}"`);
    showHint('Try --max-tokens 1000 (limits response length)');
    process.exit(1);
  }

  if (tokens <= 0) {
    showValidationError(`Max tokens must be positive, got ${tokens}`);
    showHint('Try --max-tokens 500 (typical range: 100-4096)');
    process.exit(1);
  }

  if (tokens > 100000) {
    showValidationError(`Max tokens too large (${tokens}), maximum is 100,000`);
    showHint('Most providers support 2048-4096 tokens');
    process.exit(1);
  }

  return tokens;
}

/**
 * Validate AI provider with smart suggestions
 */
export function validateProvider(value: string): AIProvider {
  const validProviders: AIProvider[] = ['openai', 'gemini'];

  if (!validProviders.includes(value as AIProvider)) {
    const suggestions: Record<string, string | null> = {
      gpt: 'openai',
      chatgpt: 'openai',
      'gpt-4': 'openai',
      gpt4: 'openai',
      'openai-gpt': 'openai',
      google: 'gemini',
      bard: 'gemini',
      palm: 'gemini',
      claude: null, // Not supported
      anthropic: null, // Not supported
    };

    const suggestion = suggestions[value.toLowerCase()];

    if (suggestion) {
      showValidationError(
        `Invalid provider "${value}"`,
        `--provider ${suggestion}`,
        validProviders
      );
    } else if (suggestion === null) {
      showValidationError(`Invalid provider "${value}"`);
      showWarning(`${value} is not supported yet`);
      showHint(`Use one of: ${validProviders.join(', ')}`);
    } else {
      showValidationError(
        `Invalid provider "${value}"`,
        undefined,
        validProviders
      );
    }

    process.exit(1);
  }

  return value as AIProvider;
}

/**
 * Validate style with smart suggestions
 */
export function validateStyle(value: string): CommitStyle {
  const validStyles: CommitStyle[] = ['concise', 'detailed', 'funny'];

  if (!validStyles.includes(value as CommitStyle)) {
    const suggestions: Record<string, string> = {
      brief: 'concise',
      short: 'concise',
      terse: 'concise',
      long: 'detailed',
      verbose: 'detailed',
      full: 'detailed',
      extended: 'detailed',
      humorous: 'funny',
      humor: 'funny',
      joke: 'funny',
      fun: 'funny',
      casual: 'funny',
    };

    const suggestion = suggestions[value.toLowerCase()];

    showValidationError(
      `Invalid style "${value}"`,
      suggestion ? `--style ${suggestion}` : undefined,
      validStyles
    );

    process.exit(1);
  }

  return value as CommitStyle;
}

/**
 * Validate language code (ISO 639-1 format)
 */
export function validateLanguage(value: string): string {
  // ISO 639-1 format validation
  if (!/^[a-z]{2}$/.test(value)) {
    const suggestions: Record<string, string> = {
      english: 'en',
      spanish: 'es',
      french: 'fr',
      german: 'de',
      italian: 'it',
      portuguese: 'pt',
      russian: 'ru',
      japanese: 'ja',
      korean: 'ko',
      chinese: 'zh',
      arabic: 'ar',
      hindi: 'hi',
      EN: 'en',
      ES: 'es',
      FR: 'fr',
      DE: 'de',
    };

    const suggestion = suggestions[value.toLowerCase()] || suggestions[value];

    showValidationError(
      `Invalid language code "${value}"`,
      suggestion ? `--language ${suggestion}` : undefined
    );
    showHint('Use 2-letter ISO codes (e.g., en, es, fr, de)');

    process.exit(1);
  }

  return value;
}

/**
 * Validate argument combinations and conflicts
 */
export function validateArgumentCombinations(options: {
  setKey?: boolean;
  setProvider?: boolean;
  addRepo?: boolean;
  preset?: string;
  provider?: string;
  prepend?: string;
  forcePrepend?: boolean;
}): void {
  // Validate --add-repo requires -P flag
  if (options.addRepo && !options.preset) {
    showError('--add-repo requires -P <preset>');
    showHint('Example: gitty --add-repo -P work');
    showHint('This links the current repository to a preset configuration');
    process.exit(1);
  }

  // Validate --force-prepend requires --prepend flag
  if (options.forcePrepend && options.prepend === undefined) {
    showError('--force-prepend requires -p/--prepend');
    showHint('Example: gitty -p "HOTFIX-" -f');
    showHint(
      'Force prepend completely replaces config prepend instead of appending'
    );
    process.exit(1);
  }

  // Validate conflicting commands
  const commands = [
    { flag: options.setKey, name: '--set-key' },
    { flag: options.setProvider, name: '--set-provider' },
    { flag: options.addRepo, name: '--add-repo' },
  ].filter(cmd => cmd.flag);

  if (commands.length > 1) {
    showError('Cannot use multiple commands together');
    showHint(`Found: ${commands.map(cmd => cmd.name).join(', ')}`);
    showHint('Use one command at a time, e.g.:');
    showSuggestion('', 'gitty --set-key --provider openai');
    showSuggestion('', 'gitty --set-provider');
    showSuggestion('', 'gitty --add-repo -P work');
    process.exit(1);
  }

  // Validate unsupported provider with set-key
  if (options.setKey && options.provider) {
    const validProviders = ['openai', 'gemini'];
    if (!validProviders.includes(options.provider)) {
      showError(
        `Cannot set API key for unsupported provider "${options.provider}"`
      );
      process.exit(1);
    }
  }
}

/**
 * Validate that a required value is provided
 */
export function validateRequired(
  value: string | undefined,
  fieldName: string
): string {
  if (!value || value.trim() === '') {
    showError(`${fieldName} is required`);
    process.exit(1);
  }
  return value.trim();
}

/**
 * Validate that a value is one of the allowed options
 */
export function validateOneOf<T extends string>(
  value: string,
  options: readonly T[],
  fieldName: string
): T {
  if (!options.includes(value as T)) {
    showValidationError(`Invalid ${fieldName} "${value}"`, undefined, [
      ...options,
    ]);
    process.exit(1);
  }
  return value as T;
}

/**
 * Validate file path exists (useful for config files)
 */
export async function validateFilePath(path: string): Promise<string> {
  try {
    const fs = await import('fs/promises');
    await fs.access(path);
    return path;
  } catch {
    showError(`File not found: ${path}`);
    process.exit(1);
  }
}

/**
 * Validate URL format
 */
export function validateUrl(value: string): string {
  try {
    new URL(value);
    return value;
  } catch {
    showError(`Invalid URL format: ${value}`);
    process.exit(1);
  }
}
