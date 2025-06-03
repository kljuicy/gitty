import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setDefaultProvider,
  getApiKey,
  saveApiKey,
  getPreset,
  savePreset,
  linkRepoToPreset,
  resolveProvider,
  getResolvedApiKey,
} from './manager';
import type { MockedFunction } from 'vitest';
import type { IUI } from '../ui/ui';
import type { LocalConfig, CLIOptions, GittyConfig } from '../types';

// Mock dependencies
const mocks = vi.hoisted(() => {
  const getDefaultTestConfig = () => ({
    defaultProvider: 'openai' as const,
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
      prepend: '',
      style: 'concise' as const,
      language: 'en' as const,
    },
    presets: {
      work: {
        defaultProvider: 'gemini' as const,
        prepend: 'WORK:',
        style: 'detailed' as const,
        language: 'en' as const,
      },
    },
  });

  let storeData: any = getDefaultTestConfig();

  const mockConfInstance = {
    get store() {
      return storeData;
    },
    set store(value: any) {
      storeData = value || getDefaultTestConfig();
    },
  };

  const MockConf = vi.fn().mockImplementation(() => mockConfInstance);

  return {
    confMock: {
      MockConf,
      setStoreData: (data: any) => {
        storeData = data;
      },
      getStoreData: () => storeData,
      resetStore: () => {
        storeData = getDefaultTestConfig();
      },
    },
    ui: {
      showInfo: vi.fn() as MockedFunction<IUI['showInfo']>,
      showSuccess: vi.fn() as MockedFunction<IUI['showSuccess']>,
      showError: vi.fn() as MockedFunction<IUI['showError']>,
      showHint: vi.fn() as MockedFunction<IUI['showHint']>,
      showWarning: vi.fn() as MockedFunction<IUI['showWarning']>,
    },
    git: {
      getGitRoot: vi.fn().mockResolvedValue('/test/repo'),
    },
    files: {
      writeJsonFile: vi.fn(),
    },
    prompts: {
      promptWithGracefulExit: vi.fn(),
    },
    providers: {
      getProviderDisplayName: vi
        .fn()
        .mockImplementation((provider: string) =>
          provider === 'openai' ? 'OpenAI' : 'Google Gemini'
        ),
    },
  };
});

// Apply mocks
vi.mock('conf', () => ({ default: mocks.confMock.MockConf }));
vi.mock('../ui/ui', () => mocks.ui);
vi.mock('../utils/git', () => mocks.git);
vi.mock('../utils/files', () => mocks.files);
vi.mock('../ui/prompts', () => mocks.prompts);
vi.mock('../utils/providers', () => mocks.providers);

describe('Config Manager Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confMock.resetStore();

    // Clear environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  describe('setDefaultProvider', () => {
    it('should update the default provider in global config', () => {
      setDefaultProvider('gemini');

      const config = mocks.confMock.getStoreData();
      expect(config.defaultProvider).toBe('gemini');
    });

    it('should work with openai provider', () => {
      setDefaultProvider('openai');

      const config = mocks.confMock.getStoreData();
      expect(config.defaultProvider).toBe('openai');
    });
  });

  describe('getApiKey', () => {
    it('should return API key from config for default provider', () => {
      const apiKey = getApiKey();
      expect(apiKey).toBe('global-openai-key');
    });

    it('should return API key from config for specific provider', () => {
      const apiKey = getApiKey('gemini');
      expect(apiKey).toBe('global-gemini-key');
    });

    it('should return environment variable when no config key exists', () => {
      // Remove API key from config
      const config = mocks.confMock.getStoreData();
      config.providers.openai.apiKey = '';
      mocks.confMock.setStoreData(config);

      process.env.OPENAI_API_KEY = 'env-openai-key';

      const apiKey = getApiKey('openai');
      expect(apiKey).toBe('env-openai-key');
    });

    it('should return GEMINI_API_KEY environment variable for gemini', () => {
      const config = mocks.confMock.getStoreData();
      config.providers.gemini.apiKey = '';
      mocks.confMock.setStoreData(config);

      process.env.GEMINI_API_KEY = 'env-gemini-key';

      const apiKey = getApiKey('gemini');
      expect(apiKey).toBe('env-gemini-key');
    });

    it('should throw error when no API key found', () => {
      const config = mocks.confMock.getStoreData();
      config.providers.openai.apiKey = '';
      mocks.confMock.setStoreData(config);

      expect(() => getApiKey('openai')).toThrow(
        'No API key found for openai. Run "gitty --set-key --provider openai" or set the appropriate environment variable'
      );
    });
  });

  describe('saveApiKey', () => {
    it('should save API key for default provider', () => {
      saveApiKey('new-openai-key');

      const config = mocks.confMock.getStoreData();
      expect(config.providers.openai.apiKey).toBe('new-openai-key');
    });

    it('should save API key for specific provider', () => {
      saveApiKey('new-gemini-key', 'gemini');

      const config = mocks.confMock.getStoreData();
      expect(config.providers.gemini.apiKey).toBe('new-gemini-key');
    });

    it('should create provider config if it does not exist', () => {
      // Remove gemini provider
      const config = mocks.confMock.getStoreData();
      delete config.providers.gemini;
      mocks.confMock.setStoreData(config);

      saveApiKey('new-gemini-key', 'gemini');

      const updatedConfig = mocks.confMock.getStoreData();
      expect(updatedConfig.providers.gemini.apiKey).toBe('new-gemini-key');
    });
  });

  describe('getPreset', () => {
    it('should return existing preset', () => {
      const preset = getPreset('work');

      expect(preset).toEqual({
        defaultProvider: 'gemini',
        prepend: 'WORK:',
        style: 'detailed',
        language: 'en',
      });
    });

    it('should return undefined for non-existent preset', () => {
      const preset = getPreset('nonexistent');
      expect(preset).toBeUndefined();
    });
  });

  describe('savePreset', () => {
    it('should save new preset', () => {
      const newPreset = {
        defaultProvider: 'openai' as const,
        prepend: 'PERSONAL:',
        style: 'concise' as const,
        language: 'es' as const,
      };

      savePreset('personal', newPreset);

      const config = mocks.confMock.getStoreData();
      expect(config.presets.personal).toEqual(newPreset);
    });

    it('should overwrite existing preset', () => {
      const updatedPreset = {
        defaultProvider: 'openai' as const,
        prepend: 'UPDATED-WORK:',
        style: 'concise' as const,
        language: 'es' as const,
      };

      savePreset('work', updatedPreset);

      const config = mocks.confMock.getStoreData();
      expect(config.presets.work).toEqual(updatedPreset);
    });
  });

  describe('linkRepoToPreset', () => {
    it('should save preset link to local config', async () => {
      await linkRepoToPreset('work');

      expect(mocks.files.writeJsonFile).toHaveBeenCalledWith(
        '/test/repo/.git/gittyrc.json',
        { preset: 'work' },
        { pretty: true }
      );
    });

    it('should throw error for non-existent preset', async () => {
      await expect(linkRepoToPreset('nonexistent')).rejects.toThrow(
        'Preset "nonexistent" not found in global config'
      );
    });
  });

  describe('getResolvedApiKey', () => {
    it('should return config API key when available', async () => {
      const apiKey = await getResolvedApiKey('openai', {}, null);
      expect(apiKey).toBe('global-openai-key');
    });

    it('should use preset API key override', async () => {
      const config = mocks.confMock.getStoreData();
      config.presets.work.providers = {
        gemini: { apiKey: 'preset-gemini-key' },
      };
      mocks.confMock.setStoreData(config);

      const apiKey = await getResolvedApiKey(
        'gemini',
        { preset: 'work' },
        null
      );
      expect(apiKey).toBe('preset-gemini-key');
    });

    it('should use local config API key override', async () => {
      const localConfig: LocalConfig = {
        providers: {
          openai: { apiKey: 'local-openai-key' },
        },
      };

      const apiKey = await getResolvedApiKey('openai', {}, localConfig);
      expect(apiKey).toBe('local-openai-key');
    });

    it('should fall back to environment variable when no config key', async () => {
      const config = mocks.confMock.getStoreData();
      config.providers.openai.apiKey = '';
      mocks.confMock.setStoreData(config);

      process.env.OPENAI_API_KEY = 'env-openai-key';

      const apiKey = await getResolvedApiKey('openai', {}, null);
      expect(apiKey).toBe('env-openai-key');
    });

    it('should use GOOGLE_API_KEY as fallback for gemini', async () => {
      const config = mocks.confMock.getStoreData();
      config.providers.gemini.apiKey = '';
      mocks.confMock.setStoreData(config);

      process.env.GOOGLE_API_KEY = 'google-api-key';

      const apiKey = await getResolvedApiKey('gemini', {}, null);
      expect(apiKey).toBe('google-api-key');
    });

    it('should throw error when no API key found anywhere', async () => {
      const config = mocks.confMock.getStoreData();
      config.providers.openai.apiKey = '';
      mocks.confMock.setStoreData(config);

      await expect(getResolvedApiKey('openai', {}, null)).rejects.toThrow(
        'No API key found for openai. Run "gitty --set-key --provider openai" or set the appropriate environment variable'
      );
    });
  });

  describe('resolveProvider', () => {
    const globalConfigData: GittyConfig = {
      defaultProvider: 'openai',
      providers: {
        openai: {
          apiKey: 'key',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 500,
        },
        gemini: {
          apiKey: 'key',
          model: 'gemini-1.5-flash',
          temperature: 0.7,
          maxTokens: 2048,
        },
      },
      default: { prepend: '', style: 'concise', language: 'en' },
      presets: {},
    };

    it('should return CLI provider when specified', async () => {
      const options: CLIOptions = { provider: 'gemini' };

      const provider = await resolveProvider(options, globalConfigData, null);
      expect(provider).toBe('gemini');
    });

    it('should return local config provider when no CLI provider', async () => {
      const localConfig: LocalConfig = { defaultProvider: 'gemini' };
      const options: CLIOptions = {};

      const provider = await resolveProvider(
        options,
        globalConfigData,
        localConfig
      );
      expect(provider).toBe('gemini');
    });

    it('should auto-detect provider when local config has only one provider', async () => {
      const localConfig: LocalConfig = {
        providers: { gemini: { apiKey: 'local-key' } },
      };
      const options: CLIOptions = {};

      const provider = await resolveProvider(
        options,
        globalConfigData,
        localConfig
      );

      expect(provider).toBe('gemini');
      expect(mocks.ui.showInfo).toHaveBeenCalledWith(
        'Auto-detected provider: Google Gemini',
        '🎯'
      );
    });

    it('should prompt user when local config has two providers', async () => {
      const localConfig: LocalConfig = {
        providers: {
          openai: { apiKey: 'local-openai' },
          gemini: { apiKey: 'local-gemini' },
        },
      };
      const options: CLIOptions = {};

      mocks.prompts.promptWithGracefulExit.mockResolvedValue({
        selectedProvider: 'gemini',
      });

      const provider = await resolveProvider(
        options,
        globalConfigData,
        localConfig
      );

      expect(provider).toBe('gemini');
      expect(mocks.prompts.promptWithGracefulExit).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'selectedProvider',
          message: 'Select your default provider for this project:',
          choices: [
            { name: 'OpenAI', value: 'openai' },
            { name: 'Google Gemini', value: 'gemini' },
          ],
        },
      ]);
      expect(mocks.files.writeJsonFile).toHaveBeenCalledWith(
        '/test/repo/.git/gittyrc.json',
        { ...localConfig, defaultProvider: 'gemini' },
        { pretty: true }
      );
      expect(mocks.ui.showSuccess).toHaveBeenCalledWith(
        'Saved Google Gemini as default for this project'
      );
    });

    it('should use preset provider when specified', async () => {
      const configWithPreset: GittyConfig = {
        ...globalConfigData,
        presets: {
          work: {
            defaultProvider: 'gemini',
            prepend: 'WORK:',
            style: 'detailed',
            language: 'en',
          },
        },
      };
      const options: CLIOptions = { preset: 'work' };

      const provider = await resolveProvider(options, configWithPreset, null);
      expect(provider).toBe('gemini');
    });

    it('should use preset from local config', async () => {
      const configWithPreset: GittyConfig = {
        ...globalConfigData,
        presets: {
          personal: {
            defaultProvider: 'gemini',
            prepend: 'PERSONAL:',
            style: 'concise',
            language: 'en',
          },
        },
      };
      const localConfig: LocalConfig = { preset: 'personal' };
      const options: CLIOptions = {};

      const provider = await resolveProvider(
        options,
        configWithPreset,
        localConfig
      );
      expect(provider).toBe('gemini');
    });

    it('should fall back to global default provider', async () => {
      const options: CLIOptions = {};

      const provider = await resolveProvider(options, globalConfigData, null);
      expect(provider).toBe('openai');
    });
  });
});
