import inquirer from 'inquirer';
import chalk from 'chalk';
import type { CommitMessage, MenuChoice } from '../types/index';
import { formatDiffStats } from '../utils/diff';
import { promptWithGracefulExit } from './prompts';
import { showSection } from './ui';

export async function showCommitMenu(
  messages: CommitMessage[],
  canRegenerate = true
): Promise<MenuChoice> {
  const choices: any[] = messages.map((msg, index) => ({
    name: `${chalk.green(`[${Math.round(msg.confidence * 100)}%]`)} ${msg.message}`,
    value: index,
  }));
  choices.push(new inquirer.Separator(), {
    name: chalk.blue('✏️  Edit selected message'),
    value: 'edit',
  });
  if (canRegenerate)
    choices.push({
      name: chalk.yellow('🔄 Generate new suggestions'),
      value: 'regenerate',
    });
  choices.push({ name: chalk.red('❌ Cancel commit'), value: 'quit' });
  const { action } = await promptWithGracefulExit<{ action: number | string }>([
    {
      type: 'list',
      name: 'action',
      message: 'Select a commit message:',
      choices,
      pageSize: 10,
    },
  ]);
  if (typeof action === 'number') return { index: action, action: 'select' };
  if (action === 'edit') {
    const { editIndex } = await promptWithGracefulExit<{ editIndex: number }>([
      {
        type: 'list',
        name: 'editIndex',
        message: 'Which message would you like to edit?',
        choices: messages.map((msg, index) => ({
          name: msg.message,
          value: index,
        })),
      },
    ]);
    const { editedMessage } = await promptWithGracefulExit<{
      editedMessage: string;
    }>([
      {
        type: 'editor',
        name: 'editedMessage',
        message: 'Edit the commit message:',
        default: messages[editIndex]!.message,
      },
    ]);
    return {
      index: editIndex,
      action: 'edit',
      editedMessage: editedMessage.trim(),
    };
  }
  return { index: -1, action: action as 'regenerate' | 'quit' };
}

export async function confirmCommit(message: string): Promise<boolean> {
  showSection('Final commit message', '📝');
  console.log(chalk.white.bold(message));
  console.log();
  const { confirm } = await promptWithGracefulExit<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Create commit with this message?',
      default: true,
    },
  ]);
  return confirm;
}

export async function showDiffPreview(
  diff: string,
  files: string[]
): Promise<boolean> {
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
  const { proceed } = await promptWithGracefulExit<{ proceed: boolean }>([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Generate commit message for these changes?',
      default: true,
    },
  ]);
  return proceed;
}

export async function askForAdditionalPrepend(
  currentPrepend: string
): Promise<string | null> {
  if (!currentPrepend) return null;
  const { wantToAdd } = await promptWithGracefulExit<{ wantToAdd: boolean }>([
    {
      type: 'confirm',
      name: 'wantToAdd',
      message: `You have a prepend "${currentPrepend}". Would you like to add to it (e.g., ticket number)?`,
      default: false,
    },
  ]);
  if (!wantToAdd) return null;
  const { addition } = await promptWithGracefulExit<{ addition: string }>([
    {
      type: 'input',
      name: 'addition',
      message: 'Enter text to add to the prepend:',
      validate: (input: string) =>
        !input.trim() ? 'Please enter some text or press Ctrl+C to skip' : true,
    },
  ]);
  return addition.trim();
}
