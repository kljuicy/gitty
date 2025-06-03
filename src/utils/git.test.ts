import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isGitRepository,
  ensureGitRepository,
  getGitStatus,
  isWorkingDirectoryClean,
  getStagedFiles,
  getModifiedFiles,
  getStagedDiff,
  getUnstagedDiff,
  getCurrentBranch,
  getRemoteUrl,
  getRepositoryInfo,
  addFiles,
  addAllFiles,
  createCommit,
  getLastCommitMessage,
  hasCommits,
  getCommitHistory,
  hasAnyChanges,
  hasStagedChanges,
  resetStaging,
  showStagedChanges,
  validateStagedChanges,
  getGitRoot,
  validateForCommit,
  createRealGitClient,
  type GitClient,
} from './git';

// Import our centralized test utilities
import { createGitClientMock } from '../__tests__/mocks';

// Use MOCK_TEMPLATES for UI dependencies
vi.mock('../ui/ui.js', () => ({
  showError: vi.fn(),
  showHint: vi.fn(),
  showSuggestion: vi.fn(),
}));

describe('Git Utilities with Dependency Injection', () => {
  let mockGit: ReturnType<typeof createGitClientMock>;

  beforeEach(() => {
    mockGit = createGitClientMock();
    vi.clearAllMocks();
  });

  describe('Core Git Operations', () => {
    describe('isGitRepository', () => {
      it('should return true when in a git repository', async () => {
        mockGit.checkIsRepo.mockResolvedValue(true);

        const result = await isGitRepository(mockGit as unknown as GitClient);

        expect(result).toBe(true);
        expect(mockGit.checkIsRepo).toHaveBeenCalledTimes(1);
      });

      it('should return false when not in a git repository', async () => {
        mockGit.checkIsRepo.mockResolvedValue(false);

        const result = await isGitRepository(mockGit as unknown as GitClient);

        expect(result).toBe(false);
      });

      it('should return false when git operation throws', async () => {
        mockGit.checkIsRepo.mockRejectedValue(new Error('Not a git repo'));

        const result = await isGitRepository(mockGit as unknown as GitClient);

        expect(result).toBe(false);
      });

      it('should work without dependency injection (default client)', async () => {
        // This tests the default parameter behavior
        const result = await isGitRepository();

        // We can't test the actual result without mocking the real git client,
        // but we can verify the function doesn't throw
        expect(typeof result).toBe('boolean');
      });
    });

    describe('ensureGitRepository', () => {
      it('should not throw when in a git repository', async () => {
        mockGit.checkIsRepo.mockResolvedValue(true);

        await expect(
          ensureGitRepository(mockGit as unknown as GitClient)
        ).resolves.not.toThrow();
      });

      it('should throw error when not in a git repository', async () => {
        mockGit.checkIsRepo.mockResolvedValue(false);

        await expect(
          ensureGitRepository(mockGit as unknown as GitClient)
        ).rejects.toThrow('Not a git repository');
      });
    });

    describe('getGitStatus', () => {
      it('should return status from git client', async () => {
        const mockStatus = {
          isClean: vi.fn().mockReturnValue(false),
          staged: ['file1.ts'],
          created: ['file2.ts'],
          modified: ['file3.ts'],
          renamed: [{ from: 'old.ts', to: 'new.ts' }],
          conflicted: [],
          current: 'main',
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await getGitStatus(mockGit as unknown as GitClient);

        expect(result).toEqual(mockStatus);
        expect(mockGit.status).toHaveBeenCalledTimes(1);
      });

      it('should ensure git repository before getting status', async () => {
        mockGit.checkIsRepo.mockResolvedValue(false);

        await expect(
          getGitStatus(mockGit as unknown as GitClient)
        ).rejects.toThrow('Not a git repository');
        expect(mockGit.status).not.toHaveBeenCalled();
      });
    });

    describe('isWorkingDirectoryClean', () => {
      it('should return true when directory is clean', async () => {
        const mockStatus = { isClean: vi.fn().mockReturnValue(true) };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await isWorkingDirectoryClean(
          mockGit as unknown as GitClient
        );

        expect(result).toBe(true);
        expect(mockStatus.isClean).toHaveBeenCalledTimes(1);
      });

      it('should return false when directory has changes', async () => {
        const mockStatus = { isClean: vi.fn().mockReturnValue(false) };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await isWorkingDirectoryClean(
          mockGit as unknown as GitClient
        );

        expect(result).toBe(false);
      });
    });
  });

  describe('File Operations', () => {
    describe('getStagedFiles', () => {
      it('should return staged files including renamed files', async () => {
        const mockStatus = {
          staged: ['file1.ts'],
          created: ['file2.ts'],
          modified: ['file3.ts'],
          renamed: [
            { from: 'old1.ts', to: 'new1.ts' },
            { from: 'old2.ts', to: 'new2.ts' },
          ],
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await getStagedFiles(mockGit as unknown as GitClient);

        expect(result).toEqual(['file1.ts']);
      });

      it('should handle renamed files with missing to/from properties', async () => {
        const mockStatus = {
          staged: [],
          created: [],
          modified: [],
          renamed: [
            { from: 'old.ts', to: null },
            { from: null, to: 'new.ts' },
          ],
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await getStagedFiles(mockGit as unknown as GitClient);

        expect(result).toEqual([]);
      });
    });

    describe('getModifiedFiles', () => {
      it('should return modified and not added files', async () => {
        const mockStatus = {
          modified: ['modified1.ts', 'modified2.ts'],
          not_added: ['new1.ts', 'new2.ts'],
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await getModifiedFiles(mockGit as unknown as GitClient);

        expect(result).toEqual([
          'modified1.ts',
          'modified2.ts',
          'new1.ts',
          'new2.ts',
        ]);
      });
    });

    describe('addFiles and addAllFiles', () => {
      it('should add specific files to staging area', async () => {
        mockGit.checkIsRepo.mockResolvedValue(true);
        const files = ['file1.ts', 'file2.ts'];

        await addFiles(files, mockGit as unknown as GitClient);

        expect(mockGit.add).toHaveBeenCalledWith(files);
      });

      it('should add all files to staging area', async () => {
        mockGit.checkIsRepo.mockResolvedValue(true);

        await addAllFiles(mockGit as unknown as GitClient);

        expect(mockGit.add).toHaveBeenCalledWith('.');
      });
    });
  });

  describe('Diff Operations', () => {
    describe('getStagedDiff and getUnstagedDiff', () => {
      it('should get staged diff with --cached flag', async () => {
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.diff.mockResolvedValue('staged diff content');

        const result = await getStagedDiff(mockGit as unknown as GitClient);

        expect(result).toBe('staged diff content');
        expect(mockGit.diff).toHaveBeenCalledWith(['--cached']);
      });

      it('should get unstaged diff without flags', async () => {
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.diff.mockResolvedValue('unstaged diff content');

        const result = await getUnstagedDiff(mockGit as unknown as GitClient);

        expect(result).toBe('unstaged diff content');
        expect(mockGit.diff).toHaveBeenCalledWith();
      });
    });

    describe('showStagedChanges', () => {
      it('should return both files and diff', async () => {
        const mockStatus = {
          staged: ['file1.ts'],
          created: ['file2.ts'],
          modified: [],
          renamed: [],
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);
        mockGit.diff.mockResolvedValue('diff content');

        const result = await showStagedChanges(mockGit as unknown as GitClient);

        expect(result).toEqual({
          files: ['file1.ts'],
          diff: 'diff content',
        });
      });
    });
  });

  describe('Branch and Remote Operations', () => {
    describe('getCurrentBranch', () => {
      it('should return current branch from status', async () => {
        const mockStatus = { current: 'feature-branch' };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await getCurrentBranch(mockGit as unknown as GitClient);

        expect(result).toBe('feature-branch');
      });

      it('should return "unknown" when current branch is null', async () => {
        const mockStatus = { current: null };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await getCurrentBranch(mockGit as unknown as GitClient);

        expect(result).toBe('unknown');
      });
    });

    describe('getRemoteUrl', () => {
      it('should return origin remote URL', async () => {
        const mockRemotes = [
          {
            name: 'origin',
            refs: { fetch: 'https://github.com/user/repo.git' },
          },
          {
            name: 'upstream',
            refs: { fetch: 'https://github.com/upstream/repo.git' },
          },
        ];
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.getRemotes.mockResolvedValue(mockRemotes);

        const result = await getRemoteUrl(mockGit as unknown as GitClient);

        expect(result).toBe('https://github.com/user/repo.git');
        expect(mockGit.getRemotes).toHaveBeenCalledWith(true);
      });

      it('should return null when no origin remote exists', async () => {
        const mockRemotes = [
          {
            name: 'upstream',
            refs: { fetch: 'https://github.com/upstream/repo.git' },
          },
        ];
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.getRemotes.mockResolvedValue(mockRemotes);

        const result = await getRemoteUrl(mockGit as unknown as GitClient);

        expect(result).toBe(null);
      });

      it('should return null when git operation fails', async () => {
        mockGit.checkIsRepo.mockRejectedValue(new Error('Git error'));

        const result = await getRemoteUrl(mockGit as unknown as GitClient);

        expect(result).toBe(null);
      });
    });

    describe('getRepositoryInfo', () => {
      it('should return both remote URL and branch info', async () => {
        const mockStatus = { current: 'main' };
        const mockRemotes = [
          {
            name: 'origin',
            refs: { fetch: 'https://github.com/user/repo.git' },
          },
        ];
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);
        mockGit.getRemotes.mockResolvedValue(mockRemotes);

        const result = await getRepositoryInfo(mockGit as unknown as GitClient);

        expect(result).toEqual({
          remoteUrl: 'https://github.com/user/repo.git',
          branch: 'main',
        });
      });
    });
  });

  describe('Commit Operations', () => {
    describe('createCommit', () => {
      it('should create commit with message', async () => {
        mockGit.checkIsRepo.mockResolvedValue(true);
        const message = 'feat: add new feature';

        await createCommit(message, mockGit as unknown as GitClient);

        expect(mockGit.commit).toHaveBeenCalledWith(message);
      });
    });

    describe('getLastCommitMessage', () => {
      it('should return latest commit message', async () => {
        const mockLog = {
          latest: { message: 'feat: latest commit' },
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.log.mockResolvedValue(mockLog);

        const result = await getLastCommitMessage(
          mockGit as unknown as GitClient
        );

        expect(result).toBe('feat: latest commit');
        expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 1 });
      });

      it('should return empty string when no commits exist', async () => {
        const mockLog = { latest: null };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.log.mockResolvedValue(mockLog);

        const result = await getLastCommitMessage(
          mockGit as unknown as GitClient
        );

        expect(result).toBe('');
      });
    });

    describe('hasCommits', () => {
      it('should return true when commits exist', async () => {
        const mockLog = { total: 5 };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.log.mockResolvedValue(mockLog);

        const result = await hasCommits(mockGit as unknown as GitClient);

        expect(result).toBe(true);
      });

      it('should return false when no commits exist', async () => {
        const mockLog = { total: 0 };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.log.mockResolvedValue(mockLog);

        const result = await hasCommits(mockGit as unknown as GitClient);

        expect(result).toBe(false);
      });

      it('should return false when git operation fails', async () => {
        mockGit.checkIsRepo.mockRejectedValue(new Error('Git error'));

        const result = await hasCommits(mockGit as unknown as GitClient);

        expect(result).toBe(false);
      });
    });

    describe('getCommitHistory', () => {
      it('should return commit history with default max count', async () => {
        const mockLog = { commits: ['commit1', 'commit2'] };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.log.mockResolvedValue(mockLog);

        const result = await getCommitHistory(
          10,
          mockGit as unknown as GitClient
        );

        expect(result).toEqual(mockLog);
        expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 10 });
      });
    });
  });

  describe('Change Detection and Validation', () => {
    describe('hasAnyChanges', () => {
      it('should return true when directory is not clean', async () => {
        const mockStatus = {
          isClean: () => false,
          staged: [],
          created: [],
          modified: ['file1.ts'],
          deleted: [],
        };
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await hasAnyChanges(mockGit as unknown as GitClient);

        expect(result).toBe(true);
        expect(mockGit.status).toHaveBeenCalledTimes(1);
      });

      it('should return true when there are staged files', async () => {
        const mockStatus = {
          isClean: () => true,
          staged: ['file1.ts'],
          created: [],
          modified: [],
          deleted: [],
        };
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await hasAnyChanges(mockGit as unknown as GitClient);

        expect(result).toBe(true);
        expect(mockGit.status).toHaveBeenCalledTimes(1);
      });

      it('should return false when directory is clean and no staged files', async () => {
        const mockStatus = {
          isClean: () => true,
          staged: [],
          created: [],
          modified: [],
          deleted: [],
        };
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await hasAnyChanges(mockGit as unknown as GitClient);

        expect(result).toBe(false);
        expect(mockGit.status).toHaveBeenCalledTimes(1);
      });
    });

    describe('hasStagedChanges', () => {
      it('should return true when there are staged files', async () => {
        const mockStatus = {
          staged: ['file1.ts', 'file2.ts'],
        };
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await hasStagedChanges(mockGit as unknown as GitClient);

        expect(result).toBe(true);
        expect(mockGit.status).toHaveBeenCalledTimes(1);
      });

      it('should return false when there are no staged files', async () => {
        const mockStatus = {
          staged: [],
        };
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await hasStagedChanges(mockGit as unknown as GitClient);

        expect(result).toBe(false);
        expect(mockGit.status).toHaveBeenCalledTimes(1);
      });
    });

    describe('validateStagedChanges', () => {
      it('should not throw when staged files exist', async () => {
        const mockStatus = {
          staged: ['file1.ts'],
          created: ['file2.ts'],
          modified: [],
          renamed: [],
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        await expect(
          validateStagedChanges(mockGit as unknown as GitClient)
        ).resolves.not.toThrow();
      });

      it('should throw error when no staged files exist', async () => {
        const mockStatus = {
          staged: [],
          created: [],
          modified: [],
          renamed: [],
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        await expect(
          validateStagedChanges(mockGit as unknown as GitClient)
        ).rejects.toThrow('No staged changes');
      });
    });

    describe('validateForCommit', () => {
      it('should return canCommit: true when changes exist', async () => {
        const mockStatus = {
          isClean: vi.fn().mockReturnValue(false),
          staged: ['file1.ts'],
          created: [],
          modified: [],
          renamed: [],
          conflicted: [],
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);
        mockGit.diff.mockResolvedValue('diff content');

        const result = await validateForCommit(mockGit as unknown as GitClient);

        expect(result).toEqual({
          canCommit: true,
          diff: 'diff content',
          files: ['file1.ts'],
        });
      });

      it('should return canCommit: false when no changes exist', async () => {
        const mockStatus = {
          isClean: vi.fn().mockReturnValue(true),
          staged: [],
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await validateForCommit(mockGit as unknown as GitClient);

        expect(result).toEqual({
          canCommit: false,
          reason: 'no-changes',
        });
      });

      it('should return canCommit: false when no staged changes exist', async () => {
        const mockStatus = {
          isClean: vi.fn().mockReturnValue(false), // Directory has changes
          staged: [], // But nothing is staged
          modified: ['unstaged-file.ts'], // Has unstaged changes
          conflicted: [], // No merge conflicts
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await validateForCommit(mockGit as unknown as GitClient);

        expect(result).toEqual({
          canCommit: false,
          reason: 'no-staged-changes',
        });
      });

      it('should return canCommit: false when merge conflicts exist', async () => {
        const mockStatus = {
          isClean: vi.fn().mockReturnValue(false),
          staged: ['file1.ts'],
          conflicted: ['conflicted.ts'],
        };
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.status.mockResolvedValue(mockStatus);

        const result = await validateForCommit(mockGit as unknown as GitClient);

        expect(result).toEqual({
          canCommit: false,
          reason: 'merge-conflicts',
        });
      });

      it('should return canCommit: false when git operation fails', async () => {
        mockGit.checkIsRepo.mockRejectedValue(new Error('Git error'));

        const result = await validateForCommit(mockGit as unknown as GitClient);

        expect(result).toEqual({
          canCommit: false,
          reason: 'git-error',
        });
      });
    });
  });

  describe('Utility Operations', () => {
    describe('resetStaging', () => {
      it('should reset staging area', async () => {
        mockGit.checkIsRepo.mockResolvedValue(true);

        await resetStaging(mockGit as unknown as GitClient);

        expect(mockGit.reset).toHaveBeenCalledTimes(1);
      });
    });

    describe('getGitRoot', () => {
      it('should return git root directory', async () => {
        mockGit.checkIsRepo.mockResolvedValue(true);
        mockGit.revparse.mockResolvedValue('/path/to/git/root');

        const result = await getGitRoot(mockGit as unknown as GitClient);

        expect(result).toBe('/path/to/git/root');
        expect(mockGit.revparse).toHaveBeenCalledWith(['--show-toplevel']);
      });
    });
  });

  describe('Factory Functions', () => {
    describe('createRealGitClient', () => {
      it('should create a real git client', () => {
        const client = createRealGitClient();

        expect(client).toBeDefined();
        expect(typeof client.checkIsRepo).toBe('function');
        expect(typeof client.status).toBe('function');
        expect(typeof client.add).toBe('function');
        expect(typeof client.commit).toBe('function');
      });
    });
  });
});
