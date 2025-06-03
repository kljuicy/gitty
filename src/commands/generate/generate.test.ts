import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CLIOptions } from '../../types/index';
import { generateCommit } from './generate';
import type { MockedFunction } from 'vitest';
import type { IUI } from '../../ui/ui';

// 🎯 Type-Safe Mocks: Only define what we actually use!
const mocks = vi.hoisted(() => ({
  configManager: {
    resolveConfig: vi.fn(),
  },
  git: {
    validateForCommit: vi.fn(),
    addAllFiles: vi.fn(),
    createCommit: vi.fn(),
  },
  ui: {
    showError: vi.fn() as MockedFunction<IUI['showError']>,
    showHint: vi.fn() as MockedFunction<IUI['showHint']>,
    showSuggestion: vi.fn() as MockedFunction<IUI['showSuggestion']>,
    showWarning: vi.fn() as MockedFunction<IUI['showWarning']>,
    showSuccess: vi.fn() as MockedFunction<IUI['showSuccess']>,
    showSection: vi.fn() as MockedFunction<IUI['showSection']>,
    showConfigLine: vi.fn() as MockedFunction<IUI['showConfigLine']>,
  },
  spinner: {
    createSpinner: vi.fn().mockResolvedValue({
      start: vi.fn().mockReturnValue({}),
      succeed: vi.fn().mockReturnValue({}),
      fail: vi.fn().mockReturnValue({}),
      stop: vi.fn(),
    }),
  },
  providers: {
    generateCommitMessages: vi.fn(),
    validateApiKey: vi.fn(),
  },
  providerUtils: {
    getProviderDisplayName: vi.fn((provider: string) =>
      provider === 'openai' ? 'OpenAI' : 'Google Gemini'
    ),
  },
  errorHelp: {
    helpGitSetup: vi.fn(),
    helpForError: vi.fn(),
  },
  menu: {
    showCommitMenu: vi.fn(),
    confirmCommit: vi.fn(),
    showDiffPreview: vi.fn(),
    askForAdditionalPrepend: vi.fn(),
  },
}));

// Clean vi.mock calls using our hoisted mocks
vi.mock('../../config/manager', () => mocks.configManager);
vi.mock('../../utils/git', () => mocks.git);
vi.mock('../../ui/ui', () => mocks.ui);
vi.mock('../../ui/spinner', () => mocks.spinner);
vi.mock('../../providers', () => mocks.providers);
vi.mock('../../utils/providers', () => mocks.providerUtils);
vi.mock('../../ui/error-help', () => mocks.errorHelp);
vi.mock('../../ui/menu', () => mocks.menu);

describe('Generate Commit Command', () => {
  // Setup console spies directly
  let consoleLogSpy: any;
  let processExitSpy: any;

  // Use our clean hoisted mock references
  const mockResolveConfig = mocks.configManager.resolveConfig;
  const mockGit = mocks.git;
  const mockUI = mocks.ui;
  const mockErrorHelp = mocks.errorHelp;
  const mockShowCommitMenu = mocks.menu.showCommitMenu;
  const mockConfirmCommit = mocks.menu.confirmCommit;
  const mockShowDiffPreview = mocks.menu.showDiffPreview;
  const mockAskForAdditionalPrepend = mocks.menu.askForAdditionalPrepend;
  const mockGenerateCommitMessages = mocks.providers.generateCommitMessages;

  let defaultOptions: CLIOptions;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup console spies
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Reset spinner mock
    mocks.spinner.createSpinner.mockResolvedValue({
      start: vi.fn().mockReturnValue({}),
      succeed: vi.fn().mockReturnValue({}),
      fail: vi.fn().mockReturnValue({}),
      stop: vi.fn(),
    });

    defaultOptions = {
      provider: 'openai',
      style: 'concise',
      language: 'en',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      prepend: '',
      preview: false,
    };

    // Mock the provider functions to return commit messages directly
    mockGenerateCommitMessages.mockResolvedValue([
      { message: 'feat: add new feature', confidence: 0.9 },
      { message: 'update: improve functionality', confidence: 0.8 },
      { message: 'refactor: clean up code', confidence: 0.7 },
    ]);

    // Setup default mock behaviors AFTER clearing mocks
    mockGit.validateForCommit.mockResolvedValue({
      canCommit: true,
      diff: 'diff --git a/file.ts b/file.ts\n+added line',
      files: ['file.ts'],
    });

    mockResolveConfig.mockResolvedValue({
      provider: 'openai',
      apiKey: 'test-key',
      style: 'concise',
      language: 'en',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      prepend: '',
    });

    // Ensure createSpinner mock returns the proper interface
    // No additional setup needed since createSpinner() just returns a Promise<OraLike>

    mockShowDiffPreview.mockResolvedValue(true);
    mockShowCommitMenu.mockResolvedValue({ action: 'select', index: 0 });
    mockConfirmCommit.mockResolvedValue(true);
    mockGit.addAllFiles.mockResolvedValue(undefined);
    mockGit.createCommit.mockResolvedValue(undefined);
    mockAskForAdditionalPrepend.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success Scenarios', () => {
    it('should generate and commit successfully with default flow', async () => {
      await generateCommit(defaultOptions);

      expect(mockGit.validateForCommit).toHaveBeenCalledTimes(1);
      expect(mockResolveConfig).toHaveBeenCalledWith(defaultOptions);
      expect(mockGenerateCommitMessages).toHaveBeenCalled();
      expect(mockShowDiffPreview).toHaveBeenCalled();
      expect(mockShowCommitMenu).toHaveBeenCalled();
      expect(mockConfirmCommit).toHaveBeenCalledWith('feat: add new feature');
      expect(mockGit.createCommit).toHaveBeenCalledWith(
        'feat: add new feature'
      );

      expect(mockUI.showSuccess).toHaveBeenCalledWith(
        'Commit created successfully! 🎉'
      );
      expect(mockUI.showSection).toHaveBeenCalledWith(
        'Committed with message',
        '📝'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('feat: add new feature');
    });

    it('should handle preview mode', async () => {
      const previewOptions = { ...defaultOptions, preview: true };

      await generateCommit(previewOptions);

      expect(mockGit.validateForCommit).toHaveBeenCalled();
      expect(mockResolveConfig).toHaveBeenCalled();
      expect(mockShowCommitMenu).toHaveBeenCalled();

      // In preview mode, should NOT call showDiffPreview (no confirmation prompt)
      expect(mockShowDiffPreview).not.toHaveBeenCalled();

      // Should not create actual commit in preview mode
      expect(mockConfirmCommit).not.toHaveBeenCalled();
      expect(mockGit.createCommit).not.toHaveBeenCalled();

      expect(mockUI.showSection).toHaveBeenCalledWith(
        'Selected commit message',
        '✅'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('feat: add new feature');
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Run without -v/--preview to create the commit'
      );
    });

    it('should skip additional prepend prompt in preview mode', async () => {
      mockResolveConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        style: 'concise',
        language: 'en',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
        prepend: 'PROJ-', // Has prepend that would normally trigger prompt
      });

      const previewOptions = { ...defaultOptions, preview: true };

      await generateCommit(previewOptions);

      // Should NOT ask for additional prepend in preview mode
      expect(mockAskForAdditionalPrepend).not.toHaveBeenCalled();

      // Should still show diff info but without prompts
      expect(mockUI.showSection).toHaveBeenCalledWith(
        'Changes to be committed',
        '📋'
      );

      // Should proceed directly to generating messages
      expect(mockGenerateCommitMessages).toHaveBeenCalledWith(
        'openai',
        expect.objectContaining({
          prepend: 'PROJ-', // Should use the config prepend as-is
        })
      );
    });

    it('should handle prepend configuration', async () => {
      mockResolveConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        style: 'concise',
        language: 'en',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
        prepend: 'PROJ-',
      });

      await generateCommit(defaultOptions);

      expect(mockAskForAdditionalPrepend).toHaveBeenCalledWith('PROJ-');
    });

    it('should handle additional prepend from user input', async () => {
      mockResolveConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        style: 'concise',
        language: 'en',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
        prepend: 'PROJ-',
      });
      mockAskForAdditionalPrepend.mockResolvedValue('123');

      await generateCommit(defaultOptions);

      expect(mockAskForAdditionalPrepend).toHaveBeenCalledWith('PROJ-');
      // The provider function should be called with the combined prepend
      expect(mockGenerateCommitMessages).toHaveBeenCalledWith(
        'openai',
        expect.objectContaining({
          prepend: 'PROJ-123',
        })
      );
    });

    it('should handle regeneration flow', async () => {
      mockShowCommitMenu
        .mockResolvedValueOnce({ action: 'regenerate' })
        .mockResolvedValueOnce({ action: 'select', index: 1 });

      await generateCommit(defaultOptions);

      expect(mockGenerateCommitMessages).toHaveBeenCalledTimes(2);
      expect(mockConfirmCommit).toHaveBeenCalledWith(
        'update: improve functionality'
      );
    });

    it('should handle edit message flow', async () => {
      mockShowCommitMenu.mockResolvedValue({
        action: 'edit',
        editedMessage: 'custom: edited message',
      });

      await generateCommit(defaultOptions);

      expect(mockConfirmCommit).toHaveBeenCalledWith('custom: edited message');
      expect(mockGit.createCommit).toHaveBeenCalledWith(
        'custom: edited message'
      );
    });

    it('should handle quit action', async () => {
      mockShowCommitMenu.mockResolvedValue({ action: 'quit' });

      await generateCommit(defaultOptions);

      expect(mockConfirmCommit).not.toHaveBeenCalled();
      expect(mockGit.createCommit).not.toHaveBeenCalled();
    });

    it('should handle user declining commit confirmation', async () => {
      mockConfirmCommit.mockResolvedValue(false);

      await generateCommit(defaultOptions);

      expect(mockGit.createCommit).not.toHaveBeenCalled();
    });

    it('should handle maximum regenerations limit', async () => {
      mockShowCommitMenu
        .mockResolvedValueOnce({ action: 'regenerate' })
        .mockResolvedValueOnce({ action: 'regenerate' })
        .mockResolvedValueOnce({ action: 'regenerate' })
        .mockResolvedValueOnce({ action: 'select', index: 0 });

      await generateCommit(defaultOptions);

      expect(mockGenerateCommitMessages).toHaveBeenCalledTimes(4);
      expect(mockUI.showWarning).toHaveBeenCalledWith(
        'Maximum regenerations reached'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Try adjusting your --style or --temperature for different results'
      );
    });

    it('should NOT prompt for additional prepend when CLI prepend is provided', async () => {
      // Mock config with existing preset prepend
      mockResolveConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        style: 'concise',
        language: 'en',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
        prepend: 'GITTY#2', // This is preset + CLI prepend already combined
      });

      const optionsWithCliPrepend = {
        ...defaultOptions,
        prepend: '2', // User provided CLI prepend
      };

      await generateCommit(optionsWithCliPrepend);

      // Should NOT ask for additional prepend since user provided CLI prepend
      expect(mockAskForAdditionalPrepend).not.toHaveBeenCalled();

      // Should use the final prepend as-is from config resolution
      expect(mockGenerateCommitMessages).toHaveBeenCalledWith(
        'openai',
        expect.objectContaining({
          prepend: 'GITTY#2',
        })
      );
    });

    it('should prompt for additional prepend when NO CLI prepend is provided', async () => {
      // Mock config with preset prepend only
      mockResolveConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        style: 'concise',
        language: 'en',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
        prepend: 'GITTY#', // Only preset prepend
      });

      const optionsWithoutCliPrepend = {
        ...defaultOptions,
        // No CLI prepend provided
      };

      await generateCommit(optionsWithoutCliPrepend);

      // SHOULD ask for additional prepend since no CLI prepend was provided
      expect(mockAskForAdditionalPrepend).toHaveBeenCalledWith('GITTY#');
    });
  });

  describe('Git Validation Error Scenarios', () => {
    it('should handle no changes to commit', async () => {
      mockGit.validateForCommit.mockResolvedValue({
        canCommit: false,
        reason: 'no-changes',
      });

      await generateCommit(defaultOptions);

      expect(mockUI.showWarning).toHaveBeenCalledWith('No changes to commit!');
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Make some changes first, then run gitty again'
      );
      expect(mockResolveConfig).not.toHaveBeenCalled();
    });

    it('should fail fast when API key is missing', async () => {
      // Mock config with missing API key
      mockResolveConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: '', // Empty API key
        style: 'concise',
        language: 'en',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
        prepend: '',
      });

      await generateCommit(defaultOptions);

      // Should check config early and fail fast
      expect(mockGit.validateForCommit).toHaveBeenCalled();
      expect(mockResolveConfig).toHaveBeenCalled();
      expect(mockUI.showError).toHaveBeenCalledWith(
        'No API key found for openai. Run "gitty --set-key --provider openai" or set the appropriate environment variable'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith('For help: gitty --help');

      // Should not proceed to show diff preview or other steps
      expect(mockShowDiffPreview).not.toHaveBeenCalled();
      expect(mockGenerateCommitMessages).not.toHaveBeenCalled();
      expect(mockShowCommitMenu).not.toHaveBeenCalled();
    });

    it('should fail fast when API key is undefined', async () => {
      // Mock config with undefined API key
      mockResolveConfig.mockResolvedValue({
        provider: 'gemini',
        apiKey: undefined as any, // Undefined API key
        style: 'detailed',
        language: 'en',
        model: 'gemini-1.5-flash',
        temperature: 0.8,
        maxTokens: 2048,
        prepend: 'TEST-',
      });

      await generateCommit(defaultOptions);

      expect(mockUI.showError).toHaveBeenCalledWith(
        'No API key found for gemini. Run "gitty --set-key --provider gemini" or set the appropriate environment variable'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith('For help: gitty --help');

      // Should not proceed to diff preview
      expect(mockShowDiffPreview).not.toHaveBeenCalled();
    });

    it('should handle merge conflicts', async () => {
      mockGit.validateForCommit.mockResolvedValue({
        canCommit: false,
        reason: 'merge-conflicts',
      });

      await generateCommit(defaultOptions);

      expect(mockUI.showError).toHaveBeenCalledWith('Merge conflicts detected');
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Resolve the conflicts first, then run gitty again'
      );
    });

    it('should handle git repository errors', async () => {
      mockGit.validateForCommit.mockResolvedValue({
        canCommit: false,
        reason: 'git-error',
      });

      await generateCommit(defaultOptions);

      expect(mockUI.showError).toHaveBeenCalledWith('Git repository error');
      expect(mockErrorHelp.helpGitSetup).toHaveBeenCalled();
    });

    it('should handle unknown git validation errors', async () => {
      mockGit.validateForCommit.mockResolvedValue({
        canCommit: false,
        reason: 'unknown-error',
      });

      await generateCommit(defaultOptions);

      expect(mockUI.showError).toHaveBeenCalledWith('Git repository error');
      expect(mockErrorHelp.helpGitSetup).toHaveBeenCalled();
    });
  });

  describe('AI Generation Error Scenarios', () => {
    it('should handle API key errors', async () => {
      mockGenerateCommitMessages.mockRejectedValue(
        new Error('Invalid API key')
      );

      await generateCommit(defaultOptions);

      expect(mockErrorHelp.helpForError).toHaveBeenCalledWith(
        'api-key',
        'openai'
      );
    });

    it('should handle rate limiting errors', async () => {
      mockGenerateCommitMessages.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await generateCommit(defaultOptions);

      expect(mockUI.showError).toHaveBeenCalledWith('Rate limited');
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Wait a moment and try again'
      );
      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Try alternative provider:',
        '--provider gemini'
      );
    });

    it('should handle quota errors', async () => {
      mockGenerateCommitMessages.mockRejectedValue(new Error('Quota exceeded'));

      await generateCommit(defaultOptions);

      expect(mockUI.showError).toHaveBeenCalledWith('Rate limited');
      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Try alternative provider:',
        '--provider gemini'
      );
    });

    it('should handle network errors', async () => {
      mockGenerateCommitMessages.mockRejectedValue(
        new Error('Network timeout')
      );

      await generateCommit(defaultOptions);

      expect(mockUI.showError).toHaveBeenCalledWith('Network issue');
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Check your internet connection and try again'
      );
    });

    it('should handle general AI errors', async () => {
      mockGenerateCommitMessages.mockRejectedValue(
        new Error('AI service error')
      );

      await generateCommit(defaultOptions);

      expect(mockUI.showError).toHaveBeenCalledWith('AI service error');
      expect(mockErrorHelp.helpForError).toHaveBeenCalledWith('general');
    });

    it('should suggest alternative provider for OpenAI errors', async () => {
      const optionsWithOpenAI = {
        ...defaultOptions,
        provider: 'openai' as const,
      };
      mockResolveConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        style: 'concise',
        language: 'en',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
        prepend: '',
      });

      mockGenerateCommitMessages.mockRejectedValue(new Error('Rate limit'));

      await generateCommit(optionsWithOpenAI);

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Try alternative provider:',
        '--provider gemini'
      );
    });

    it('should suggest alternative provider for Gemini errors', async () => {
      const optionsWithGemini = {
        ...defaultOptions,
        provider: 'gemini' as const,
      };
      mockResolveConfig.mockResolvedValue({
        provider: 'gemini',
        apiKey: 'test-key',
        style: 'concise',
        language: 'en',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 500,
        prepend: '',
      });

      mockGenerateCommitMessages.mockRejectedValue(new Error('Rate limit'));

      await generateCommit(optionsWithGemini);

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Try alternative provider:',
        '--provider openai'
      );
    });
  });

  describe('Commit Creation Error Scenarios', () => {
    it('should handle nothing to commit error', async () => {
      mockGit.createCommit.mockRejectedValue(new Error('nothing to commit'));

      try {
        await generateCommit(defaultOptions);
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockUI.showError).toHaveBeenCalledWith('Nothing to commit');
      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Stage your changes:',
        'git add .'
      );
    });

    it('should handle merge conflict during commit', async () => {
      mockGit.createCommit.mockRejectedValue(new Error('merge conflict'));

      try {
        await generateCommit(defaultOptions);
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockUI.showError).toHaveBeenCalledWith('Merge conflict in commit');
      expect(mockErrorHelp.helpGitSetup).toHaveBeenCalled();
    });

    it('should handle general commit errors', async () => {
      mockGit.createCommit.mockRejectedValue(new Error('Some commit error'));

      try {
        await generateCommit(defaultOptions);
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockUI.showError).toHaveBeenCalledWith('Some commit error');
    });
  });

  describe('Configuration Display', () => {
    it('should display AI configuration correctly', async () => {
      await generateCommit(defaultOptions);

      expect(mockUI.showSection).toHaveBeenCalledWith('AI Configuration', '🤖');
      expect(mockUI.showConfigLine).toHaveBeenCalledWith('Provider', 'OpenAI');
      expect(mockUI.showConfigLine).toHaveBeenCalledWith(
        'Model',
        'gpt-4o-mini'
      );
      expect(mockUI.showConfigLine).toHaveBeenCalledWith('Style', 'concise');
    });

    it('should handle configuration without prepend', async () => {
      await generateCommit(defaultOptions);

      expect(mockUI.showConfigLine).not.toHaveBeenCalledWith(
        'Prepend',
        expect.anything()
      );
    });
  });

  describe('General Error Handling', () => {
    it('should handle unexpected errors and exit', async () => {
      mockGit.validateForCommit.mockRejectedValue(
        new Error('Unexpected error')
      );

      try {
        await generateCommit(defaultOptions);
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockUI.showError).toHaveBeenCalledWith('Unexpected error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error exceptions', async () => {
      mockGit.validateForCommit.mockRejectedValue('string error');

      try {
        await generateCommit(defaultOptions);
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      expect(mockUI.showError).toHaveBeenCalledWith(
        'An unexpected error occurred'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid menu choice', async () => {
      mockShowCommitMenu.mockResolvedValue({ action: 'invalid' });

      await generateCommit(defaultOptions);

      expect(mockConfirmCommit).not.toHaveBeenCalled();
      expect(mockGit.createCommit).not.toHaveBeenCalled();
    });

    it('should handle staging files when needed', async () => {
      mockGit.validateForCommit.mockResolvedValue({
        canCommit: true,
        diff: 'diff --git a/file.ts b/file.ts\n+added line',
        files: ['file.ts'],
        needsStaging: true,
      });

      await generateCommit(defaultOptions);
    });

    it('should skip staging when files are already staged', async () => {
      mockGit.validateForCommit.mockResolvedValue({
        canCommit: true,
        diff: 'diff --cached a/file.ts b/file.ts\n+added line',
        files: ['file.ts'],
        needsStaging: false,
      });

      await generateCommit(defaultOptions);

      expect(mockGit.addAllFiles).not.toHaveBeenCalled();
    });

    it('should handle diff preview rejection', async () => {
      mockShowDiffPreview.mockResolvedValue(false);

      await generateCommit(defaultOptions);

      expect(mockGenerateCommitMessages).not.toHaveBeenCalled();
      expect(mockShowCommitMenu).not.toHaveBeenCalled();
    });
  });
});
