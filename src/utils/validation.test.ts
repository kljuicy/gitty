import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateTemperature,
  validateMaxTokens,
  validateProvider,
  validateStyle,
  validateLanguage,
  validateArgumentCombinations,
  validateRequired,
  validateOneOf,
  validateFilePath,
  validateUrl,
} from './validation';
import { createValidationTestHelpers } from '../__tests__/utils';
import type { MockedFunction } from 'vitest';
import type { IUI } from '../ui/ui';

// 🎯 Type-Safe Hoisted Mocks: Only define what we actually use!
const mocks = vi.hoisted(() => ({
  ui: {
    showValidationError: vi.fn() as MockedFunction<IUI['showValidationError']>,
    showError: vi.fn() as MockedFunction<IUI['showError']>,
    showWarning: vi.fn() as MockedFunction<IUI['showWarning']>,
    showHint: vi.fn() as MockedFunction<IUI['showHint']>,
    showSuggestion: vi.fn() as MockedFunction<IUI['showSuggestion']>,
  },
}));

// Clean vi.mock calls using our hoisted mocks
vi.mock('../ui/ui', () => mocks.ui);

describe('Validation Utilities', () => {
  const mockUI = mocks.ui;
  let processExitSpy: any;
  const validationHelpers = createValidationTestHelpers();

  beforeEach(() => {
    vi.clearAllMocks();
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit: 1');
    });
  });

  afterEach(() => {
    processExitSpy.mockRestore();
  });

  describe('validateTemperature', () => {
    it('should return valid temperature values', () => {
      // Use validation helper test data (convert numbers to strings)
      validationHelpers.testTemperature.valid.forEach(temp => {
        const result = validateTemperature(temp.toString());
        expect(result).toBe(temp);
      });
    });

    it('should reject invalid temperature values', () => {
      validationHelpers.testTemperature.invalid.forEach(temp => {
        expect(() => validateTemperature(temp as any)).toThrow(
          'process.exit: 1'
        );
      });
    });
  });

  describe('validateMaxTokens', () => {
    it('should return valid token values', () => {
      expect(validateMaxTokens('500')).toBe(500);
      expect(validateMaxTokens('1000')).toBe(1000);
      expect(validateMaxTokens('4096')).toBe(4096);
    });

    it('should reject non-numeric values', () => {
      expect(() => validateMaxTokens('invalid')).toThrow('process.exit: 1');

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Max tokens must be a number, got "invalid"'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Try --max-tokens 1000 (limits response length)'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject zero and negative values', () => {
      expect(() => validateMaxTokens('0')).toThrow('process.exit: 1');
      expect(() => validateMaxTokens('-100')).toThrow('process.exit: 1');

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Max tokens must be positive, got -100'
      );
    });

    it('should reject values too large', () => {
      expect(() => validateMaxTokens('100001')).toThrow('process.exit: 1');

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Max tokens too large (100001), maximum is 100,000'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Most providers support 2048-4096 tokens'
      );
    });
  });

  describe('validateProvider', () => {
    it('should return valid providers', () => {
      expect(validateProvider('openai')).toBe('openai');
      expect(validateProvider('gemini')).toBe('gemini');
    });

    it('should suggest correct provider for common aliases', () => {
      expect(() => validateProvider('gpt')).toThrow('process.exit: 1');
      expect(() => validateProvider('chatgpt')).toThrow('process.exit: 1');
      expect(() => validateProvider('google')).toThrow('process.exit: 1');

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Invalid provider "google"',
        '--provider gemini',
        ['openai', 'gemini']
      );
    });

    it('should handle unsupported providers', () => {
      expect(() => validateProvider('claude')).toThrow('process.exit: 1');

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Invalid provider "claude"'
      );
      expect(mockUI.showWarning).toHaveBeenCalledWith(
        'claude is not supported yet'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Use one of: openai, gemini'
      );
    });

    it('should handle unknown providers', () => {
      expect(() => validateProvider('unknown')).toThrow('process.exit: 1');

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Invalid provider "unknown"',
        undefined,
        ['openai', 'gemini']
      );
    });
  });

  describe('validateStyle', () => {
    it('should return valid styles', () => {
      expect(validateStyle('concise')).toBe('concise');
      expect(validateStyle('detailed')).toBe('detailed');
      expect(validateStyle('funny')).toBe('funny');
    });

    it('should suggest correct style for common aliases', () => {
      expect(() => validateStyle('brief')).toThrow('process.exit: 1');
      expect(() => validateStyle('verbose')).toThrow('process.exit: 1');
      expect(() => validateStyle('humorous')).toThrow('process.exit: 1');

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Invalid style "humorous"',
        '--style funny',
        ['concise', 'detailed', 'funny']
      );
    });

    it('should handle unknown styles', () => {
      expect(() => validateStyle('unknown')).toThrow('process.exit: 1');

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Invalid style "unknown"',
        undefined,
        ['concise', 'detailed', 'funny']
      );
    });
  });

  describe('validateLanguage', () => {
    it('should return valid language codes', () => {
      expect(validateLanguage('en')).toBe('en');
      expect(validateLanguage('es')).toBe('es');
      expect(validateLanguage('fr')).toBe('fr');
      expect(validateLanguage('de')).toBe('de');
    });

    it('should reject invalid format', () => {
      expect(() => validateLanguage('english')).toThrow('process.exit: 1');
      expect(() => validateLanguage('EN')).toThrow('process.exit: 1');
      expect(() => validateLanguage('e')).toThrow('process.exit: 1');

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Invalid language code "EN"',
        '--language en'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Use 2-letter ISO codes (e.g., en, es, fr, de)'
      );
    });

    it('should suggest correct codes for language names', () => {
      expect(() => validateLanguage('spanish')).toThrow('process.exit: 1');

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Invalid language code "spanish"',
        '--language es'
      );
    });
  });

  describe('validateArgumentCombinations', () => {
    it('should pass valid single commands', () => {
      expect(() =>
        validateArgumentCombinations({ setKey: true, provider: 'openai' })
      ).not.toThrow();
      expect(() =>
        validateArgumentCombinations({ setProvider: true })
      ).not.toThrow();
      expect(() =>
        validateArgumentCombinations({ addRepo: true, preset: 'work' })
      ).not.toThrow();
    });

    it('should pass valid prepend combinations', () => {
      expect(() =>
        validateArgumentCombinations({ prepend: 'PROJ-', forcePrepend: true })
      ).not.toThrow();
      expect(() =>
        validateArgumentCombinations({ prepend: 'PROJ-', forcePrepend: false })
      ).not.toThrow();
      expect(() =>
        validateArgumentCombinations({ prepend: 'PROJ-' })
      ).not.toThrow();
      expect(() =>
        validateArgumentCombinations({ prepend: '', forcePrepend: true })
      ).not.toThrow();
    });

    it('should require preset for add-repo', () => {
      expect(() => validateArgumentCombinations({ addRepo: true })).toThrow(
        'process.exit: 1'
      );

      expect(mockUI.showError).toHaveBeenCalledWith(
        '--add-repo requires -P <preset>'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Example: gitty --add-repo -P work'
      );
    });

    it('should require prepend for force-prepend', () => {
      expect(() =>
        validateArgumentCombinations({ forcePrepend: true })
      ).toThrow('process.exit: 1');

      expect(mockUI.showError).toHaveBeenCalledWith(
        '--force-prepend requires -p/--prepend'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Example: gitty -p "HOTFIX-" -f'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Force prepend completely replaces config prepend instead of appending'
      );
    });

    it('should reject conflicting commands', () => {
      expect(() =>
        validateArgumentCombinations({
          setKey: true,
          setProvider: true,
        })
      ).toThrow('process.exit: 1');

      expect(mockUI.showError).toHaveBeenCalledWith(
        'Cannot use multiple commands together'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Found: --set-key, --set-provider'
      );
    });

    it('should reject unsupported provider with set-key', () => {
      expect(() =>
        validateArgumentCombinations({
          setKey: true,
          provider: 'claude',
        })
      ).toThrow('process.exit: 1');

      expect(mockUI.showError).toHaveBeenCalledWith(
        'Cannot set API key for unsupported provider "claude"'
      );
    });
  });

  describe('validateRequired', () => {
    it('should return trimmed valid values', () => {
      expect(validateRequired('value', 'Field')).toBe('value');
      expect(validateRequired('  value  ', 'Field')).toBe('value');
    });

    it('should reject empty values', () => {
      expect(() => validateRequired('', 'Field')).toThrow('process.exit: 1');
      expect(() => validateRequired('   ', 'Field')).toThrow('process.exit: 1');
      expect(() => validateRequired(undefined, 'Field')).toThrow(
        'process.exit: 1'
      );

      expect(mockUI.showError).toHaveBeenCalledWith('Field is required');
    });
  });

  describe('validateOneOf', () => {
    it('should return valid options', () => {
      const options = ['option1', 'option2', 'option3'] as const;
      expect(validateOneOf('option1', options, 'field')).toBe('option1');
      expect(validateOneOf('option2', options, 'field')).toBe('option2');
    });

    it('should reject invalid options', () => {
      const options = ['option1', 'option2'] as const;
      expect(() => validateOneOf('invalid', options, 'field')).toThrow(
        'process.exit: 1'
      );

      expect(mockUI.showValidationError).toHaveBeenCalledWith(
        'Invalid field "invalid"',
        undefined,
        ['option1', 'option2']
      );
    });
  });

  describe('validateFilePath', () => {
    it('should return valid file paths', async () => {
      // Mock fs.access to succeed
      const mockAccess = vi.fn().mockResolvedValue(undefined);
      vi.doMock('fs/promises', () => ({ access: mockAccess }));

      const result = await validateFilePath('/valid/path');
      expect(result).toBe('/valid/path');
    });

    it('should reject non-existent files', async () => {
      // Mock fs.access to fail
      const mockAccess = vi.fn().mockRejectedValue(new Error('ENOENT'));
      vi.doMock('fs/promises', () => ({ access: mockAccess }));

      await expect(validateFilePath('/invalid/path')).rejects.toThrow(
        'process.exit: 1'
      );
      expect(mockUI.showError).toHaveBeenCalledWith(
        'File not found: /invalid/path'
      );
    });
  });

  describe('validateUrl', () => {
    it('should return valid URLs', () => {
      expect(validateUrl('https://example.com')).toBe('https://example.com');
      expect(validateUrl('http://localhost:3000')).toBe(
        'http://localhost:3000'
      );
      expect(validateUrl('ftp://files.example.com')).toBe(
        'ftp://files.example.com'
      );
    });

    it('should reject invalid URLs', () => {
      expect(() => validateUrl('not-a-url')).toThrow('process.exit: 1');
      expect(() => validateUrl('just text')).toThrow('process.exit: 1');

      expect(mockUI.showError).toHaveBeenCalledWith(
        'Invalid URL format: just text'
      );
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle temperature boundary values correctly', () => {
      expect(validateTemperature('0.0')).toBe(0);
      expect(validateTemperature('2.0')).toBe(2);
      expect(() => validateTemperature('-0.00001')).toThrow();
      expect(() => validateTemperature('2.00001')).toThrow();
    });

    it('should handle max tokens boundary values', () => {
      expect(validateMaxTokens('1')).toBe(1);
      expect(validateMaxTokens('100000')).toBe(100000);
      expect(() => validateMaxTokens('0')).toThrow();
      expect(() => validateMaxTokens('100001')).toThrow();
    });

    it('should handle case sensitivity in providers and styles', () => {
      expect(() => validateProvider('OpenAI')).toThrow();
      expect(() => validateProvider('GEMINI')).toThrow();
      expect(() => validateStyle('CONCISE')).toThrow();
      expect(() => validateStyle('Detailed')).toThrow();
    });

    it('should handle whitespace in required fields', () => {
      expect(validateRequired('  valid  ', 'field')).toBe('valid');
      expect(() => validateRequired('  ', 'field')).toThrow();
      expect(() => validateRequired('\t\n', 'field')).toThrow();
    });
  });
});
