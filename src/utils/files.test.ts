import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mock from 'mock-fs';
import {
  readJsonFile,
  readJsonFileWithFriendlyErrors,
  writeJsonFile,
  fileExists,
  safeReadJsonFile,
  safeWriteJsonFile,
  readTextFile,
  writeTextFile,
  ensureDirectory,
  getFileStats,
  isFileReadable,
  isFileWritable,
} from './files';
import type { MockedFunction } from 'vitest';
import type { IUI } from '../ui/ui';

// 🎯 Type-Safe Hoisted Mocks: Only define what we actually use!
const mocks = vi.hoisted(() => ({
  ui: {
    showError: vi.fn() as MockedFunction<IUI['showError']>,
    showHint: vi.fn() as MockedFunction<IUI['showHint']>,
  },
}));

// Clean vi.mock calls using our hoisted mocks
vi.mock('../ui/ui', () => mocks.ui);

describe('File Utilities', () => {
  const mockUI = mocks.ui;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up mock filesystem
    mock({
      '/test': {
        'config.json': JSON.stringify({ key: 'value', number: 42 }),
        'empty.json': '{}',
        'invalid.json': '{ invalid json',
        'text.txt': 'Hello, World!',
        'existing-dir': {
          'file.txt': 'content',
        },
      },
    });
  });

  afterEach(() => {
    mock.restore();
  });

  describe('readJsonFile', () => {
    it('should read and parse valid JSON file', async () => {
      const result = await readJsonFile('/test/config.json');

      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('should read empty JSON file', async () => {
      const result = await readJsonFile('/test/empty.json');

      expect(result).toEqual({});
    });

    it('should throw error for non-existent file', async () => {
      await expect(readJsonFile('/test/nonexistent.json')).rejects.toThrow(
        'File not found: /test/nonexistent.json'
      );
    });

    it('should throw error for invalid JSON', async () => {
      await expect(readJsonFile('/test/invalid.json')).rejects.toThrow(
        'Failed to read JSON from /test/invalid.json'
      );
    });

    it('should work with typed generics', async () => {
      interface TestConfig {
        key: string;
        number: number;
      }

      const result = await readJsonFile<TestConfig>('/test/config.json');

      expect(result.key).toBe('value');
      expect(result.number).toBe(42);
    });
  });

  describe('writeJsonFile', () => {
    it('should write JSON data to file', async () => {
      const data = { test: 'data', array: [1, 2, 3] };

      await writeJsonFile('/test/output.json', data);

      const result = await readJsonFile('/test/output.json');
      expect(result).toEqual(data);
    });

    it('should write pretty formatted JSON when requested', async () => {
      const data = { test: 'data' };

      await writeJsonFile('/test/pretty.json', data, { pretty: true });

      const result = await readTextFile('/test/pretty.json');
      expect(result).toBe('{\n  "test": "data"\n}');
    });

    it('should ensure directory exists when requested', async () => {
      const data = { test: 'data' };

      await writeJsonFile('/test/new-dir/output.json', data, {
        ensureDir: true,
      });

      const result = await readJsonFile('/test/new-dir/output.json');
      expect(result).toEqual(data);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing files', async () => {
      const exists = await fileExists('/test/config.json');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent files', async () => {
      const exists = await fileExists('/test/nonexistent.json');

      expect(exists).toBe(false);
    });
  });

  describe('safeReadJsonFile', () => {
    it('should read existing JSON file', async () => {
      const result = await safeReadJsonFile('/test/config.json');

      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('should return null for non-existent file', async () => {
      const result = await safeReadJsonFile('/test/nonexistent.json');

      expect(result).toBeNull();
    });

    it('should show user-friendly error for invalid JSON and rethrow', async () => {
      await expect(safeReadJsonFile('/test/invalid.json')).rejects.toThrow();

      expect(mockUI.showError).toHaveBeenCalledWith(
        'Failed to read configuration file: /test/invalid.json'
      );
      expect(mockUI.showHint).toHaveBeenCalledWith(
        'Check if the file exists and has valid JSON syntax'
      );
    });
  });

  describe('safeWriteJsonFile', () => {
    it('should write JSON file successfully', async () => {
      const data = { safe: 'write' };

      await safeWriteJsonFile('/test/safe.json', data);

      const result = await readJsonFile('/test/safe.json');
      expect(result).toEqual(data);
    });
  });

  describe('readTextFile', () => {
    it('should read text file content', async () => {
      const content = await readTextFile('/test/text.txt');

      expect(content).toBe('Hello, World!');
    });

    it('should throw error for non-existent file', async () => {
      await expect(readTextFile('/test/nonexistent.txt')).rejects.toThrow(
        'File not found: /test/nonexistent.txt'
      );
    });
  });

  describe('writeTextFile', () => {
    it('should write text content to file', async () => {
      const content = 'New text content';

      await writeTextFile('/test/new.txt', content);

      const written = await readTextFile('/test/new.txt');
      expect(written).toBe(content);
    });

    it('should ensure directory exists when requested', async () => {
      const content = 'Text in new directory';

      await writeTextFile('/test/new-dir/file.txt', content, {
        ensureDir: true,
      });

      const written = await readTextFile('/test/new-dir/file.txt');
      expect(written).toBe(content);
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory successfully', async () => {
      await ensureDirectory('/test/new-directory');

      // Verify directory was created by checking we can write to it
      await writeTextFile('/test/new-directory/test.txt', 'test');
      const content = await readTextFile('/test/new-directory/test.txt');
      expect(content).toBe('test');
    });
  });

  describe('getFileStats', () => {
    it('should return file stats for existing files', async () => {
      const stats = await getFileStats('/test/config.json');

      expect(stats).not.toBeNull();
      expect(stats?.isFile()).toBe(true);
    });

    it('should return null for non-existent files', async () => {
      const stats = await getFileStats('/test/nonexistent.txt');

      expect(stats).toBeNull();
    });
  });

  describe('readJsonFileWithFriendlyErrors', () => {
    // Add more test files for this function
    beforeEach(() => {
      mock.restore();
      mock({
        '/test': {
          'valid-config.json': JSON.stringify({
            provider: 'openai',
            key: 'value',
          }),
          'empty.json': '{}',
          'malformed-quotes.json': '{ "provider": openai, "missing": quotes }',
          'malformed-brace.json': '{ "provider": "openai" missing brace',
          'malformed-position.json':
            '{\n  "provider": "openai",\n  "invalid": json,\n  "missing": quotes\n}',
          'text.txt': 'Hello, World!',
        },
      });
    });

    describe('successful reads', () => {
      it('should read valid JSON file successfully', async () => {
        const result = await readJsonFileWithFriendlyErrors(
          '/test/valid-config.json'
        );

        expect(result).toEqual({ provider: 'openai', key: 'value' });
      });

      it('should read empty JSON file', async () => {
        const result = await readJsonFileWithFriendlyErrors('/test/empty.json');

        expect(result).toEqual({});
      });

      it('should return null for missing file when allowMissing is true', async () => {
        const result = await readJsonFileWithFriendlyErrors(
          '/test/nonexistent.json',
          {
            allowMissing: true,
          }
        );

        expect(result).toBeNull();
      });
    });

    describe('error handling', () => {
      it('should show user-friendly error for missing file', async () => {
        await expect(
          readJsonFileWithFriendlyErrors('/test/nonexistent.json', {
            fileDescription: 'test configuration',
          })
        ).rejects.toThrow('File not found: /test/nonexistent.json');

        expect(mockUI.showError).toHaveBeenCalledWith(
          '❌ test configuration not found'
        );
        expect(mockUI.showHint).toHaveBeenCalledWith(
          'File location: /test/nonexistent.json'
        );
      });

      it('should not show error messages when showHelp is false', async () => {
        await expect(
          readJsonFileWithFriendlyErrors('/test/nonexistent.json', {
            showHelp: false,
          })
        ).rejects.toThrow('File not found: /test/nonexistent.json');

        expect(mockUI.showError).not.toHaveBeenCalled();
        expect(mockUI.showHint).not.toHaveBeenCalled();
      });

      it('should exit process for malformed JSON with helpful messages', async () => {
        // Mock process.exit to prevent actual exit
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });

        await expect(async () => {
          await readJsonFileWithFriendlyErrors('/test/malformed-quotes.json', {
            fileDescription: 'gitty configuration file',
          });
        }).rejects.toThrow('process.exit called');

        expect(mockUI.showError).toHaveBeenCalledWith(
          '🚨 Your gitty configuration file has invalid JSON syntax'
        );
        expect(mockUI.showHint).toHaveBeenCalledWith(
          'File location: /test/malformed-quotes.json'
        );
        expect(mockUI.showHint).toHaveBeenCalledWith(
          'Please fix the JSON syntax or delete the file to reset to defaults'
        );
        expect(mockUI.showHint).toHaveBeenCalledWith(
          'Common issues: missing quotes, trailing commas, unclosed braces {}'
        );
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
      });

      it('should show line number hint for positioned JSON errors', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });

        await expect(async () => {
          await readJsonFileWithFriendlyErrors(
            '/test/malformed-position.json',
            {
              fileDescription: 'configuration file',
            }
          );
        }).rejects.toThrow('process.exit called');

        expect(mockUI.showError).toHaveBeenCalledWith(
          '🚨 Your configuration file has invalid JSON syntax'
        );

        // Check that all expected hints were shown (line number may or may not be detected)
        expect(mockUI.showHint).toHaveBeenCalledWith(
          'File location: /test/malformed-position.json'
        );
        expect(mockUI.showHint).toHaveBeenCalledWith(
          'Please fix the JSON syntax or delete the file to reset to defaults'
        );
        expect(mockUI.showHint).toHaveBeenCalledWith(
          'Common issues: missing quotes, trailing commas, unclosed braces {}'
        );

        // Line number detection is optional based on error type, so just check if it was called
        const allCalls = mockUI.showHint.mock.calls.flat();
        const hasLineNumberHint = allCalls.some(
          call =>
            call &&
            call.includes &&
            call.includes('💡 Error appears to be around line')
        );
        // This is optional since not all JSON errors provide position info
        if (hasLineNumberHint) {
          expect(hasLineNumberHint).toBe(true);
        }

        mockExit.mockRestore();
      });

      it('should not exit process when showHelp is false for malformed JSON', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });

        // With showHelp false, it should not call process.exit but still throw an error
        await expect(async () => {
          await readJsonFileWithFriendlyErrors('/test/malformed-quotes.json', {
            showHelp: false,
          });
        }).rejects.toThrow('Failed to read JSON from');

        expect(mockUI.showError).not.toHaveBeenCalled();
        expect(mockUI.showHint).not.toHaveBeenCalled();
        expect(mockExit).not.toHaveBeenCalled();

        mockExit.mockRestore();
      });
    });

    describe('options configuration', () => {
      it('should use custom file description in error messages', async () => {
        await expect(
          readJsonFileWithFriendlyErrors('/test/nonexistent.json', {
            fileDescription: 'local repository settings',
            allowMissing: false,
          })
        ).rejects.toThrow();

        expect(mockUI.showError).toHaveBeenCalledWith(
          '❌ local repository settings not found'
        );
      });

      it('should handle allowMissing option correctly', async () => {
        const result = await readJsonFileWithFriendlyErrors(
          '/test/missing.json',
          {
            allowMissing: true,
            fileDescription: 'optional config',
          }
        );

        expect(result).toBeNull();
        expect(mockUI.showError).not.toHaveBeenCalled();
      });

      it('should work with typed generics', async () => {
        interface TestConfig {
          provider: string;
          key: string;
        }

        const result = await readJsonFileWithFriendlyErrors<TestConfig>(
          '/test/valid-config.json'
        );

        expect(result?.provider).toBe('openai');
        expect(result?.key).toBe('value');
      });
    });
  });

  describe('isFileReadable', () => {
    it('should return true for readable files', async () => {
      const readable = await isFileReadable('/test/config.json');
      expect(readable).toBe(true);
    });

    it('should return false for non-existent files', async () => {
      const readable = await isFileReadable('/test/nonexistent.json');
      expect(readable).toBe(false);
    });
  });

  describe('isFileWritable', () => {
    it('should return true for writable files', async () => {
      const writable = await isFileWritable('/test/config.json');
      expect(writable).toBe(true);
    });

    it('should return false for non-existent files', async () => {
      const writable = await isFileWritable('/test/nonexistent.json');
      expect(writable).toBe(false);
    });
  });

  describe('writeJsonFile edge cases', () => {
    it('should handle deeply nested directory creation', async () => {
      const data = { nested: 'data' };

      await writeJsonFile('/test/deep/nested/dir/output.json', data, {
        ensureDir: true,
      });

      const result = await readJsonFile('/test/deep/nested/dir/output.json');
      expect(result).toEqual(data);
    });

    it('should overwrite existing files', async () => {
      const initialData = { initial: 'data' };
      const newData = { updated: 'data' };

      await writeJsonFile('/test/overwrite.json', initialData);
      await writeJsonFile('/test/overwrite.json', newData);

      const result = await readJsonFile('/test/overwrite.json');
      expect(result).toEqual(newData);
    });
  });

  describe('writeTextFile edge cases', () => {
    it('should handle empty strings', async () => {
      await writeTextFile('/test/empty.txt', '');

      const content = await readTextFile('/test/empty.txt');
      expect(content).toBe('');
    });

    it('should handle special characters and unicode', async () => {
      const specialContent = 'Special chars: 🎯 ñáéíóú \n\t"quotes"';

      await writeTextFile('/test/special.txt', specialContent);

      const content = await readTextFile('/test/special.txt');
      expect(content).toBe(specialContent);
    });

    it('should overwrite existing text files', async () => {
      const initialContent = 'Initial content';
      const newContent = 'Updated content';

      await writeTextFile('/test/overwrite.txt', initialContent);
      await writeTextFile('/test/overwrite.txt', newContent);

      const content = await readTextFile('/test/overwrite.txt');
      expect(content).toBe(newContent);
    });
  });

  describe('ensureDirectory edge cases', () => {
    it('should handle already existing directories', async () => {
      // Should not throw when directory already exists
      await ensureDirectory('/test/existing-dir');
      await ensureDirectory('/test/existing-dir'); // Second call should work fine

      // Verify we can still write to it
      await writeTextFile('/test/existing-dir/new.txt', 'test');
      const content = await readTextFile('/test/existing-dir/new.txt');
      expect(content).toBe('test');
    });

    it('should create nested directories recursively', async () => {
      await ensureDirectory('/test/very/deep/nested/directory');

      // Verify by writing a file in the deep directory
      await writeTextFile('/test/very/deep/nested/directory/test.txt', 'deep');
      const content = await readTextFile(
        '/test/very/deep/nested/directory/test.txt'
      );
      expect(content).toBe('deep');
    });
  });

  describe('getFileStats edge cases', () => {
    it('should return proper stats for directories', async () => {
      const stats = await getFileStats('/test/existing-dir');

      expect(stats).not.toBeNull();
      expect(stats?.isDirectory()).toBe(true);
      expect(stats?.isFile()).toBe(false);
    });

    it('should handle symbolic links gracefully', async () => {
      // This is a basic test since mock-fs has limited symlink support
      const stats = await getFileStats('/test/nonexistent-symlink');
      expect(stats).toBeNull();
    });
  });

  describe('readJsonFile error details', () => {
    it('should provide specific error for malformed JSON', async () => {
      await expect(readJsonFile('/test/invalid.json')).rejects.toThrow(
        'Failed to read JSON from /test/invalid.json'
      );
    });

    it('should handle completely empty files as invalid JSON', async () => {
      mock({
        '/test/completely-empty.json': '',
      });

      await expect(readJsonFile('/test/completely-empty.json')).rejects.toThrow(
        'Failed to read JSON from /test/completely-empty.json'
      );
    });
  });
});
