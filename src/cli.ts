#!/usr/bin/env node
import { program } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { CLIOptions } from './types/index.ts';
import { setApiKey } from './commands/set-key/set-key.ts';
import { addRepo } from './commands/add-repo/add-repo.ts';
import { generateCommit } from './commands/generate/generate.ts';
import { setProvider } from './commands/set-provider/set-provider.ts';
import { readJsonFile } from './utils/files';
import { showError, showGoodbye, showSuggestion } from './ui/ui.ts';
import {
  validateArgumentCombinations,
  validateLanguage,
  validateMaxTokens,
  validateProvider,
  validateStyle,
  validateTemperature,
} from './utils/validation.ts';

// Graceful exit on Ctrl+C - register this first!
process.on('SIGINT', () => {
  showGoodbye();
  process.exit(0);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize program asynchronously
async function initializeProgram() {
  try {
    // Load package.json for version
    const packageJson = await readJsonFile<{
      version: string;
      description: string;
    }>(join(__dirname, '..', 'package.json'));

    // Main program
    program
      .name('gitty')
      .description(packageJson.description)
      .version(packageJson.version)
      .option(
        '--set-key',
        'Save API key for specified provider (requires --provider)'
      )
      .option('--set-provider', 'Set default AI provider (openai/gemini)')
      .option('--add-repo', 'Link repo to preset (requires -P/--preset)')
      .option('-p, --prepend <str>', 'Add text before AI message')
      .option(
        '-f, --force-prepend',
        'Replace entire prepend instead of appending (requires -p/--prepend)'
      )
      .option('-P, --preset <n>', 'Load preset from config')
      .option(
        '-s, --style <type>',
        'Set style: concise, detailed, funny',
        validateStyle,
        'concise'
      )
      .option(
        '-l, --language <code>',
        'Output commit message in specified language (2-letter code)',
        validateLanguage,
        'en'
      )
      .option('-v, --preview', "Just show suggestions, don't commit")
      .option(
        '--provider <provider>',
        'AI provider to use: openai, gemini',
        validateProvider
      )
      .option('-m, --model <model>', 'AI model to use (provider-specific)')
      .option(
        '-t, --temperature <temp>',
        'Temperature for AI creativity (0-2, default: 0.7)',
        validateTemperature
      )
      .option(
        '--max-tokens <tokens>',
        'Max tokens for response (default varies by provider)',
        validateMaxTokens
      )
      .addHelpText(
        'after',
        `
Commands (one-time setup):
  --set-key --provider <name>    Save API key for provider (openai/gemini)
  --set-provider                 Choose your default AI provider
  --add-repo -P <preset>         Link current repo to a preset

Generation Options (daily usage):
  -P, --preset <name>            Use a specific preset configuration
  --provider <name>              Override provider (openai/gemini)
  -p, --prepend <text>           Add prefix to commit message
  -f, --force-prepend            Replace entire prefix (use with -p)
  -s, --style <type>             Set style: concise, detailed, funny
  -l, --language <code>          Language for commit message (e.g., en, es, fr)
  -m, --model <name>             Override AI model
  -t, --temperature <n>          AI creativity (0-2, default: 0.7)
  --max-tokens <n>               Response length limit

Execution:
  -v, --preview                  Show suggestions without committing

Examples:
  gitty                          # Basic usage with defaults
  gitty --set-key --provider openai    # First-time setup
  gitty -P work -p "PROJ-123"    # Use work preset + ticket number
  gitty -p "HOTFIX-" -f          # Force replace entire prefix
  gitty --provider gemini -l fr  # Use Gemini in French
  gitty -v                       # Preview mode
`
      );

    program.parse();

    const options = program.opts<CLIOptions>();

    // ASCII art welcome
    console.log(
      `
 🐥 Gitty
    Your cute lil AI-powered Git sidekick
`
    );

    // Main logic
    try {
      // Validate argument combinations
      validateArgumentCombinations(options);

      if (options.setKey) {
        await setApiKey(options.provider);
        return;
      }
      if (options.setProvider) {
        await setProvider();
        return;
      }
      if (options.addRepo) {
        await addRepo(options.preset!);
        return;
      }
      await generateCommit(options);
    } catch (error) {
      if (error instanceof Error) {
        showError(error.message);
      } else {
        showError('An unexpected error occurred');
      }
      showSuggestion('For help:', 'gitty --help');
      process.exit(1);
    }
  } catch (_error) {
    showError('Could not load package.json');
    process.exit(1);
  }
}

// Run initialization
void initializeProgram();
