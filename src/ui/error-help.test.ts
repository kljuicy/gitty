import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  helpApiKeySetup,
  helpProviderSetup,
  helpGeneral,
  helpGitSetup,
  helpPresetSetup,
  helpForError,
} from './error-help';
import type { MockedFunction } from 'vitest';
import type { IUI } from './ui';

// Import our centralized test utilities
import { createTestData } from '../__tests__/test-data';

// 🎯 Type-Safe Hoisted Mocks: Only define what we actually use!
const mocks = vi.hoisted(() => ({
  ui: {
    showSuggestion: vi.fn() as MockedFunction<IUI['showSuggestion']>,
    showHint: vi.fn() as MockedFunction<IUI['showHint']>,
  },
}));

// Clean vi.mock calls using our hoisted mocks
vi.mock('./ui', () => mocks.ui);

describe('Error Help', () => {
  const mockUI = mocks.ui;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Key Setup Help', () => {
    it('should provide OpenAI API key setup help', () => {
      helpApiKeySetup(createTestData.provider.openai);

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Set up your API key:',
        `gitty --set-key --provider ${createTestData.provider.openai}`
      );
    });

    it('should provide Gemini API key setup help', () => {
      helpApiKeySetup(createTestData.provider.gemini);

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Set up your API key:',
        `gitty --set-key --provider ${createTestData.provider.gemini}`
      );
    });

    it('should handle unknown providers', () => {
      helpApiKeySetup('unknown-provider');

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Set up your API key:',
        'gitty --set-key --provider unknown-provider'
      );
    });
  });

  describe('Provider Setup Help', () => {
    it('should provide provider configuration help', () => {
      helpProviderSetup();

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Configure your provider:',
        'gitty --set-provider'
      );
    });
  });

  describe('General Help', () => {
    it('should provide general help command', () => {
      helpGeneral();

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'For help:',
        'gitty --help'
      );
    });
  });

  describe('Git Setup Help', () => {
    it('should provide git repository setup commands', () => {
      helpGitSetup();

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Initialize a git repository:',
        'git init'
      );
      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Check git status:',
        'git status'
      );
    });
  });

  describe('Preset Setup Help', () => {
    it('should provide preset configuration help', () => {
      helpPresetSetup();

      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Edit ~/.gitty/config.json to add presets'
      );
    });
  });

  describe('Comprehensive Error Recovery', () => {
    it('should provide API key help with provider', () => {
      helpForError('api-key', createTestData.provider.openai);

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Set up your API key:',
        `gitty --set-key --provider ${createTestData.provider.openai}`
      );
    });

    it('should provide API key help without provider', () => {
      helpForError('api-key');

      // Should not call showSuggestion if no provider is provided
      expect(mockUI.showSuggestion).not.toHaveBeenCalled();
    });

    it('should provide provider setup help', () => {
      helpForError('provider');

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Configure your provider:',
        'gitty --set-provider'
      );
    });

    it('should provide git setup help', () => {
      helpForError('git');

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Initialize a git repository:',
        'git init'
      );
      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Check git status:',
        'git status'
      );
    });

    it('should provide config setup help', () => {
      helpForError('config');

      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Edit ~/.gitty/config.json to add presets'
      );
    });

    it('should provide general help for unknown error types', () => {
      helpForError('general');

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'For help:',
        'gitty --help'
      );
    });

    it('should default to general help for unspecified error types', () => {
      // @ts-expect-error Testing invalid error type
      helpForError('unknown-error-type');

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'For help:',
        'gitty --help'
      );
    });
  });

  describe('Integration with Test Data', () => {
    it('should work with all test providers', () => {
      const providers = [
        createTestData.provider.openai,
        createTestData.provider.gemini,
      ];

      providers.forEach(provider => {
        vi.clearAllMocks();
        helpApiKeySetup(provider);

        expect(mockUI.showSuggestion).toHaveBeenCalledWith(
          'Set up your API key:',
          `gitty --set-key --provider ${provider}`
        );
      });
    });

    it('should generate different commands for different providers', () => {
      // Test OpenAI
      helpApiKeySetup(createTestData.provider.openai);
      expect(mockUI.showSuggestion).toHaveBeenLastCalledWith(
        'Set up your API key:',
        'gitty --set-key --provider openai'
      );

      // Test Gemini
      helpApiKeySetup(createTestData.provider.gemini);
      expect(mockUI.showSuggestion).toHaveBeenLastCalledWith(
        'Set up your API key:',
        'gitty --set-key --provider gemini'
      );
    });
  });

  describe('Error Context Scenarios', () => {
    it('should provide contextual help for missing API key errors', () => {
      // Simulate scenario where user gets "No API key found" error
      helpForError('api-key', createTestData.provider.openai);

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Set up your API key:',
        'gitty --set-key --provider openai'
      );
    });

    it('should provide contextual help for provider configuration errors', () => {
      // Simulate scenario where user gets "Invalid provider" error
      helpForError('provider');

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Configure your provider:',
        'gitty --set-provider'
      );
    });

    it('should provide contextual help for git repository errors', () => {
      // Simulate scenario where user runs gitty outside a git repository
      helpForError('git');

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Initialize a git repository:',
        'git init'
      );
      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Check git status:',
        'git status'
      );
    });

    it('should provide contextual help for configuration file errors', () => {
      // Simulate scenario where user has issues with presets
      helpForError('config');

      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Edit ~/.gitty/config.json to add presets'
      );
    });

    it('should handle multiple error types in sequence', () => {
      // Simulate multiple error help requests
      helpForError('api-key', createTestData.provider.openai);
      helpForError('provider');
      helpForError('git');

      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Set up your API key:',
        'gitty --set-key --provider openai'
      );
      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Configure your provider:',
        'gitty --set-provider'
      );
      expect(mockUI.showSuggestion).toHaveBeenCalledWith(
        'Initialize a git repository:',
        'git init'
      );
    });
  });

  describe('Command Generation', () => {
    it('should generate proper command strings', () => {
      const testCases = [
        {
          provider: createTestData.provider.openai,
          expectedCommand: 'gitty --set-key --provider openai',
        },
        {
          provider: createTestData.provider.gemini,
          expectedCommand: 'gitty --set-key --provider gemini',
        },
        {
          provider: 'custom-provider',
          expectedCommand: 'gitty --set-key --provider custom-provider',
        },
      ];

      testCases.forEach(({ provider, expectedCommand }) => {
        vi.clearAllMocks();
        helpApiKeySetup(provider);

        expect(mockUI.showSuggestion).toHaveBeenCalledWith(
          'Set up your API key:',
          expectedCommand
        );
      });
    });

    it('should provide consistent git commands', () => {
      helpGitSetup();

      const calls = mockUI.showSuggestion.mock.calls;
      expect(calls).toContainEqual([
        'Initialize a git repository:',
        'git init',
      ]);
      expect(calls).toContainEqual(['Check git status:', 'git status']);
    });
  });
});
