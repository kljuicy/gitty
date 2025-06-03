import type { CLIOptions } from '../../types/index';
import type { CommitMessage } from '../../types/index';
import { validateForCommit, createCommit } from '../../utils/git';
import { resolveConfig } from '../../config/manager';
import { generateCommitMessages } from '../../providers';
import type { ProviderName } from '../../providers';
import { getProviderDisplayName } from '../../utils/providers';
import { createSpinner } from '../../ui/spinner';
import {
  showError,
  showHint,
  showSuggestion,
  showWarning,
  showSuccess,
  showSection,
  showConfigLine,
} from '../../ui/ui';
import {
  showCommitMenu,
  confirmCommit,
  showDiffPreview,
  askForAdditionalPrepend,
} from '../../ui/menu';
import { helpForError, helpGitSetup } from '../../ui/error-help';
import { shouldShowProgress } from '../../utils/environment';
import chalk from 'chalk';
import { formatDiffStats } from '../../utils/diff';

export async function generateCommit(options: CLIOptions): Promise<void> {
  try {
    const validation = await validateForCommit();

    if (!validation.canCommit) {
      switch (validation.reason) {
        case 'no-changes':
          showWarning('No changes to commit!');
          showHint('Make some changes first, then run gitty again');
          return;
        case 'merge-conflicts':
          showError('Merge conflicts detected');
          showHint('Resolve the conflicts first, then run gitty again');
          return;
        case 'no-staged-changes':
          showWarning('No staged changes found');
          showHint('Stage your changes first, then run gitty again');
          return;
        default:
          showError('Git repository error');
          helpGitSetup();
          return;
      }
    }

    // Resolve config early to fail fast on missing API keys
    const config = await resolveConfig(options);

    // Validate API key is available before showing diff
    if (!config.apiKey) {
      showError(
        `No API key found for ${config.provider}. Run "gitty --set-key --provider ${config.provider}" or set the appropriate environment variable`
      );
      showHint('For help: gitty --help');
      return;
    }

    const { diff, files } = validation;

    if (!options.preview) {
      if (!(await showDiffPreview(diff, files))) {
        return;
      }
    } else {
      showSection('Changes to be committed', '📋');
      console.log(chalk.gray('─'.repeat(50)));
      const stats = formatDiffStats(diff);
      console.log(
        chalk.cyan(
          `\nStats: ${stats.additions} additions(+), ${stats.deletions} deletions(-), ${stats.files} file(s) changed`
        )
      );
      console.log(chalk.yellow('\nFiles:'));
      files.forEach(file => console.log(`  ${chalk.cyan('•')} ${file}`));
      const maxDiffLength = 500;
      const displayDiff =
        diff.length > maxDiffLength
          ? diff.substring(0, maxDiffLength) + '\n\n... (diff truncated)'
          : diff;
      console.log(chalk.yellow('\nDiff preview:'));
      console.log(chalk.gray(displayDiff));
      console.log(chalk.gray('─'.repeat(50)));
    }

    let finalPrepend = config.prepend;
    if (config.prepend && !options.prepend && !options.preview) {
      const additionalPrepend = await askForAdditionalPrepend(config.prepend);
      if (additionalPrepend) {
        finalPrepend = `${config.prepend}${additionalPrepend}`;
      }
    }

    showSection('AI Configuration', '🤖');
    showConfigLine('Provider', getProviderDisplayName(config.provider));
    showConfigLine('Model', config.model);
    showConfigLine('Temperature', config.temperature.toString());
    showConfigLine('Style', config.style);
    if (finalPrepend) {
      showConfigLine('Prepend', `"${finalPrepend}"`);
    }

    const commitOptions = {
      diff,
      style: config.style,
      language: config.language,
      prepend: finalPrepend || '',
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      apiKey: config.apiKey,
    };

    let messages: CommitMessage[] = [];
    let regenerationCount = 0;

    while (true) {
      try {
        if (regenerationCount >= 3) {
          showWarning('Maximum regenerations reached');
          showHint(
            'Try adjusting your --style or --temperature for different results'
          );
        }

        const spinner = shouldShowProgress() ? await createSpinner() : null;
        spinner?.start(
          regenerationCount === 0
            ? 'Generating commit messages...'
            : 'Regenerating commit messages...'
        );

        try {
          messages = await generateCommitMessages(
            config.provider as ProviderName,
            commitOptions
          );
          spinner?.succeed('Messages generated successfully!');
        } catch (error) {
          spinner?.fail('Failed to generate messages');
          throw error;
        }

        const choice = await showCommitMenu(messages);

        let finalMessage: string;
        switch (choice.action) {
          case 'select': {
            const selectedMessage = messages[choice.index];
            if (choice.index !== undefined && selectedMessage?.message) {
              finalMessage = selectedMessage.message;
            } else {
              showError('Invalid message selection');
              return;
            }
            break;
          }
          case 'regenerate':
            regenerationCount++;
            continue;
          case 'edit':
            finalMessage = choice.editedMessage!;
            break;
          case 'quit':
            return;
          default:
            showError('Invalid choice');
            return;
        }

        if (options.preview) {
          showSection('Selected commit message', '✅');
          console.log(finalMessage);
          showHint('Run without -v/--preview to create the commit');
          return;
        }

        if (!(await confirmCommit(finalMessage))) {
          return;
        }

        try {
          await createCommit(finalMessage);

          showSuccess('Commit created successfully! 🎉');
          showSection('Committed with message', '📝');
          console.log(finalMessage);
          return;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          if (errorMessage.includes('nothing to commit')) {
            showError('Nothing to commit');
            showSuggestion('Stage your changes:', 'git add .');
          } else if (errorMessage.includes('merge conflict')) {
            showError('Merge conflict in commit');
            helpGitSetup();
          } else {
            showError(errorMessage);
          }
          process.exit(1);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (
          errorMessage.toLowerCase().includes('api key') ||
          errorMessage.toLowerCase().includes('401') ||
          errorMessage.toLowerCase().includes('unauthorized')
        ) {
          helpForError('api-key', config.provider);
          return;
        }

        if (
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('quota')
        ) {
          showError('Rate limited');
          showHint('Wait a moment and try again');
          const alternativeProvider =
            config.provider === 'openai' ? 'gemini' : 'openai';
          showSuggestion(
            'Try alternative provider:',
            `--provider ${alternativeProvider}`
          );
          return;
        }

        if (
          errorMessage.toLowerCase().includes('network') ||
          errorMessage.toLowerCase().includes('timeout') ||
          errorMessage.toLowerCase().includes('connect')
        ) {
          showError('Network issue');
          showHint('Check your internet connection and try again');
          return;
        }

        showError(errorMessage);
        helpForError('general');
        return;
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    showError(errorMessage);
    helpForError('general');
    process.exit(1);
  }
}
