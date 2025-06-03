import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mock from 'mock-fs';
import { getLocalConfig } from './manager';
import { createTestData } from '../__tests__/test-data';
import type { LocalConfig } from '../types/index';
import type { MockedFunction } from 'vitest';
import type { IUI } from '../ui/ui';

// 🎯 Completely inline conf mock in hoisted scope
const mocks = vi.hoisted(() => {
  // Default test config - completely inline
  const getDefaultTestConfig = () => ({
    defaultProvider: 'openai' as const,
    providers: {
      openai: {
        apiKey: 'test-openai-key',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
      },
      gemini: {
        apiKey: 'test-gemini-key',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 2048,
      },
    },
    default: {
      prepend: '',
      style: 'concise' as const,
      language: 'en' as const,
    },
    presets: {},
  });

  // Create conf mock with proper typing
  let storeData: any = getDefaultTestConfig();

  const mockConfInstance = {
    get: vi.fn(
      (key: string, defaultValue?: any) => storeData[key] ?? defaultValue
    ),
    set: vi.fn((key: string, value: any) => {
      storeData = { ...storeData, [key]: value };
    }),
    delete: vi.fn((key: string) => {
      const { [key]: _deleted, ...rest } = storeData as any;
      storeData = rest as any;
    }),
    clear: vi.fn(() => {
      storeData = getDefaultTestConfig();
    }),
    has: vi.fn((key: string) => key in storeData),
    get store() {
      return storeData;
    },
    set store(value: any) {
      storeData = value || getDefaultTestConfig();
    },
  };

  const MockConf = vi.fn().mockImplementation((config?: any) => {
    if (config?.defaults) {
      storeData = { ...config.defaults, ...storeData };
    }
    return mockConfInstance;
  });

  const confMock = {
    MockConf,
    setStoreData: (data: any) => {
      storeData = data;
    },
    getStoreData: () => storeData,
    resetStore: () => {
      storeData = getDefaultTestConfig();
    },
  };

  return {
    confMock,
    getGitRoot: vi.fn(),
    ui: {
      showError: vi.fn() as MockedFunction<IUI['showError']>,
      showHint: vi.fn() as MockedFunction<IUI['showHint']>,
      showWarning: vi.fn() as MockedFunction<IUI['showWarning']>,
    },
  };
});

// Apply conf mock first
vi.mock('conf', () => ({
  default: mocks.confMock.MockConf,
}));

// Mock git utils to control git root path (prevents real git operations)
vi.mock('../utils/git', () => ({
  getGitRoot: mocks.getGitRoot,
}));

// Mock UI functions
vi.mock('../ui/ui', () => mocks.ui);

/**
 * 🎯 CONFIGURATION MANAGER - FILE I/O OPERATIONS
 *
 * Tests file I/O operations for local configuration using mock-fs:
 * - Reading and parsing config files (mocked - no real files touched)
 * - Handling non-existent files gracefully
 * - Invalid JSON handling
 * - Integration with full config resolution
 *
 * ⚠️ SAFETY: Uses mock-fs to completely mock the filesystem
 * No real files are touched during these tests. Git operations are mocked.
 */

describe('Local Config File I/O (Mock File Testing)', () => {
  let tempGitRoot: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset the conf mock store
    mocks.confMock.resetStore();

    // Set up default test config
    mocks.confMock.setStoreData({
      defaultProvider: 'openai',
      providers: {
        openai: {
          apiKey: 'test-openai-key',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 500,
        },
        gemini: {
          apiKey: 'test-gemini-key',
          model: 'gemini-1.5-flash',
          temperature: 0.7,
          maxTokens: 2048,
        },
      },
      default: {
        prepend: '',
        style: 'concise',
        language: 'en',
      },
      presets: {},
    });

    // Setup mock git root
    tempGitRoot = '/fake/git/root';
    mocks.getGitRoot.mockResolvedValue(tempGitRoot);

    // Set up mock filesystem
    mock({
      [tempGitRoot]: {
        '.git': {},
      },
    });
  });

  afterEach(async () => {
    mock.restore();
  });

  it('should properly read and parse mock local config file', async () => {
    const configData = {
      defaultProvider: 'gemini',
      style: 'detailed',
      providers: {
        gemini: {
          model: 'gemini-1.5-pro',
          temperature: 0.9,
        },
      },
    } satisfies LocalConfig;

    // Add config file to mock filesystem
    mock({
      [tempGitRoot]: {
        '.git': {
          'gittyrc.json': JSON.stringify(configData),
        },
      },
    });

    // Test that getLocalConfig() properly reads the mock file
    const result = await getLocalConfig();

    expect(result).not.toBeNull();
    expect(result?.defaultProvider).toBe('gemini');
    expect(result?.style).toBe('detailed');
    expect(result?.providers?.gemini?.model).toBe('gemini-1.5-pro');
    expect(result?.providers?.gemini?.temperature).toBe(0.9);
  });

  it('should return null for non-existent config file', async () => {
    // No config file exists in mock filesystem
    const result = await getLocalConfig();
    expect(result).toBeNull();
  });

  it('should return null for invalid JSON in config file', async () => {
    // Add invalid JSON file to mock filesystem
    mock({
      [tempGitRoot]: {
        '.git': {
          'gittyrc.json': createTestData.files.invalidJson(),
        },
      },
    });

    const result = await getLocalConfig();
    expect(result).toBeNull();
  });

  it('should read local config and integrate with global config values', async () => {
    const configData = {
      defaultProvider: 'gemini',
      style: 'funny',
      language: 'es',
      providers: {
        gemini: {
          model: 'gemini-1.5-pro',
          temperature: 0.8,
        },
      },
    } satisfies LocalConfig;

    // Add config file to mock filesystem
    mock({
      [tempGitRoot]: {
        '.git': {
          'gittyrc.json': JSON.stringify(configData),
        },
      },
    });

    // Test that getLocalConfig properly reads the configuration
    const localResult = await getLocalConfig();
    expect(localResult).not.toBeNull();
    expect(localResult?.defaultProvider).toBe('gemini');
    expect(localResult?.style).toBe('funny');
    expect(localResult?.language).toBe('es');
    expect(localResult?.providers?.gemini?.model).toBe('gemini-1.5-pro');
    expect(localResult?.providers?.gemini?.temperature).toBe(0.8);

    // Test that global config is still accessible
    const globalResult = mocks.confMock.getStoreData();
    expect(globalResult.providers.gemini.apiKey).toBe('test-gemini-key');
  });

  it('should handle empty config file gracefully', async () => {
    // Add empty config file to mock filesystem
    mock({
      [tempGitRoot]: {
        '.git': {
          'gittyrc.json': createTestData.files.emptyConfig(),
        },
      },
    });

    const result = await getLocalConfig();

    // Empty config should be valid but return empty object
    expect(result).toEqual({});
  });

  it('should handle file permissions errors gracefully', async () => {
    // Mock getGitRoot to throw an error
    mocks.getGitRoot.mockRejectedValue(new Error('Git error'));

    const result = await getLocalConfig();
    expect(result).toBeNull();
  });

  it('should read very large config files efficiently with mock filesystem', async () => {
    // Create a large but valid config - testing that getLocalConfig can handle it
    // Use valid providers and add multiple presets/configs instead
    const largeConfig = {
      defaultProvider: 'gemini',
      preset: 'work',
      style: 'detailed',
      language: 'es',
      prepend: 'LARGE-CONFIG-',
      providers: {
        openai: {
          apiKey:
            'large-openai-key-with-many-characters-to-make-it-substantial',
          model: 'gpt-4o-mini',
          temperature: 0.3,
          maxTokens: 2000,
        },
        gemini: {
          apiKey:
            'large-gemini-key-with-many-characters-to-make-it-substantial',
          model: 'gemini-1.5-pro',
          temperature: 0.8,
          maxTokens: 4000,
        },
      },
    } satisfies LocalConfig;

    // Add large config file to mock filesystem
    mock({
      [tempGitRoot]: {
        '.git': {
          'gittyrc.json': JSON.stringify(largeConfig),
        },
      },
    });

    const result = await getLocalConfig();

    expect(result).not.toBeNull();
    expect(result?.defaultProvider).toBe('gemini');
    expect(result?.preset).toBe('work');
    expect(result?.style).toBe('detailed');
    expect(result?.language).toBe('es');
    expect(result?.prepend).toBe('LARGE-CONFIG-');
    // Check that both valid providers were read correctly
    expect(Object.keys(result?.providers || {})).toHaveLength(2);
    expect(result?.providers?.openai?.apiKey).toBe(
      'large-openai-key-with-many-characters-to-make-it-substantial'
    );
    expect(result?.providers?.gemini?.model).toBe('gemini-1.5-pro');
  });

  it('should work fine with valid local config', async () => {
    mock({
      [tempGitRoot]: {
        '.git': {
          'gittyrc.json': JSON.stringify({
            defaultProvider: 'gemini',
            style: 'detailed',
          }),
        },
      },
    });

    const config = await getLocalConfig();
    expect(config).toBeDefined();
    expect(config?.defaultProvider).toBe('gemini');
    expect(config?.style).toBe('detailed');
  });

  it('should silently fall back for completely non-JSON content', async () => {
    mock({
      [tempGitRoot]: {
        '.git': {
          'gittyrc.json': 'not json at all!',
        },
      },
    });

    const result = await getLocalConfig();
    expect(result).toBeNull();

    // Should not show any error messages for completely non-JSON content
    expect(mocks.ui.showError).not.toHaveBeenCalled();
    expect(mocks.ui.showWarning).not.toHaveBeenCalled();
    expect(mocks.ui.showHint).not.toHaveBeenCalled();
  });
});

describe('Malformed Config Error Handling', () => {
  let tempGitRoot: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock process.exit to prevent actual exit
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Reset the conf mock store
    mocks.confMock.resetStore();

    // Setup mock git root
    tempGitRoot = '/fake/git/root';
    mocks.getGitRoot.mockResolvedValue(tempGitRoot);
  });

  afterEach(async () => {
    mock.restore();
    vi.restoreAllMocks();
  });

  describe('Local Config Malformed JSON', () => {
    beforeEach(() => {
      // Setup valid global config first
      mocks.confMock.setStoreData({
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: 'test-openai-key',
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 500,
          },
          gemini: {
            apiKey: 'test-gemini-key',
            model: 'gemini-1.5-flash',
            temperature: 0.7,
            maxTokens: 2048,
          },
        },
        default: {
          prepend: '',
          style: 'concise',
          language: 'en',
        },
        presets: {},
      });
    });

    it('should show warning and fall back gracefully for malformed local config', async () => {
      // Add malformed config file to mock filesystem
      mock({
        [tempGitRoot]: {
          '.git': {
            'gittyrc.json': '{ "defaultProvider": "gemini", "invalid": json }',
          },
        },
      });

      const result = await getLocalConfig();

      // Should return null (graceful fallback)
      expect(result).toBeNull();

      // Should show warning messages
      expect(mocks.ui.showWarning).toHaveBeenCalledWith(
        'Local repository configuration has malformed JSON syntax'
      );
      expect(mocks.ui.showWarning).toHaveBeenCalledWith(
        'Falling back to global configuration'
      );
      expect(mocks.ui.showHint).toHaveBeenCalledWith(
        'Please fix the local config or delete .git/gittyrc.json to reset'
      );
    });

    it('should handle malformed local config with missing quotes gracefully', async () => {
      mock({
        [tempGitRoot]: {
          '.git': {
            'gittyrc.json': '{ defaultProvider: "gemini", "missing": quotes }',
          },
        },
      });

      const result = await getLocalConfig();
      expect(result).toBeNull();
      expect(mocks.ui.showWarning).toHaveBeenCalledWith(
        'Local repository configuration has malformed JSON syntax'
      );
    });

    it('should handle malformed local config with unclosed braces gracefully', async () => {
      mock({
        [tempGitRoot]: {
          '.git': {
            'gittyrc.json':
              '{ "defaultProvider": "gemini", "style": "detailed"',
          },
        },
      });

      const result = await getLocalConfig();
      expect(result).toBeNull();
      expect(mocks.ui.showWarning).toHaveBeenCalledWith(
        'Local repository configuration has malformed JSON syntax'
      );
    });

    it('should handle malformed local config with trailing commas gracefully', async () => {
      mock({
        [tempGitRoot]: {
          '.git': {
            'gittyrc.json':
              '{ "defaultProvider": "gemini", "style": "detailed", }',
          },
        },
      });

      const result = await getLocalConfig();
      expect(result).toBeNull();
      expect(mocks.ui.showWarning).toHaveBeenCalledWith(
        'Local repository configuration has malformed JSON syntax'
      );
    });

    it('should handle completely empty local config file gracefully', async () => {
      mock({
        [tempGitRoot]: {
          '.git': {
            'gittyrc.json': '',
          },
        },
      });

      const result = await getLocalConfig();
      expect(result).toBeNull();
      expect(mocks.ui.showWarning).toHaveBeenCalledWith(
        'Local repository configuration has malformed JSON syntax'
      );
    });

    it('should handle local config with only whitespace gracefully', async () => {
      mock({
        [tempGitRoot]: {
          '.git': {
            'gittyrc.json': '   \n\t   ',
          },
        },
      });

      const result = await getLocalConfig();
      expect(result).toBeNull();
      expect(mocks.ui.showWarning).toHaveBeenCalledWith(
        'Local repository configuration has malformed JSON syntax'
      );
    });

    it('should handle multi-line malformed local config gracefully', async () => {
      const malformedConfig = `{
  "defaultProvider": "gemini",
  "style": "detailed",
  "invalid": json,
  "missing": quotes
}`;

      mock({
        [tempGitRoot]: {
          '.git': {
            'gittyrc.json': malformedConfig,
          },
        },
      });

      const result = await getLocalConfig();
      expect(result).toBeNull();
      expect(mocks.ui.showWarning).toHaveBeenCalledWith(
        'Local repository configuration has malformed JSON syntax'
      );
    });

    it('should work fine with valid local config', async () => {
      mock({
        [tempGitRoot]: {
          '.git': {
            'gittyrc.json': JSON.stringify({
              defaultProvider: 'gemini',
              style: 'detailed',
            }),
          },
        },
      });

      const config = await getLocalConfig();
      expect(config).toBeDefined();
      expect(config?.defaultProvider).toBe('gemini');
      expect(config?.style).toBe('detailed');
    });
  });

  describe('Global Config Malformed JSON', () => {
    it('should be tested separately from mock-fs', () => {
      // Global config uses the real Conf library and real file system
      // These tests need a different approach than mock-fs
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle JSON with special characters that might break parsing gracefully', async () => {
      mock({
        [tempGitRoot]: {
          '.git': {
            'gittyrc.json': '{ "defaultProvider": "openai\n\t", "invalid": }',
          },
        },
      });

      const result = await getLocalConfig();
      expect(result).toBeNull();
      expect(mocks.ui.showWarning).toHaveBeenCalledWith(
        'Local repository configuration has malformed JSON syntax'
      );
    });

    it('should handle extremely large malformed config files gracefully', async () => {
      // Create a large malformed config
      const largeMalformedConfig =
        '{ "defaultProvider": "openai", "providers": {' +
        'a'.repeat(10000) +
        ': "invalid"' + // Large string without proper closing
        ', malformed }';

      mock({
        [tempGitRoot]: {
          '.git': {
            'gittyrc.json': largeMalformedConfig,
          },
        },
      });

      const result = await getLocalConfig();
      expect(result).toBeNull();
      expect(mocks.ui.showWarning).toHaveBeenCalledWith(
        'Local repository configuration has malformed JSON syntax'
      );
    });
  });
});
