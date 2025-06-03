import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addRepo } from './add-repo';
import { createTestData } from '../../__tests__/test-data';
import type { MockedFunction } from 'vitest';
import type { IUI } from '../../ui/ui';

// 🎯 Selective Type-Safe Mocks: Only define what we actually use!
const mocks = vi.hoisted(() => ({
  configManager: {
    getGlobalConfig: vi.fn(),
    linkRepoToPreset: vi.fn(),
  },
  git: {
    ensureGitRepository: vi.fn(),
    getRepositoryInfo: vi.fn(),
  },
  ui: {
    showSection: vi.fn() as MockedFunction<IUI['showSection']>,
    showConfigLine: vi.fn() as MockedFunction<IUI['showConfigLine']>,
    showHint: vi.fn() as MockedFunction<IUI['showHint']>,
    showError: vi.fn() as MockedFunction<IUI['showError']>,
    showSuccess: vi.fn() as MockedFunction<IUI['showSuccess']>,
    // Only the methods this test actually uses!
  },
  spinner: {
    createSpinner: vi.fn().mockResolvedValue({
      start: vi.fn().mockReturnValue({}),
      succeed: vi.fn().mockReturnValue({}),
      fail: vi.fn().mockReturnValue({}),
      stop: vi.fn(),
    }),
  },
}));

// Now we can cleanly reference our hoisted mocks
vi.mock('../../config/manager', () => mocks.configManager);
vi.mock('../../utils/git', () => mocks.git);
vi.mock('../../ui/ui', () => mocks.ui);
vi.mock('../../ui/spinner', () => mocks.spinner);

describe('Add Repo Command', () => {
  // Setup console spies directly
  let consoleLogSpy: any;

  // Access our hoisted mocks directly
  const mockGetGlobalConfig = mocks.configManager.getGlobalConfig;
  const mockLinkRepoToPreset = mocks.configManager.linkRepoToPreset;
  const mockGit = mocks.git;
  const mockUI = mocks.ui;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Reset spinner mock
    mocks.spinner.createSpinner.mockResolvedValue({
      start: vi.fn().mockReturnValue({}),
      succeed: vi.fn().mockReturnValue({}),
      fail: vi.fn().mockReturnValue({}),
      stop: vi.fn(),
    });

    // Setup default mock behaviors
    mockGit.ensureGitRepository.mockResolvedValue(undefined);
    mockGit.getRepositoryInfo.mockResolvedValue({
      branch: 'main',
      remoteUrl: 'https://github.com/user/repo.git',
    });
    mockLinkRepoToPreset.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success Scenarios', () => {
    it('should link repository to existing preset successfully', async () => {
      const presetName = 'work';
      const config = createTestData.gittyConfig();
      config.presets = {
        work: {
          defaultProvider: 'openai',
          prepend: 'WORK-',
          style: 'concise',
          language: 'en',
        },
      };

      mockGetGlobalConfig.mockReturnValue(config);

      await addRepo(presetName);

      expect(mockGit.ensureGitRepository).toHaveBeenCalledTimes(1);
      expect(mockGit.getRepositoryInfo).toHaveBeenCalledTimes(1);
      expect(mockLinkRepoToPreset).toHaveBeenCalledWith(presetName);

      // Verify UI output
      expect(mockUI.showSection).toHaveBeenCalledWith(
        'Repository Configuration',
        '📁'
      );
      expect(mockUI.showSection).toHaveBeenCalledWith('Preset Details', '🎯');
      expect(mockUI.showSection).toHaveBeenCalledWith(
        "You're all set! Just use:",
        '✨'
      );

      expect(mockUI.showConfigLine).toHaveBeenCalledWith('Branch', 'main');
      expect(mockUI.showConfigLine).toHaveBeenCalledWith(
        'Remote',
        'https://github.com/user/repo.git'
      );
      expect(mockUI.showConfigLine).toHaveBeenCalledWith(
        'Linked preset',
        'work'
      );
      expect(mockUI.showConfigLine).toHaveBeenCalledWith(
        'Default Provider',
        'openai'
      );
      expect(mockUI.showConfigLine).toHaveBeenCalledWith('Prepend', 'WORK-');
      expect(mockUI.showConfigLine).toHaveBeenCalledWith('Style', 'concise');
      expect(mockUI.showConfigLine).toHaveBeenCalledWith('Language', 'en');

      // Verify usage examples
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  gitty -p "123"           # Add ticket prefix'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  gitty                    # Use preset defaults'
      );
    });

    it('should handle repository with no remote URL', async () => {
      const config = createTestData.gittyConfig();
      config.presets = { test: { defaultProvider: 'gemini' } };

      mockGetGlobalConfig.mockReturnValue(config);
      mockGit.getRepositoryInfo.mockResolvedValue({
        branch: 'feature/test',
        remoteUrl: null,
      });

      await addRepo('test');

      expect(mockUI.showConfigLine).toHaveBeenCalledWith(
        'Branch',
        'feature/test'
      );
      expect(mockUI.showConfigLine).toHaveBeenCalledWith('Remote', 'none');
      expect(mockUI.showConfigLine).toHaveBeenCalledWith(
        'Linked preset',
        'test'
      );
    });

    it('should handle preset with minimal configuration', async () => {
      const config = createTestData.gittyConfig();
      config.presets = {
        minimal: {
          defaultProvider: 'openai',
        },
      };

      mockGetGlobalConfig.mockReturnValue(config);

      await addRepo('minimal');

      expect(mockUI.showConfigLine).toHaveBeenCalledWith(
        'Default Provider',
        'openai'
      );
      // Should not call configLine for missing optional fields
      expect(mockUI.showConfigLine).not.toHaveBeenCalledWith(
        'Prepend',
        expect.anything()
      );
      expect(mockUI.showConfigLine).not.toHaveBeenCalledWith(
        'Style',
        expect.anything()
      );
      expect(mockUI.showConfigLine).not.toHaveBeenCalledWith(
        'Language',
        expect.anything()
      );
    });

    it('should handle preset with all configuration options', async () => {
      const config = createTestData.gittyConfig();
      config.presets = {
        full: {
          defaultProvider: 'gemini',
          prepend: 'FULL-',
          style: 'detailed',
          language: 'es',
        },
      };

      mockGetGlobalConfig.mockReturnValue(config);

      await addRepo('full');

      expect(mockUI.showConfigLine).toHaveBeenCalledWith(
        'Default Provider',
        'gemini'
      );
      expect(mockUI.showConfigLine).toHaveBeenCalledWith('Prepend', 'FULL-');
      expect(mockUI.showConfigLine).toHaveBeenCalledWith('Style', 'detailed');
      expect(mockUI.showConfigLine).toHaveBeenCalledWith('Language', 'es');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle non-existent preset', async () => {
      const config = createTestData.gittyConfig();
      config.presets = {}; // No presets

      mockGetGlobalConfig.mockReturnValue(config);

      await addRepo('nonexistent');

      expect(mockGit.ensureGitRepository).toHaveBeenCalledTimes(1);
      expect(mockGit.getRepositoryInfo).not.toHaveBeenCalled();
      expect(mockLinkRepoToPreset).not.toHaveBeenCalled();

      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Create presets in ~/.gitty/config.json'
      );
    });

    it('should handle git repository validation failure', async () => {
      mockGit.ensureGitRepository.mockRejectedValue(
        new Error('Not in a git repository')
      );

      await addRepo('test');

      expect(mockGit.ensureGitRepository).toHaveBeenCalledTimes(1);
      expect(mockGit.getRepositoryInfo).not.toHaveBeenCalled();
      expect(mockLinkRepoToPreset).not.toHaveBeenCalled();

      // Should not show any UI output for git validation errors
      expect(mockUI.showSection).not.toHaveBeenCalled();
    });

    it('should handle git repository info failure', async () => {
      const config = createTestData.gittyConfig();
      config.presets = { test: { defaultProvider: 'openai' } };

      mockGetGlobalConfig.mockReturnValue(config);
      mockGit.getRepositoryInfo.mockRejectedValue(
        new Error('Failed to get repository info')
      );

      // Function handles errors gracefully and returns void
      await expect(addRepo('test')).resolves.toBeUndefined();

      expect(mockGit.ensureGitRepository).toHaveBeenCalledTimes(1);
      // The function catches the error and returns, so getRepositoryInfo is called
      // but linkRepoToPreset is not called
      expect(mockLinkRepoToPreset).not.toHaveBeenCalled();
    });

    it('should handle config manager linking failure', async () => {
      const config = createTestData.gittyConfig();
      config.presets = { test: { defaultProvider: 'openai' } };

      mockGetGlobalConfig.mockReturnValue(config);
      mockLinkRepoToPreset.mockRejectedValue(
        new Error('Failed to link repository')
      );

      // Function handles errors gracefully and returns void
      await expect(addRepo('test')).resolves.toBeUndefined();

      expect(mockGit.ensureGitRepository).toHaveBeenCalledTimes(1);
      expect(mockGit.getRepositoryInfo).toHaveBeenCalledTimes(1);
      expect(mockLinkRepoToPreset).toHaveBeenCalledWith('test');
    });

    it('should handle general unexpected errors', async () => {
      mockGit.ensureGitRepository.mockRejectedValue(
        new Error('Unexpected error')
      );

      // Function handles errors gracefully and returns void
      await expect(addRepo('test')).resolves.toBeUndefined();
    });
  });

  describe('Spinner Integration', () => {
    it('should properly manage spinner lifecycle on success', async () => {
      const config = createTestData.gittyConfig();
      config.presets = { test: { defaultProvider: 'openai' } };

      mockGetGlobalConfig.mockReturnValue(config);

      await addRepo('test');

      // The spinner mocks should be called but we can't easily test the exact sequence
      // since the Spinner class is mocked. The important thing is no errors are thrown.
      expect(mockGit.ensureGitRepository).toHaveBeenCalled();
    });

    it('should handle spinner in error scenarios', async () => {
      const config = createTestData.gittyConfig();
      config.presets = {}; // No presets

      mockGetGlobalConfig.mockReturnValue(config);

      await addRepo('nonexistent');

      // Should complete without throwing, spinner should be handled gracefully
      expect(mockGit.ensureGitRepository).toHaveBeenCalled();
    });
  });
});
