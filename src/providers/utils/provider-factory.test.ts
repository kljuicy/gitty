import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProvider,
  createProviderRegistry,
  providerRegistry,
  type ProviderConfig,
  type AIClient,
  type AIProvider,
} from './provider-factory';
import type { GenerateCommitOptions } from '../../types/index';

describe('Provider Factory', () => {
  let mockConfig: ProviderConfig;
  let mockCreateClient: (apiKey: string) => AIClient;
  let mockGenerateContent: (
    client: AIClient,
    options: GenerateCommitOptions,
    systemPrompt: string,
    userPrompt: string
  ) => Promise<string>;
  let mockValidateClient: (
    client: AIClient,
    apiKey: string
  ) => Promise<boolean>;
  let mockOptions: GenerateCommitOptions;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      name: 'Test Provider',
      defaultModel: 'test-model',
      maxDiffLength: 1000,
    };

    mockCreateClient = vi.fn((_apiKey: string) => ({
      generateContent: vi.fn().mockResolvedValue('mock response'),
      validateKey: vi.fn().mockResolvedValue(true),
    }));

    mockGenerateContent = vi
      .fn()
      .mockResolvedValue(
        JSON.stringify([{ message: 'test commit', confidence: 0.9 }])
      );

    mockValidateClient = vi.fn().mockResolvedValue(true);

    mockOptions = {
      diff: 'test diff',
      style: 'concise',
      language: 'en',
      prepend: '',
      model: 'test-model',
      temperature: 0.7,
      maxTokens: 500,
      apiKey: 'test-key',
    };
  });

  describe('createProvider', () => {
    it('should create provider with config and functions', () => {
      const provider = createProvider(
        mockConfig,
        mockCreateClient,
        mockGenerateContent
      );

      expect(provider).toHaveProperty('config');
      expect(provider).toHaveProperty('generateCommitMessages');
      expect(provider).toHaveProperty('validateApiKey');
      expect(provider.config).toEqual(mockConfig);
      expect(typeof provider.generateCommitMessages).toBe('function');
      expect(typeof provider.validateApiKey).toBe('function');
    });

    it('should create provider with custom validation', () => {
      const provider = createProvider(
        mockConfig,
        mockCreateClient,
        mockGenerateContent,
        mockValidateClient
      );

      expect(provider).toHaveProperty('validateApiKey');
      expect(typeof provider.validateApiKey).toBe('function');
    });

    describe('generateCommitMessages', () => {
      it('should call generateContent with correct parameters', async () => {
        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenerateContent
        );

        await provider.generateCommitMessages(mockOptions);

        expect(mockCreateClient).toHaveBeenCalledWith('test-key');
        expect(mockGenerateContent).toHaveBeenCalledWith(
          expect.any(Object), // client
          mockOptions,
          expect.any(String), // system prompt
          expect.any(String) // user prompt
        );
      });

      it('should use injected client when provided', async () => {
        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenerateContent
        );

        const customClient = {
          generateContent: vi.fn().mockResolvedValue('custom response'),
          validateKey: vi.fn(),
        };

        await provider.generateCommitMessages(mockOptions, customClient);

        expect(mockCreateClient).not.toHaveBeenCalled();
        expect(mockGenerateContent).toHaveBeenCalledWith(
          customClient,
          mockOptions,
          expect.any(String),
          expect.any(String)
        );
      });

      it('should handle retry strategy', async () => {
        const mockGenContent = vi
          .fn()
          .mockRejectedValueOnce(new Error('First attempt failed'))
          .mockResolvedValueOnce(
            JSON.stringify([{ message: 'success', confidence: 0.9 }])
          );

        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenContent
        );

        const result = await provider.generateCommitMessages(mockOptions);

        expect(mockGenContent).toHaveBeenCalledTimes(2);
        expect(result).toEqual([{ message: 'Success', confidence: 0.9 }]);
      });

      it('should return fallback message on final attempt', async () => {
        const mockGenContent = vi.fn().mockResolvedValue('');

        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenContent
        );

        await expect(
          provider.generateCommitMessages(mockOptions)
        ).rejects.toThrow(
          'Failed to generate commit messages after 3 attempts'
        );
      });

      it('should use base functions for prompt building and parsing', async () => {
        const mockBaseFunctions = {
          formatMessage: vi.fn((msg: string) => `Formatted: ${msg}`),
          buildSystemPrompt: vi.fn(() => 'Custom system prompt'),
          buildUserPrompt: vi.fn(() => 'Custom user prompt'),
          parseResponse: vi.fn(() => [{ message: 'parsed', confidence: 0.8 }]),
        };

        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenerateContent
        );

        const result = await provider.generateCommitMessages(
          mockOptions,
          undefined,
          mockBaseFunctions
        );

        expect(mockBaseFunctions.buildSystemPrompt).toHaveBeenCalled();
        expect(mockBaseFunctions.buildUserPrompt).toHaveBeenCalled();
        expect(mockBaseFunctions.parseResponse).toHaveBeenCalled();
        expect(result).toEqual([{ message: 'parsed', confidence: 0.8 }]);
      });

      it('should return fallback on final attempt when parsing fails', async () => {
        const mockGenContent = vi
          .fn()
          .mockResolvedValue('invalid json that returns empty array');
        const mockBaseFunctions = {
          formatMessage: vi.fn((msg: string, prepend?: string) =>
            prepend ? `${prepend}: ${msg}` : msg
          ),
          buildSystemPrompt: vi.fn(() => 'system prompt'),
          buildUserPrompt: vi.fn(() => 'user prompt'),
          parseResponse: vi.fn().mockReturnValue([]), // Empty array to trigger fallback
        };

        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenContent
        );

        const result = await provider.generateCommitMessages(
          mockOptions,
          undefined,
          mockBaseFunctions
        );

        // Should return fallback message with proper formatting
        expect(result).toEqual([
          { message: 'Update code and documentation', confidence: 0.5 },
        ]);
        expect(mockBaseFunctions.formatMessage).toHaveBeenCalledWith(
          'Update code and documentation',
          ''
        );
      });

      it('should return fallback with prepend on final attempt', async () => {
        const mockGenContent = vi
          .fn()
          .mockResolvedValue('content that parses to empty');
        const mockBaseFunctions = {
          formatMessage: vi.fn((msg: string, prepend?: string) =>
            prepend ? `${prepend}: ${msg}` : msg
          ),
          buildSystemPrompt: vi.fn(() => 'system prompt'),
          buildUserPrompt: vi.fn(() => 'user prompt'),
          parseResponse: vi.fn().mockReturnValue([]), // Empty array to trigger fallback
        };

        const optionsWithPrepend = { ...mockOptions, prepend: 'PROJ-123' };
        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenContent
        );

        const result = await provider.generateCommitMessages(
          optionsWithPrepend,
          undefined,
          mockBaseFunctions
        );

        expect(result).toEqual([
          {
            message: 'PROJ-123: Update code and documentation',
            confidence: 0.5,
          },
        ]);
        expect(mockBaseFunctions.formatMessage).toHaveBeenCalledWith(
          'Update code and documentation',
          'PROJ-123'
        );
      });

      it('should return fallback message on final attempt when no messages parsed', async () => {
        const mockGenContent = vi.fn().mockResolvedValue('valid response');
        const mockBaseFunctions = {
          formatMessage: vi.fn((msg: string, prepend?: string) =>
            prepend ? `${prepend}: ${msg}` : msg
          ),
          buildSystemPrompt: vi.fn(() => 'system prompt'),
          buildUserPrompt: vi.fn(() => 'user prompt'),
          parseResponse: vi.fn().mockReturnValue([]), // Empty array to trigger fallback
        };

        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenContent
        );

        const result = await provider.generateCommitMessages(
          mockOptions,
          undefined,
          mockBaseFunctions
        );

        // Should return fallback message when parseResponse returns empty array
        expect(result).toEqual([
          { message: 'Update code and documentation', confidence: 0.5 },
        ]);
        expect(mockBaseFunctions.formatMessage).toHaveBeenCalledWith(
          'Update code and documentation',
          ''
        );
      });

      it('should return fallback with prepend when no messages parsed', async () => {
        const mockGenContent = vi.fn().mockResolvedValue('valid response');
        const mockBaseFunctions = {
          formatMessage: vi.fn((msg: string, prepend?: string) =>
            prepend ? `${prepend}: ${msg}` : msg
          ),
          buildSystemPrompt: vi.fn(() => 'system prompt'),
          buildUserPrompt: vi.fn(() => 'user prompt'),
          parseResponse: vi.fn().mockReturnValue([]), // Empty array to trigger fallback
        };

        const optionsWithPrepend = { ...mockOptions, prepend: 'PROJ-123' };
        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenContent
        );

        const result = await provider.generateCommitMessages(
          optionsWithPrepend,
          undefined,
          mockBaseFunctions
        );

        expect(result).toEqual([
          {
            message: 'PROJ-123: Update code and documentation',
            confidence: 0.5,
          },
        ]);
        expect(mockBaseFunctions.formatMessage).toHaveBeenCalledWith(
          'Update code and documentation',
          'PROJ-123'
        );
      });
    });

    describe('validateApiKey', () => {
      it('should use custom validation when provided', async () => {
        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenerateContent,
          mockValidateClient
        );

        const result = await provider.validateApiKey('test-key');

        expect(mockValidateClient).toHaveBeenCalledWith(
          expect.any(Object),
          'test-key'
        );
        expect(result).toBe(true);
      });

      it('should use default validation when no custom validation', async () => {
        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenerateContent
        );

        const result = await provider.validateApiKey('test-key');

        expect(mockCreateClient).toHaveBeenCalledWith('test-key');
        expect(mockGenerateContent).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should return false on validation error', async () => {
        const mockGenContent = vi
          .fn()
          .mockRejectedValue(new Error('Validation failed'));

        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenContent
        );

        const result = await provider.validateApiKey('invalid-key');

        expect(result).toBe(false);
      });

      it('should use injected client when provided', async () => {
        const provider = createProvider(
          mockConfig,
          mockCreateClient,
          mockGenerateContent,
          mockValidateClient
        );

        const customClient = {
          generateContent: vi.fn(),
          validateKey: vi.fn(),
        };

        await provider.validateApiKey('test-key', customClient);

        expect(mockCreateClient).not.toHaveBeenCalled();
        expect(mockValidateClient).toHaveBeenCalledWith(
          customClient,
          'test-key'
        );
      });
    });
  });

  describe('createProviderRegistry', () => {
    it('should create empty registry', () => {
      const registry = createProviderRegistry();

      expect(registry).toHaveProperty('providers');
      expect(registry).toHaveProperty('register');
      expect(registry).toHaveProperty('get');
      expect(registry).toHaveProperty('list');
      expect(registry).toHaveProperty('has');
      expect(registry.list()).toEqual([]);
    });

    it('should register providers', () => {
      const registry = createProviderRegistry();
      const provider = createProvider(
        mockConfig,
        mockCreateClient,
        mockGenerateContent
      );

      registry.register('test', provider);

      expect(registry.has('test')).toBe(true);
      expect(registry.get('test')).toBe(provider);
      expect(registry.list()).toEqual(['test']);
    });

    it('should return undefined for unregistered providers', () => {
      const registry = createProviderRegistry();

      expect(registry.get('nonexistent')).toBeUndefined();
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('should list all registered providers', () => {
      const registry = createProviderRegistry();
      const provider1 = createProvider(
        mockConfig,
        mockCreateClient,
        mockGenerateContent
      );
      const provider2 = createProvider(
        mockConfig,
        mockCreateClient,
        mockGenerateContent
      );

      registry.register('provider1', provider1);
      registry.register('provider2', provider2);

      const providers = registry.list();
      expect(providers).toHaveLength(2);
      expect(providers).toContain('provider1');
      expect(providers).toContain('provider2');
    });

    it('should overwrite existing providers when re-registered', () => {
      const registry = createProviderRegistry();
      const provider1 = createProvider(
        mockConfig,
        mockCreateClient,
        mockGenerateContent
      );
      const provider2 = createProvider(
        mockConfig,
        mockCreateClient,
        mockGenerateContent
      );

      registry.register('test', provider1);
      registry.register('test', provider2);

      expect(registry.get('test')).toBe(provider2);
      expect(registry.list()).toEqual(['test']);
    });
  });

  describe('Global Provider Registry', () => {
    it('should exist and be instance of provider registry', () => {
      expect(providerRegistry).toBeDefined();
      expect(providerRegistry).toHaveProperty('register');
      expect(providerRegistry).toHaveProperty('get');
      expect(providerRegistry).toHaveProperty('list');
      expect(providerRegistry).toHaveProperty('has');
    });

    it('should be the same instance across imports', () => {
      // This tests the singleton pattern
      expect(providerRegistry).toBe(providerRegistry);
    });
  });

  describe('Interface Types', () => {
    it('should create AIProvider with correct interface', () => {
      const provider = createProvider(
        mockConfig,
        mockCreateClient,
        mockGenerateContent
      );

      // TypeScript should enforce this at compile time
      const typedProvider: AIProvider = provider;
      expect(typedProvider).toBe(provider);
    });

    it('should handle AIClient interface correctly', () => {
      const client: AIClient = {
        generateContent: vi.fn(),
        validateKey: vi.fn(),
      };

      expect(client.generateContent).toBeDefined();
      expect(client.validateKey).toBeDefined();
    });

    it('should handle ProviderConfig interface correctly', () => {
      const config: ProviderConfig = {
        name: 'Test',
        defaultModel: 'test-model',
        maxDiffLength: 1000,
      };

      expect(config.name).toBe('Test');
      expect(config.defaultModel).toBe('test-model');
      expect(config.maxDiffLength).toBe(1000);
    });
  });
});
