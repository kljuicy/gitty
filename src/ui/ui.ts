import chalk from 'chalk';

/**
 * Display error messages with consistent styling
 */
export function showError(message: string, details?: string): void {
  console.error(chalk.red(`❌ Error: ${message}`));
  if (details) {
    console.error(chalk.gray(details));
  }
}

/**
 * Display success messages with consistent styling
 */
export function showSuccess(message: string, details?: string): void {
  console.log(chalk.green(`✅ ${message}`));
  if (details) {
    console.log(chalk.gray(details));
  }
}

/**
 * Display warning messages with consistent styling
 */
export function showWarning(message: string, details?: string): void {
  console.log(chalk.yellow(`⚠️  ${message}`));
  if (details) {
    console.log(chalk.gray(details));
  }
}

/**
 * Display info messages with consistent styling
 */
export function showInfo(message: string, emoji = '🔵'): void {
  console.log(chalk.blue(`${emoji} ${message}`));
}

/**
 * Display command suggestions with consistent styling
 */
export function showSuggestion(text: string, command: string): void {
  console.log(chalk.gray(`💡 ${text} `) + chalk.cyan(command));
}

/**
 * Display helpful hints with consistent styling
 */
export function showHint(message: string): void {
  console.log(chalk.gray(`💡 Hint: ${message}`));
}

/**
 * Display configuration details with consistent styling
 */
export function showConfigLine(label: string, value: string): void {
  console.log(chalk.gray(`  ${label}: `) + chalk.cyan(value));
}

/**
 * Display section headers with consistent styling
 */
export function showSection(title: string, emoji = '📋'): void {
  console.log(`\n${chalk.blue(emoji + ' ' + title)}`);
}

/**
 * Display provider-specific help
 */
export function showProviderHelp(provider: string): void {
  const urls = {
    openai: 'https://platform.openai.com/api-keys',
    gemini: 'https://aistudio.google.com/app/apikey',
  };

  const url = urls[provider as keyof typeof urls];
  if (url) {
    showSuggestion(`Get your ${provider} API key at:`, url);
  }
}

/**
 * Display validation error with suggestion
 */
export function showValidationError(
  message: string,
  suggestion?: string,
  validOptions?: string[]
): void {
  showError(message);

  if (validOptions) {
    console.error(
      chalk.gray(
        `💡 Valid options: ${validOptions.map(opt => chalk.cyan(opt)).join(', ')}`
      )
    );
  }

  if (suggestion) {
    console.error(chalk.yellow(`💡 Did you mean: ${chalk.cyan(suggestion)}`));
  }
}

/**
 * Display the goodbye message consistently
 */
export function showGoodbye(): void {
  console.log(chalk.green('\nOh! OK - See you soon! 🐥'));
}

/**
 * Interface that both UI and mocks must implement
 * This ensures type safety and prevents drift between real and mock implementations
 */
export interface IUI {
  showError(message: string, details?: string): void;
  showSuccess(message: string, details?: string): void;
  showWarning(message: string, details?: string): void;
  showInfo(message: string, emoji?: string): void;
  showSuggestion(text: string, command: string): void;
  showHint(message: string): void;
  showConfigLine(label: string, value: string): void;
  showSection(title: string, emoji?: string): void;
  showProviderHelp(provider: string): void;
  showValidationError(
    message: string,
    suggestion?: string,
    validOptions?: string[]
  ): void;
  showGoodbye(): void;
}
