import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCommitMessages,
  validateApiKey,
  getAvailableProviders,
  isProviderAvailable,
} from './index';
import { providerRegistry } from './utils/provider-factory';
import type { GenerateCommitOptions } from '../types/index';

describe('Providers Index - Error Paths', () => {
  let mockOptions: GenerateCommitOptions;

  beforeEach(() => {
    vi.clearAllMocks();
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateCommitMessages error paths', () => {
    it('should throw error when provider is not found', async () => {
      // Mock registry.get to return undefined for non-existent provider
      const originalGet = providerRegistry.get;
      vi.spyOn(providerRegistry, 'get').mockReturnValue(undefined);

      await expect(
        generateCommitMessages('openai', mockOptions)
      ).rejects.toThrow("Provider 'openai' not found");

      // Restore original method
      providerRegistry.get = originalGet;
    });

    it('should handle provider registry corruption', async () => {
      // Simulate registry returning null instead of undefined
      const originalGet = providerRegistry.get;
      vi.spyOn(providerRegistry, 'get').mockReturnValue(null as any);

      await expect(
        generateCommitMessages('gemini', mockOptions)
      ).rejects.toThrow("Provider 'gemini' not found");

      providerRegistry.get = originalGet;
    });

    it('should propagate provider-specific errors', async () => {
      const mockProvider = {
        config: { name: 'Mock', defaultModel: 'test', maxDiffLength: 1000 },
        generateCommitMessages: vi
          .fn()
          .mockRejectedValue(new Error('Provider internal error')),
        validateApiKey: vi.fn(),
      };

      const originalGet = providerRegistry.get;
      vi.spyOn(providerRegistry, 'get').mockReturnValue(mockProvider);

      await expect(
        generateCommitMessages('openai', mockOptions)
      ).rejects.toThrow('Provider internal error');

      providerRegistry.get = originalGet;
    });
  });

  describe('validateApiKey error paths', () => {
    it('should throw error when provider is not found', async () => {
      const originalGet = providerRegistry.get;
      vi.spyOn(providerRegistry, 'get').mockReturnValue(undefined);

      await expect(validateApiKey('openai', 'test-key')).rejects.toThrow(
        "Provider 'openai' not found"
      );

      providerRegistry.get = originalGet;
    });

    it('should handle provider registry returning null', async () => {
      const originalGet = providerRegistry.get;
      vi.spyOn(providerRegistry, 'get').mockReturnValue(null as any);

      await expect(validateApiKey('gemini', 'test-key')).rejects.toThrow(
        "Provider 'gemini' not found"
      );

      providerRegistry.get = originalGet;
    });

    it('should propagate validation errors from provider', async () => {
      const mockProvider = {
        config: { name: 'Mock', defaultModel: 'test', maxDiffLength: 1000 },
        generateCommitMessages: vi.fn(),
        validateApiKey: vi
          .fn()
          .mockRejectedValue(new Error('Validation failed internally')),
      };

      const originalGet = providerRegistry.get;
      vi.spyOn(providerRegistry, 'get').mockReturnValue(mockProvider);

      await expect(validateApiKey('openai', 'bad-key')).rejects.toThrow(
        'Validation failed internally'
      );

      providerRegistry.get = originalGet;
    });
  });

  describe('registry utility functions', () => {
    it('should handle empty registry in getAvailableProviders', () => {
      const originalList = providerRegistry.list;
      vi.spyOn(providerRegistry, 'list').mockReturnValue([]);

      const result = getAvailableProviders();
      expect(result).toEqual([]);

      providerRegistry.list = originalList;
    });

    it('should handle corrupted registry data in isProviderAvailable', () => {
      const originalHas = providerRegistry.has;
      vi.spyOn(providerRegistry, 'has').mockImplementation((name: string) => {
        if (name === 'corrupted') throw new Error('Registry corruption');
        return false;
      });

      // Should handle registry errors gracefully
      expect(() => isProviderAvailable('corrupted')).toThrow(
        'Registry corruption'
      );
      expect(isProviderAvailable('non-existent')).toBe(false);

      providerRegistry.has = originalHas;
    });
  });

  describe('edge cases in provider lookup', () => {
    it('should handle provider names with special characters', async () => {
      const originalGet = providerRegistry.get;
      vi.spyOn(providerRegistry, 'get').mockReturnValue(undefined);

      await expect(
        generateCommitMessages('invalid-provider!' as any, mockOptions)
      ).rejects.toThrow("Provider 'invalid-provider!' not found");

      providerRegistry.get = originalGet;
    });

    it('should handle empty provider name gracefully', async () => {
      const originalGet = providerRegistry.get;
      vi.spyOn(providerRegistry, 'get').mockReturnValue(undefined);

      await expect(validateApiKey('' as any, 'test-key')).rejects.toThrow(
        "Provider '' not found"
      );

      providerRegistry.get = originalGet;
    });
  });
});
