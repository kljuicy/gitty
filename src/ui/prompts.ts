import inquirer from 'inquirer';
import { showGoodbye } from './ui';

/**
 * Centralized SIGINT handling for inquirer prompts
 */
export async function promptWithGracefulExit<T = any>(
  promptConfig: any[]
): Promise<T> {
  try {
    return (await inquirer.prompt(promptConfig)) as T;
  } catch (error) {
    // Check if it's a SIGINT error from inquirer (case-insensitive)
    if (
      error instanceof Error &&
      (error.message.toLowerCase().includes('sigint') ||
        error.message.toLowerCase().includes('force closed') ||
        error.message.toLowerCase().includes('prompt was canceled'))
    ) {
      showGoodbye();
      process.exit(0);
    }
    // Re-throw other errors
    throw error;
  }
}
