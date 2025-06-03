/**
 * 🎯 CONFIGURATION MANAGER TESTS - FUNCTIONAL APPROACH
 *
 * The manager tests have been split into logical, focused files:
 *
 * - manager-provider-override.test.ts  - Complete config hierarchy & provider override logic
 * - manager-file-io.test.ts           - Real file I/O operations and file testing
 *
 * Each file follows established patterns:
 * ✅ Selective type-safe mocks with proper vi.mock() setup
 * ✅ DRY utilities and reusable test data
 * ✅ Focused responsibilities (provider logic vs file I/O)
 * ✅ Proper cleanup and teardown
 *
 * Total: ~16 comprehensive tests covering all scenarios
 *
 * Run individual test files:
 * - npm test -- manager-provider-override.test.ts
 * - npm test -- manager-file-io.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies before importing the module
const mocks = vi.hoisted(() => ({
  conf: {
    MockConf: vi.fn().mockImplementation(() => {
      const mockStore = {
        defaultProvider: 'openai',
        providers: {
          openai: {
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 500,
            apiKey: 'mock-key',
          },
          gemini: {
            model: 'gemini-1.5-flash',
            temperature: 0.7,
            maxTokens: 2048,
            apiKey: 'mock-key',
          },
        },
        default: { prepend: '', style: 'concise', language: 'en' },
        presets: {},
      };

      return {
        get: vi.fn().mockReturnValue(mockStore),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn(),
        store: mockStore,
      };
    }),
  },
  git: {
    getGitRoot: vi.fn().mockResolvedValue('/mock/git/root'),
    checkIsRepo: vi.fn().mockResolvedValue(true),
  },
  files: {
    readJsonFile: vi.fn().mockResolvedValue(null),
    writeJsonFile: vi.fn(),
    fileExists: vi.fn().mockResolvedValue(false),
  },
  spinner: {
    createSpinner: vi.fn().mockResolvedValue({
      start: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      stop: vi.fn(),
    }),
  },
  ui: {
    showInfo: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showHint: vi.fn(),
  },
  prompts: {
    promptWithGracefulExit: vi.fn(),
  },
  providers: {
    getProviderDisplayName: vi.fn().mockReturnValue('OpenAI'),
  },
}));

vi.mock('conf', () => ({ default: mocks.conf.MockConf }));
vi.mock('../utils/git', () => mocks.git);
vi.mock('../utils/files', () => mocks.files);
vi.mock('../ui/spinner', () => mocks.spinner);
vi.mock('../ui/ui', () => mocks.ui);
vi.mock('../ui/prompts', () => mocks.prompts);
vi.mock('../utils/providers', () => mocks.providers);

import { getGlobalConfig, getLocalConfig, resolveConfig } from './manager';

// Basic smoke tests to ensure the core functionality works
describe('ConfigManager Basic Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have a working getGlobalConfig function', () => {
    const config = getGlobalConfig();
    expect(config).toBeDefined();
    expect(config.defaultProvider).toBeDefined();
    expect(config.providers).toBeDefined();
  });

  it('should have a working getLocalConfig function', async () => {
    // This might return null if no local config exists, which is fine
    const result = await getLocalConfig();
    // Should not throw an error
    expect(typeof result === 'object' || result === null).toBe(true);
  });

  it('should have a working resolveConfig function', async () => {
    const result = await resolveConfig({});
    expect(result).toBeDefined();
    expect(result.provider).toBeDefined();
    expect(result.style).toBeDefined();
    expect(result.language).toBeDefined();
    expect(result.apiKey).toBe('mock-key'); // Now using the mocked API key
  });
});
