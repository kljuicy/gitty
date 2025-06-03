import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LocalConfig, CLIOptions } from '../types/index';

/**
 * 🎯 CONFIGURATION MANAGER - PROVIDER OVERRIDE SYSTEM
 *
 * Tests the complete configuration hierarchy and provider override logic:
 * - Basic provider overrides
 * - Configuration priority order (CLI > Local > Preset > Global)
 * - Complex provider switching scenarios
 * - Prepend behavior and force prepend override
 * - Edge cases and boundary conditions
 *
 * ⚠️ SAFETY: All filesystem and external dependencies are mocked
 */

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
    git: {
      checkIsRepo: vi.fn().mockResolvedValue(true),
      getGitRoot: vi.fn().mockResolvedValue('/fake/git/root'),
    },
    ui: {
      showInfo: vi.fn(),
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showHint: vi.fn(),
      showWarning: vi.fn(),
    },
    prompts: {
      promptWithGracefulExit: vi.fn(),
    },
    spinner: {
      createSpinner: vi.fn().mockResolvedValue({
        start: vi.fn().mockReturnValue({}),
        succeed: vi.fn().mockReturnValue({}),
        fail: vi.fn().mockReturnValue({}),
        stop: vi.fn(),
      }),
    },
  };
});

// Apply conf mock first
vi.mock('conf', () => ({
  default: mocks.confMock.MockConf,
}));

// Apply all other mocks to prevent real filesystem access
vi.mock('../utils/git', () => mocks.git);
vi.mock('../utils/files', () => ({
  fileExists: vi.fn(),
  readTextFile: vi.fn(),
  readJsonFileWithFriendlyErrors: vi.fn(),
  writeJsonFile: vi.fn(),
}));
vi.mock('../ui', () => mocks.ui);
vi.mock('../ui/prompts', () => mocks.prompts);
vi.mock('../ui/spinner', () => mocks.spinner);

// Import AFTER setting up mocks
import { resolveConfig } from './manager';
import {
  fileExists,
  readTextFile,
  readJsonFileWithFriendlyErrors,
} from '../utils/files';

// Type the mocked functions
const mockedFileExists = vi.mocked(fileExists);
const mockedReadTextFile = vi.mocked(readTextFile);
const mockedReadJsonFileWithFriendlyErrors = vi.mocked(
  readJsonFileWithFriendlyErrors
);

describe('Provider Override and Configuration Hierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset conf mock
    mocks.confMock.resetStore();

    // Reset spinner mock
    mocks.spinner.createSpinner.mockResolvedValue({
      start: vi.fn().mockReturnValue({}),
      succeed: vi.fn().mockReturnValue({}),
      fail: vi.fn().mockReturnValue({}),
      stop: vi.fn(),
    });

    // Set up default global config
    mocks.confMock.setStoreData({
      defaultProvider: 'openai',
      providers: {
        openai: {
          apiKey: 'global-openai-key',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 500,
        },
        gemini: {
          apiKey: 'global-gemini-key',
          model: 'gemini-1.5-flash',
          temperature: 0.7,
          maxTokens: 2048,
        },
      },
      default: {
        prepend: 'global-prepend',
        style: 'concise',
        language: 'en',
      },
      presets: {
        work: {
          prepend: 'work-prepend',
          style: 'detailed',
          language: 'en',
          defaultProvider: 'gemini',
          providers: {
            gemini: {
              model: 'gemini-1.5-pro',
              temperature: 0.5,
            },
          },
        },
      },
    });

    // Default to no local config
    mockedFileExists.mockResolvedValue(false);
    mockedReadTextFile.mockResolvedValue('');
    mockedReadJsonFileWithFriendlyErrors.mockResolvedValue(null);
  });

  describe('Basic Provider Override', () => {
    it('should use CLI provider when specified', async () => {
      const options: CLIOptions = { provider: 'gemini' };
      const config = await resolveConfig(options);

      expect(config.provider).toBe('gemini');
      expect(config.model).toBe('gemini-1.5-flash');
    });

    it('should fall back to global default provider when no override', async () => {
      const options: CLIOptions = {};
      const config = await resolveConfig(options);

      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4o-mini');
    });
  });

  describe('Configuration Priority Order', () => {
    it('should prioritize CLI > Local > Preset > Global', async () => {
      // Set up local config with different values
      const localConfig: LocalConfig = {
        defaultProvider: 'gemini',
        preset: 'work',
        providers: {
          openai: {
            model: 'local-openai-model',
            temperature: 0.9,
          },
        },
        prepend: 'local-prepend',
        style: 'funny',
      };

      // Mock the file system calls for local config
      mockedFileExists.mockResolvedValue(true);
      mockedReadTextFile.mockResolvedValue(JSON.stringify(localConfig));
      mockedReadJsonFileWithFriendlyErrors.mockResolvedValue(localConfig);

      // CLI options should override everything
      const options: CLIOptions = {
        provider: 'openai',
        temperature: 0.1,
        style: 'concise',
      };

      const config = await resolveConfig(options);

      // CLI values take precedence
      expect(config.provider).toBe('openai');
      expect(config.temperature).toBe(0.1);
      expect(config.style).toBe('concise');

      // Local config values for non-CLI specified options
      expect(config.model).toBe('local-openai-model');
    });
  });

  describe('Preset System', () => {
    it('should apply preset configuration when specified', async () => {
      const options: CLIOptions = { preset: 'work' };
      const config = await resolveConfig(options);

      expect(config.provider).toBe('gemini');
      expect(config.model).toBe('gemini-1.5-pro');
      expect(config.temperature).toBe(0.5);
      expect(config.prepend).toBe('work-prepend');
      expect(config.style).toBe('detailed');
    });

    it('should handle local preset reference', async () => {
      const localConfig: LocalConfig = {
        preset: 'work',
      };

      // Mock the file system calls for local config
      mockedFileExists.mockResolvedValue(true);
      mockedReadTextFile.mockResolvedValue(JSON.stringify(localConfig));
      mockedReadJsonFileWithFriendlyErrors.mockResolvedValue(localConfig);

      const options: CLIOptions = {};
      const config = await resolveConfig(options);

      expect(config.provider).toBe('gemini');
      expect(config.model).toBe('gemini-1.5-pro');
      expect(config.prepend).toBe('work-prepend');
    });
  });

  describe('Complex Override Scenarios', () => {
    it('should handle provider switching with partial configs', async () => {
      // Set up a preset with incomplete configuration
      mocks.confMock.setStoreData({
        ...mocks.confMock.getStoreData(),
        presets: {
          ...mocks.confMock.getStoreData().presets,
          minimal: {
            prepend: '',
            style: 'concise',
            language: 'en',
            defaultProvider: 'gemini',
            // No other config - should fall back to global
          },
        },
      });

      const options: CLIOptions = { preset: 'minimal' };
      const config = await resolveConfig(options);

      expect(config.provider).toBe('gemini');
      // Should fall back to global config for missing values
      expect(config.model).toBe('gemini-1.5-flash');
      expect(config.temperature).toBe(0.7);
    });

    it('should handle deep merging of provider configurations', async () => {
      const localConfig: LocalConfig = {
        providers: {
          openai: {
            temperature: 0.9, // Override just temperature
            // model should come from global
          },
        },
      };

      // Mock the file system calls for local config
      mockedFileExists.mockResolvedValue(true);
      mockedReadTextFile.mockResolvedValue(JSON.stringify(localConfig));
      mockedReadJsonFileWithFriendlyErrors.mockResolvedValue(localConfig);

      const options: CLIOptions = { provider: 'openai' };
      const config = await resolveConfig(options);

      expect(config.provider).toBe('openai');
      expect(config.temperature).toBe(0.9); // From local
      expect(config.model).toBe('gpt-4o-mini'); // From global
      expect(config.maxTokens).toBe(500); // From global
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing preset gracefully', async () => {
      const options: CLIOptions = { preset: 'nonexistent' };

      // Should not throw, should fall back to defaults
      const config = await resolveConfig(options);

      expect(config.provider).toBe('openai'); // Global default
    });

    it('should handle file read errors gracefully', async () => {
      mockedFileExists.mockRejectedValue(new Error('File read error'));

      const options: CLIOptions = {};
      const config = await resolveConfig(options);

      // Should fall back to global config
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4o-mini');
    });

    it('should handle invalid local config gracefully', async () => {
      // Mock file exists but return invalid data
      mockedFileExists.mockResolvedValue(true);
      mockedReadTextFile.mockResolvedValue('{ invalid json }');
      mockedReadJsonFileWithFriendlyErrors.mockResolvedValue(null);

      const options: CLIOptions = {};

      // Should not throw - should fall back to global config
      const config = await resolveConfig(options);
      expect(config.provider).toBe('openai');
    });
  });
});
