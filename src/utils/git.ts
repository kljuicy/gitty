import type { SimpleGit, StatusResult } from 'simple-git';
import simpleGit from 'simple-git';
import { showError, showHint, showSuggestion } from '../ui/ui';

/**
 * Git interface for dependency injection - matches simple-git API
 */
export interface GitClient extends SimpleGit {}

/**
 * Real git implementation using simple-git
 */
export const createRealGitClient = (): GitClient => simpleGit();

/**
 * Get the default git client implementation
 */
const getDefaultGitClient = (): GitClient => createRealGitClient();

/**
 * Check if current directory is a git repository
 */
export async function isGitRepository(
  git: GitClient = getDefaultGitClient()
): Promise<boolean> {
  try {
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

/**
 * Ensure we're in a git repository, throw if not
 */
export async function ensureGitRepository(
  git: GitClient = getDefaultGitClient()
): Promise<void> {
  const isRepo = await isGitRepository(git);
  if (!isRepo) {
    showError('Not a git repository');
    showSuggestion('Initialize a git repository:', 'git init');
    throw new Error('Not a git repository');
  }
}

/**
 * Ensure we're in a git repository, throw if not (silent version for internal use)
 */
async function ensureGitRepositorySilent(
  git: GitClient = getDefaultGitClient()
): Promise<void> {
  const isRepo = await isGitRepository(git);
  if (!isRepo) {
    throw new Error('Not a git repository');
  }
}

/**
 * Get current git status
 */
export async function getGitStatus(
  git: GitClient = getDefaultGitClient()
): Promise<StatusResult> {
  await ensureGitRepository(git);
  return await git.status();
}

/**
 * Check if working directory is clean
 */
export async function isWorkingDirectoryClean(
  git: GitClient = getDefaultGitClient()
): Promise<boolean> {
  const status = await getGitStatus(git);
  return status.isClean();
}

/**
 * Get files ready to be committed (staged)
 */
export async function getStagedFiles(
  git: GitClient = getDefaultGitClient()
): Promise<string[]> {
  const status = await getGitStatus(git);
  return [...status.staged];
}

/**
 * Get modified files (not staged)
 */
export async function getModifiedFiles(
  git: GitClient = getDefaultGitClient()
): Promise<string[]> {
  const status = await getGitStatus(git);
  return [...status.modified, ...status.not_added];
}

/**
 * Get git diff for staged changes
 */
export async function getStagedDiff(
  git: GitClient = getDefaultGitClient()
): Promise<string> {
  await ensureGitRepository(git);
  return await git.diff(['--cached']);
}

/**
 * Get git diff for unstaged changes
 */
export async function getUnstagedDiff(
  git: GitClient = getDefaultGitClient()
): Promise<string> {
  await ensureGitRepository(git);
  return await git.diff();
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(
  git: GitClient = getDefaultGitClient()
): Promise<string> {
  await ensureGitRepository(git);
  const status = await getGitStatus(git);
  return status.current || 'unknown';
}

/**
 * Get repository remote URL
 */
export async function getRemoteUrl(
  git: GitClient = getDefaultGitClient()
): Promise<string | null> {
  try {
    await ensureGitRepository(git);
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(remote => remote.name === 'origin');
    return origin?.refs?.fetch || null;
  } catch {
    return null;
  }
}

/**
 * Get repository information (remote + branch)
 */
export async function getRepositoryInfo(
  git: GitClient = getDefaultGitClient()
): Promise<{
  remoteUrl: string | null;
  branch: string;
}> {
  const [remoteUrl, branch] = await Promise.all([
    getRemoteUrl(git),
    getCurrentBranch(git),
  ]);

  return { remoteUrl, branch };
}

/**
 * Add files to staging area
 */
export async function addFiles(
  files: string[],
  git: GitClient = getDefaultGitClient()
): Promise<void> {
  await ensureGitRepository(git);
  await git.add(files);
}

/**
 * Add all files to staging area
 */
export async function addAllFiles(
  git: GitClient = getDefaultGitClient()
): Promise<void> {
  await ensureGitRepository(git);
  await git.add('.');
}

/**
 * Create a commit with the given message
 */
export async function createCommit(
  message: string,
  git: GitClient = getDefaultGitClient()
): Promise<void> {
  await ensureGitRepository(git);
  await git.commit(message);
}

/**
 * Get the last commit message
 */
export async function getLastCommitMessage(
  git: GitClient = getDefaultGitClient()
): Promise<string> {
  await ensureGitRepository(git);
  const log = await git.log({ maxCount: 1 });
  return log.latest?.message || '';
}

/**
 * Check if there are any commits in the repository
 */
export async function hasCommits(
  git: GitClient = getDefaultGitClient()
): Promise<boolean> {
  try {
    await ensureGitRepository(git);
    const log = await git.log({ maxCount: 1 });
    return log.total > 0;
  } catch {
    return false;
  }
}

/**
 * Get commit history
 */
export async function getCommitHistory(
  maxCount = 10,
  git: GitClient = getDefaultGitClient()
) {
  await ensureGitRepository(git);
  return await git.log({ maxCount });
}

/**
 * Check if there are merge conflicts
 */
export async function hasMergeConflicts(
  git: GitClient = getDefaultGitClient()
): Promise<boolean> {
  const status = await getGitStatus(git);
  return status.conflicted.length > 0;
}

/**
 * Check if there are any changes (staged or unstaged)
 */
export async function hasAnyChanges(
  git: GitClient = getDefaultGitClient()
): Promise<boolean> {
  const status = await getGitStatus(git);
  return (
    !status.isClean() ||
    status.staged.length > 0 ||
    status.created.length > 0 ||
    status.modified.length > 0 ||
    status.deleted.length > 0
  );
}

/**
 * Check if there are any staged changes
 */
export async function hasStagedChanges(
  git: GitClient = getDefaultGitClient()
): Promise<boolean> {
  const status = await getGitStatus(git);
  return status.staged.length > 0;
}

/**
 * Reset staging area
 */
export async function resetStaging(
  git: GitClient = getDefaultGitClient()
): Promise<void> {
  await ensureGitRepository(git);
  await git.reset();
}

/**
 * Show what would be committed
 */
export async function showStagedChanges(
  git: GitClient = getDefaultGitClient()
): Promise<{
  files: string[];
  diff: string;
}> {
  const files = await getStagedFiles(git);
  const diff = await getStagedDiff(git);
  return { files, diff };
}

/**
 * Validate that there are staged changes ready to commit
 */
export async function validateStagedChanges(
  git: GitClient = getDefaultGitClient()
): Promise<void> {
  const stagedFiles = await getStagedFiles(git);

  if (stagedFiles.length === 0) {
    showError('No staged changes found');
    showHint('Stage your changes first:');
    showSuggestion('Stage all changes:', 'git add .');
    showSuggestion('Stage specific files:', 'git add <file1> <file2>');
    throw new Error('No staged changes');
  }
}

/**
 * Get the root directory of the git repository
 */
export async function getGitRoot(
  git: GitClient = getDefaultGitClient()
): Promise<string> {
  await ensureGitRepository(git);
  return await git.revparse(['--show-toplevel']);
}

/**
 * Comprehensive validation for commit readiness
 */
export async function validateForCommit(
  git: GitClient = getDefaultGitClient()
): Promise<
  | {
      canCommit: false;
      reason: string;
    }
  | {
      canCommit: true;
      diff: string;
      files: string[];
    }
> {
  try {
    await ensureGitRepositorySilent(git);

    // Check if there are any changes at all
    if (await isWorkingDirectoryClean(git)) {
      return {
        canCommit: false,
        reason: 'no-changes',
      };
    }

    // Check if there are any staged changes
    if (!(await hasStagedChanges(git))) {
      return {
        canCommit: false,
        reason: 'no-staged-changes',
      };
    }

    // Check for merge conflicts
    if (await hasMergeConflicts(git)) {
      return {
        canCommit: false,
        reason: 'merge-conflicts',
      };
    }

    return {
      canCommit: true,
      diff: await getStagedDiff(git),
      files: await getStagedFiles(git),
    };
  } catch (_error) {
    return {
      canCommit: false,
      reason: 'git-error',
    };
  }
}

export interface IGitHelper {
  git: GitClient;
  isGitRepository(git?: GitClient): Promise<boolean>;
  ensureGitRepository(git?: GitClient): Promise<void>;
  getStatus(git?: GitClient): Promise<StatusResult>;
  isWorkingDirectoryClean(git?: GitClient): Promise<boolean>;
  getStagedFiles(git?: GitClient): Promise<string[]>;
  getModifiedFiles(git?: GitClient): Promise<string[]>;
  getStagedDiff(git?: GitClient): Promise<string>;
  getUnstagedDiff(git?: GitClient): Promise<string>;
  getCurrentBranch(git?: GitClient): Promise<string>;
  getRemoteUrl(git?: GitClient): Promise<string | null>;
  getRepositoryInfo(git?: GitClient): Promise<{
    remoteUrl: string | null;
    branch: string;
  }>;
  addFiles(files: string[], git?: GitClient): Promise<void>;
  addAllFiles(git?: GitClient): Promise<void>;
  createCommit(message: string, git?: GitClient): Promise<void>;
  getLastCommitMessage(git?: GitClient): Promise<string>;
  hasCommits(git?: GitClient): Promise<boolean>;
  getCommitHistory(maxCount?: number, git?: GitClient): any;
  hasChanges(git?: GitClient): Promise<boolean>;
  resetStaging(git?: GitClient): Promise<void>;
  showStagedChanges(git?: GitClient): Promise<{
    files: string[];
    diff: string;
  }>;
  validateStagedChanges(git?: GitClient): Promise<void>;
  getGitRoot(git?: GitClient): Promise<string>;
  validateForCommit(git?: GitClient): Promise<IValidationForCommitResult>;
}
interface IValidationForCommitResult {
  canCommit: boolean;
  reason?: string;
  diff?: string;
  files?: string[];
}
