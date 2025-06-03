import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  showError,
  showSuccess,
  showWarning,
  showInfo,
  showSuggestion,
  showHint,
  showConfigLine,
  showSection,
  showProviderHelp,
  showValidationError,
  showGoodbye,
} from './ui';

// Import our centralized test utilities
import { createTestData } from '../__tests__/test-data';
import { setupConsoleSpy } from '../__tests__/utils';
import type { MockedFunction } from 'vitest';
import type { IChalk } from '../__tests__/interfaces';

// 🎯 Type-Safe Hoisted Mocks: Only define what ui.ts actually uses!
const mocks = vi.hoisted(() => ({
  chalk: {
    default: {
      red: vi.fn((text: string) => text) as MockedFunction<IChalk['red']>,
      green: vi.fn((text: string) => text) as MockedFunction<IChalk['green']>,
      yellow: vi.fn((text: string) => text) as MockedFunction<IChalk['yellow']>,
      blue: vi.fn((text: string) => text) as MockedFunction<IChalk['blue']>,
      gray: vi.fn((text: string) => text) as MockedFunction<IChalk['gray']>,
      cyan: vi.fn((text: string) => text) as MockedFunction<IChalk['cyan']>,
    } satisfies Partial<IChalk>,
  },
}));

// Apply hoisted mocks
vi.mock('chalk', () => mocks.chalk);

describe('UI Utilities', () => {
  const consoleSpy = setupConsoleSpy();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Messages', () => {
    it('should display error messages with emoji', () => {
      showError('Test error message');

      expect(consoleSpy.consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error: Test error message')
      );
    });

    it('should display error messages with details', () => {
      showError('Test error', 'Additional details');

      expect(consoleSpy.consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error: Test error')
      );
      expect(consoleSpy.consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Additional details')
      );
    });
  });

  describe('Success Messages', () => {
    it('should display success messages with emoji', () => {
      showSuccess('Operation completed');

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Operation completed')
      );
    });

    it('should display success messages with details', () => {
      showSuccess('API key saved', 'Provider: OpenAI');

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ API key saved')
      );
      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Provider: OpenAI')
      );
    });
  });

  describe('Warning Messages', () => {
    it('should display warning messages with emoji', () => {
      showWarning('This is a warning');

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  This is a warning')
      );
    });

    it('should display warning messages with details', () => {
      showWarning('Config not found', 'Using defaults');

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Config not found')
      );
      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using defaults')
      );
    });
  });

  describe('Info Messages', () => {
    it('should display info messages with default emoji', () => {
      showInfo('Information message');

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔵 Information message')
      );
    });

    it('should display info messages with custom emoji', () => {
      showInfo('Custom info', '🎯');

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎯 Custom info')
      );
    });
  });

  describe('Suggestion Messages', () => {
    it('should display command suggestions', () => {
      showSuggestion('Set up API key', 'gitty --set-key');

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('💡 Set up API key')
      );
      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('gitty --set-key')
      );
    });

    it('should work with provider-specific commands', () => {
      showSuggestion(
        'Configure OpenAI',
        `gitty --set-key --provider ${createTestData.provider.openai}`
      );

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('💡 Configure OpenAI')
      );
      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('--provider openai')
      );
    });
  });

  describe('Hint Messages', () => {
    it('should display hints with emoji', () => {
      showHint('Use --help for more options');

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('💡 Hint: Use --help for more options')
      );
    });
  });

  describe('Config Display', () => {
    it('should display config lines', () => {
      showConfigLine('Provider', createTestData.provider.openai);

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Provider:')
      );
      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('openai')
      );
    });

    it('should display section headers', () => {
      showSection('Configuration', '⚙️');

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚙️ Configuration')
      );
    });

    it('should display section headers with default emoji', () => {
      showSection('Settings');

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('📋 Settings')
      );
    });
  });

  describe('Provider Help', () => {
    it('should display OpenAI API key help', () => {
      showProviderHelp(createTestData.provider.openai);

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('💡 Get your openai API key at:')
      );
      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://platform.openai.com/api-keys')
      );
    });

    it('should display Gemini API key help', () => {
      showProviderHelp(createTestData.provider.gemini);

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('💡 Get your gemini API key at:')
      );
      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://aistudio.google.com/app/apikey')
      );
    });

    it('should handle unknown providers gracefully', () => {
      showProviderHelp('unknown-provider');

      // Should not show any API key URL for unknown providers
      expect(consoleSpy.consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('💡 Get your unknown-provider API key at:')
      );
    });
  });

  describe('Validation Errors', () => {
    it('should display validation errors with suggestions', () => {
      showValidationError('Invalid provider', createTestData.provider.openai, [
        createTestData.provider.openai,
        createTestData.provider.gemini,
      ]);

      expect(consoleSpy.consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error: Invalid provider')
      );
      expect(consoleSpy.consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('💡 Did you mean: openai')
      );
      expect(consoleSpy.consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('💡 Valid options: openai, gemini')
      );
    });

    it('should display validation errors without suggestions', () => {
      showValidationError('Invalid input');

      expect(consoleSpy.consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error: Invalid input')
      );
    });
  });

  describe('Goodbye Message', () => {
    it('should display goodbye message', () => {
      showGoodbye();

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Oh! OK - See you soon! 🐥')
      );
    });
  });

  describe('Integration with Test Data', () => {
    it('should work with all test providers', () => {
      [createTestData.provider.openai, createTestData.provider.gemini].forEach(
        provider => {
          showProviderHelp(provider);
          expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining(`💡 Get your ${provider} API key at:`)
          );
        }
      );
    });

    it('should handle provider-specific configuration display', () => {
      const config = createTestData.gittyConfig();

      showConfigLine('Default Provider', config.defaultProvider);
      showConfigLine('OpenAI Model', config.providers.openai.model);
      showConfigLine('Gemini Model', config.providers.gemini.model);

      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Default Provider:')
      );
      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('gpt-4o-mini')
      );
      expect(consoleSpy.consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('gemini-1.5-flash')
      );
    });
  });
});
