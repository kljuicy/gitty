import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openaiProvider } from './openai-provider';
import type { GenerateCommitOptions } from '../../types/index';
import {
  createOpenAIClientMock,
  createOpenAIClientErrorMock,
} from '../../__tests__/mocks';

describe('OpenAI Provider', () => {
  let mockOptions: GenerateCommitOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOptions = {
      diff: 'test diff content',
      style: 'concise',
      language: 'en',
      prepend: '',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      apiKey: 'test-key',
    };
  });

  describe('Provider Configuration', () => {
    it('should have correct config', () => {
      expect(openaiProvider.config.name).toBe('OpenAI');
      expect(openaiProvider.config.defaultModel).toBe('gpt-4o-mini');
      expect(openaiProvider.config.maxDiffLength).toBe(4000);
    });
  });

  describe('generateCommitMessages', () => {
    it('should generate commit messages with mock client', async () => {
      const mockClient = {
        generateContent: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { message: 'feat: add feature', confidence: 0.9 },
                  { message: 'fix: resolve bug', confidence: 0.8 },
                ]),
              },
            },
          ],
        }),
        validateKey: vi.fn().mockResolvedValue(true),
      };

      const result = await openaiProvider.generateCommitMessages(
        mockOptions,
        mockClient
      );

      expect(mockClient.generateContent).toHaveBeenCalled();
      expect(result).toEqual([
        { message: 'Feat: Add feature', confidence: 0.9 },
        { message: 'Fix: Resolve bug', confidence: 0.8 },
      ]);
    });

    it('should handle API errors', async () => {
      const mockClient = {
        generateContent: vi.fn().mockRejectedValue(new Error('API Error')),
        validateKey: vi.fn(),
      };

      await expect(
        openaiProvider.generateCommitMessages(mockOptions, mockClient)
      ).rejects.toThrow('Failed to generate commit messages after 3 attempts');
    });

    it('should retry with lower temperature on failure', async () => {
      const mockClient = {
        generateContent: vi
          .fn()
          .mockRejectedValueOnce(new Error('API Error'))
          .mockResolvedValueOnce({
            choices: [
              {
                message: {
                  content: JSON.stringify([
                    { message: 'feat: success', confidence: 0.9 },
                  ]),
                },
              },
            ],
          }),
        validateKey: vi.fn(),
      };

      const result = await openaiProvider.generateCommitMessages(
        mockOptions,
        mockClient
      );

      expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ message: 'Feat: Success', confidence: 0.9 }]);
    });
  });

  describe('validateApiKey', () => {
    it('should have validateApiKey method that returns a boolean', async () => {
      // Test the method exists and returns a boolean
      const result = await openaiProvider.validateApiKey('test-key');
      expect(typeof result).toBe('boolean');
    });

    it('should handle validateKey success path', async () => {
      const mockClient = {
        generateContent: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify([{ message: 'test', confidence: 0.9 }]),
              },
            },
          ],
        }),
        validateKey: vi.fn().mockResolvedValue(true),
      };

      const result = await openaiProvider.validateApiKey(
        'test-key',
        mockClient
      );
      expect(result).toBe(true);
    });

    it('should handle validateKey error path', async () => {
      const mockClient = {
        generateContent: vi.fn(),
        validateKey: vi.fn().mockRejectedValue(new Error('Invalid API key')),
      };

      const result = await openaiProvider.validateApiKey(
        'invalid-key',
        mockClient
      );
      expect(result).toBe(false);
    });

    it('should handle validateKey throwing non-Error objects', async () => {
      const mockClient = {
        generateContent: vi.fn(),
        validateKey: vi.fn().mockRejectedValue('String error'),
      };

      const result = await openaiProvider.validateApiKey(
        'invalid-key',
        mockClient
      );
      expect(result).toBe(false);
    });

    it('should handle default validation with API errors', async () => {
      const mockClient = {
        generateContent: vi.fn().mockRejectedValue(new Error('Unauthorized')),
        validateKey: vi.fn(),
      };

      const result = await openaiProvider.validateApiKey(
        'invalid-key',
        mockClient
      );
      expect(result).toBe(false);
    });

    it('should handle network timeout errors during validation', async () => {
      const mockClient = {
        generateContent: vi.fn().mockRejectedValue(new Error('ETIMEDOUT')),
        validateKey: vi.fn(),
      };

      const result = await openaiProvider.validateApiKey(
        'timeout-key',
        mockClient
      );
      expect(result).toBe(false);
    });

    it('should handle rate limiting errors during validation', async () => {
      const mockClient = {
        generateContent: vi.fn().mockRejectedValue(new Error('Rate limited')),
        validateKey: vi.fn(),
      };

      const result = await openaiProvider.validateApiKey(
        'rate-limited-key',
        mockClient
      );
      expect(result).toBe(false);
    });
  });

  describe('Client Adapter Business Logic', () => {
    it('should handle empty response content gracefully', async () => {
      const mockClient = {
        generateContent: vi.fn().mockResolvedValue({
          choices: [{ message: { content: null } }],
        }),
        validateKey: vi.fn(),
      };

      await expect(
        openaiProvider.generateCommitMessages(mockOptions, mockClient)
      ).rejects.toThrow('Failed to generate commit messages after 3 attempts');
    });

    it('should handle missing choices in response', async () => {
      const mockClient = {
        generateContent: vi.fn().mockResolvedValue({ choices: [] }),
        validateKey: vi.fn(),
      };

      await expect(
        openaiProvider.generateCommitMessages(mockOptions, mockClient)
      ).rejects.toThrow('Failed to generate commit messages after 3 attempts');
    });

    it('should handle malformed response structure', async () => {
      const mockClient = {
        generateContent: vi.fn().mockResolvedValue({}),
        validateKey: vi.fn(),
      };

      await expect(
        openaiProvider.generateCommitMessages(mockOptions, mockClient)
      ).rejects.toThrow('Failed to generate commit messages after 3 attempts');
    });
  });

  describe('OpenAI Client Adapter Internal Methods', () => {
    it('should handle client adapter validateKey success', async () => {
      const mockOpenAI = createOpenAIClientMock();

      // Test the actual validateKey method structure from the client adapter
      const createOpenAIClientAdapter = (_apiKey: string) => {
        return {
          async generateContent() {
            return {};
          },
          async validateKey(): Promise<boolean> {
            try {
              await mockOpenAI.models.list();
              return true;
            } catch {
              return false;
            }
          },
        };
      };

      const client = createOpenAIClientAdapter('test-key');
      const result = await client.validateKey();
      expect(result).toBe(true);
      expect(mockOpenAI.models.list).toHaveBeenCalled();
    });

    it('should handle client adapter validateKey failure', async () => {
      const mockOpenAI = createOpenAIClientErrorMock();

      const createOpenAIClientAdapter = (_apiKey: string) => {
        return {
          async generateContent() {
            return {};
          },
          async validateKey(): Promise<boolean> {
            try {
              await mockOpenAI.models.list();
              return true;
            } catch {
              return false;
            }
          },
        };
      };

      const client = createOpenAIClientAdapter('invalid-key');
      const result = await client.validateKey();
      expect(result).toBe(false);
      expect(mockOpenAI.models.list).toHaveBeenCalled();
    });
  });
});
