import { describe, it, expect, vi, beforeEach } from 'vitest';
import inquirer from 'inquirer';
import {
  showCommitMenu,
  confirmCommit,
  showDiffPreview,
  askForAdditionalPrepend,
} from './menu';
import type { CommitMessage } from '../types/index';
import { testSigintHandling, setupConsoleSpy } from '../__tests__/utils';
import type { MockedFunction } from 'vitest';
import type { IChalk, IInquirer } from '../__tests__/interfaces';

// 🎯 Type-Safe Hoisted Mocks: Only define what menu.ts actually uses!
const mocks = vi.hoisted(() => ({
  inquirer: {
    default: {
      prompt: vi.fn() as MockedFunction<IInquirer['prompt']>,
      Separator: vi.fn() as MockedFunction<IInquirer['Separator']>,
    } satisfies Partial<IInquirer>,
    prompt: vi.fn() as MockedFunction<IInquirer['prompt']>,
    Separator: vi.fn() as MockedFunction<IInquirer['Separator']>,
  },
  chalk: {
    default: {
      green: vi.fn((text: string) => text) as MockedFunction<IChalk['green']>,
      blue: vi.fn((text: string) => text) as MockedFunction<IChalk['blue']>,
      yellow: vi.fn((text: string) => text) as MockedFunction<IChalk['yellow']>,
      red: vi.fn((text: string) => text) as MockedFunction<IChalk['red']>,
      gray: vi.fn((text: string) => text) as MockedFunction<IChalk['gray']>,
      cyan: vi.fn((text: string) => text) as MockedFunction<IChalk['cyan']>,
      white: {
        bold: vi.fn((text: string) => text) as MockedFunction<
          IChalk['white']['bold']
        >,
      } as IChalk['white'],
    } satisfies Partial<IChalk>,
  },
}));

// Apply hoisted mocks
vi.mock('inquirer', () => mocks.inquirer);
vi.mock('chalk', () => mocks.chalk);

const mockedInquirer = vi.mocked(inquirer);

describe('Menu SIGINT Handling', () => {
  const consoleSpy = setupConsoleSpy();

  beforeEach(() => {
    // Properly mock the Separator
    mockedInquirer.Separator = vi.fn(() => ({
      type: 'separator',
      line: '---',
      isSeparator: true,
    })) as any;

    vi.clearAllMocks();
  });

  // Test data using our centralized utilities
  const testCommitMessages: CommitMessage[] = [
    { message: 'feat: add user authentication system', confidence: 0.9 },
    { message: 'fix: resolve login validation bug', confidence: 0.8 },
  ];

  describe('showCommitMenu', () => {
    it('should show friendly goodbye message on SIGINT', async () => {
      mockedInquirer.prompt.mockRejectedValue(
        new Error('User force closed the prompt with SIGINT')
      );

      try {
        await showCommitMenu(testCommitMessages);
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      testSigintHandling.expectGracefulExit(
        consoleSpy.consoleLogSpy,
        consoleSpy.processExitSpy
      );
    });

    it('should handle other errors normally', async () => {
      const networkError = new Error('Network error');
      mockedInquirer.prompt.mockRejectedValue(networkError);

      await expect(showCommitMenu(testCommitMessages)).rejects.toThrow(
        'Network error'
      );
      testSigintHandling.expectNoGracefulExit(
        consoleSpy.consoleLogSpy,
        consoleSpy.processExitSpy
      );
    });

    it('should return selected commit message', async () => {
      mockedInquirer.prompt.mockResolvedValue({ action: 0 });

      const result = await showCommitMenu(testCommitMessages);

      expect(result).toEqual({ index: 0, action: 'select' });
    });

    it('should handle edit action', async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ editIndex: 1 })
        .mockResolvedValueOnce({ editedMessage: 'Updated commit message' });

      const result = await showCommitMenu(testCommitMessages);

      expect(result).toEqual({
        index: 1,
        action: 'edit',
        editedMessage: 'Updated commit message',
      });
    });
  });

  describe('confirmCommit', () => {
    it('should show friendly goodbye message on SIGINT', async () => {
      mockedInquirer.prompt.mockRejectedValue(
        new Error('Prompt was canceled with SIGINT')
      );

      try {
        await confirmCommit('test message');
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      testSigintHandling.expectGracefulExit(
        consoleSpy.consoleLogSpy,
        consoleSpy.processExitSpy
      );
    });

    it('should return true when user confirms', async () => {
      mockedInquirer.prompt.mockResolvedValue({ confirm: true });

      const result = await confirmCommit('feat: add new feature');

      expect(result).toBe(true);
    });

    it('should return false when user declines', async () => {
      mockedInquirer.prompt.mockResolvedValue({ confirm: false });

      const result = await confirmCommit('feat: add new feature');

      expect(result).toBe(false);
    });
  });

  describe('showDiffPreview', () => {
    it('should show friendly goodbye message on SIGINT', async () => {
      mockedInquirer.prompt.mockRejectedValue(
        new Error('force closed the prompt')
      );

      try {
        await showDiffPreview('diff content', ['file1.js']);
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      testSigintHandling.expectGracefulExit(
        consoleSpy.consoleLogSpy,
        consoleSpy.processExitSpy
      );
    });

    it('should return true when user proceeds', async () => {
      mockedInquirer.prompt.mockResolvedValue({ proceed: true });

      const result = await showDiffPreview('+ added line\n- removed line', [
        'src/auth.js',
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user cancels', async () => {
      mockedInquirer.prompt.mockResolvedValue({ proceed: false });

      const result = await showDiffPreview('+ added line', ['src/auth.js']);

      expect(result).toBe(false);
    });
  });

  describe('askForAdditionalPrepend', () => {
    it('should show friendly goodbye message on SIGINT', async () => {
      mockedInquirer.prompt.mockRejectedValue(new Error('SIGINT received'));

      try {
        await askForAdditionalPrepend('TEST-');
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      testSigintHandling.expectGracefulExit(
        consoleSpy.consoleLogSpy,
        consoleSpy.processExitSpy
      );
    });

    it('should return null for empty prepend without calling inquirer', async () => {
      const result = await askForAdditionalPrepend('');

      expect(result).toBeNull();
      expect(mockedInquirer.prompt).not.toHaveBeenCalled();
    });

    it('should return additional text when user provides it', async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ wantToAdd: true })
        .mockResolvedValueOnce({ addition: 'TICKET-123' });

      const result = await askForAdditionalPrepend('FEAT-');

      expect(result).toBe('TICKET-123');
    });

    it('should return null when user declines to add', async () => {
      mockedInquirer.prompt.mockResolvedValue({ wantToAdd: false });

      const result = await askForAdditionalPrepend('FEAT-');

      expect(result).toBeNull();
    });
  });

  describe('SIGINT error message variations', () => {
    it.each([
      'User force closed the prompt with SIGINT',
      'Prompt was canceled',
      'SIGINT received',
      'force closed',
    ])('should handle SIGINT error: %s', async errorMessage => {
      mockedInquirer.prompt.mockRejectedValue(new Error(errorMessage));

      try {
        await confirmCommit('test');
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
      }

      testSigintHandling.expectGracefulExit(
        consoleSpy.consoleLogSpy,
        consoleSpy.processExitSpy
      );
    });
  });
});
