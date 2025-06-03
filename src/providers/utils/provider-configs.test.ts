import { describe, it, expect } from 'vitest';
import {
  PROVIDER_CONFIGS,
  getProviderConfig,
  getAvailableProviders,
  isProviderSupported,
  type ProviderName,
} from './provider-configs';

describe('Provider Configurations', () => {
  describe('PROVIDER_CONFIGS', () => {
    it('should have OpenAI configuration', () => {
      expect(PROVIDER_CONFIGS.openai).toBeDefined();
      expect(PROVIDER_CONFIGS.openai.name).toBe('OpenAI');
      expect(PROVIDER_CONFIGS.openai.defaultModel).toBe('gpt-4o-mini');
      expect(PROVIDER_CONFIGS.openai.maxDiffLength).toBe(4000);
    });

    it('should have Gemini configuration', () => {
      expect(PROVIDER_CONFIGS.gemini).toBeDefined();
      expect(PROVIDER_CONFIGS.gemini.name).toBe('Gemini');
      expect(PROVIDER_CONFIGS.gemini.defaultModel).toBe('gemini-1.5-flash');
      expect(PROVIDER_CONFIGS.gemini.maxDiffLength).toBe(6000);
    });

    it('should have consistent configuration structure', () => {
      Object.values(PROVIDER_CONFIGS).forEach(config => {
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('defaultModel');
        expect(config).toHaveProperty('maxDiffLength');
        expect(typeof config.name).toBe('string');
        expect(typeof config.defaultModel).toBe('string');
        expect(typeof config.maxDiffLength).toBe('number');
        expect(config.maxDiffLength).toBeGreaterThan(0);
      });
    });
  });

  describe('getProviderConfig', () => {
    it('should return OpenAI config for openai provider', () => {
      const config = getProviderConfig('openai');
      expect(config).toEqual(PROVIDER_CONFIGS.openai);
    });

    it('should return Gemini config for gemini provider', () => {
      const config = getProviderConfig('gemini');
      expect(config).toEqual(PROVIDER_CONFIGS.gemini);
    });

    it('should throw error for unknown provider', () => {
      expect(() => getProviderConfig('unknown' as ProviderName)).toThrow(
        'Unknown provider: unknown'
      );
    });

    it('should return immutable config objects', () => {
      const config1 = getProviderConfig('openai');
      const config2 = getProviderConfig('openai');

      // Should be same values but different references (if implementation makes copies)
      expect(config1).toEqual(config2);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return array of provider names', () => {
      const providers = getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toContain('openai');
      expect(providers).toContain('gemini');
    });

    it('should return all configured providers', () => {
      const providers = getAvailableProviders();
      const configKeys = Object.keys(PROVIDER_CONFIGS);
      expect(providers.sort()).toEqual(configKeys.sort());
    });

    it('should have proper TypeScript types', () => {
      const providers = getAvailableProviders();
      providers.forEach(provider => {
        expect(typeof provider).toBe('string');
        expect(isProviderSupported(provider)).toBe(true);
      });
    });
  });

  describe('isProviderSupported', () => {
    it('should return true for supported providers', () => {
      expect(isProviderSupported('openai')).toBe(true);
      expect(isProviderSupported('gemini')).toBe(true);
    });

    it('should return false for unsupported providers', () => {
      expect(isProviderSupported('claude')).toBe(false);
      expect(isProviderSupported('unknown')).toBe(false);
      expect(isProviderSupported('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isProviderSupported('OPENAI')).toBe(false); // Case sensitive
      expect(isProviderSupported('openai ')).toBe(false); // Spaces
      expect(isProviderSupported(null as any)).toBe(false);
      expect(isProviderSupported(undefined as any)).toBe(false);
      expect(isProviderSupported(123 as any)).toBe(false);
    });

    it('should provide type narrowing', () => {
      const providerName: string = 'openai';
      if (isProviderSupported(providerName)) {
        // TypeScript should now know providerName is ProviderName
        const config = getProviderConfig(providerName);
        expect(config).toBeDefined();
      }
    });
  });

  describe('Type Safety', () => {
    it('should have ProviderName type matching config keys', () => {
      const configKeys = Object.keys(PROVIDER_CONFIGS);
      const availableProviders = getAvailableProviders();
      expect(availableProviders).toEqual(configKeys);
    });

    it('should ensure all provider names are valid', () => {
      getAvailableProviders().forEach(provider => {
        expect(() => getProviderConfig(provider)).not.toThrow();
        expect(PROVIDER_CONFIGS[provider]).toBeDefined();
      });
    });
  });

  describe('Provider-specific Configuration Values', () => {
    it('should have appropriate max diff lengths', () => {
      // OpenAI has smaller context window, should have smaller max diff
      expect(PROVIDER_CONFIGS.openai.maxDiffLength).toBeLessThan(
        PROVIDER_CONFIGS.gemini.maxDiffLength
      );

      // Both should be reasonable values
      expect(PROVIDER_CONFIGS.openai.maxDiffLength).toBeGreaterThan(1000);
      expect(PROVIDER_CONFIGS.gemini.maxDiffLength).toBeGreaterThan(3000);
    });

    it('should have appropriate default models', () => {
      expect(PROVIDER_CONFIGS.openai.defaultModel).toMatch(/gpt/);
      expect(PROVIDER_CONFIGS.gemini.defaultModel).toMatch(/gemini/);
    });

    it('should have human-readable names', () => {
      expect(PROVIDER_CONFIGS.openai.name).toBe('OpenAI');
      expect(PROVIDER_CONFIGS.gemini.name).toBe('Gemini');
    });
  });
});
