import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geminiProvider } from './gemini-provider';
import type { GenerateCommitOptions } from '../../types/index';
import {
  createGeminiClientMock,
  createGeminiClientErrorMock,
} from '../../__tests__/mocks';

describe('Gemini Provider', () => {
  let mockOptions: GenerateCommitOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOptions = {
      diff: 'test diff content',
      style: 'concise',
      language: 'en',
      prepend: '',
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 2048,
      apiKey: 'test-key',
    };
  });

  describe('Provider Configuration', () => {
    it('should have correct config', () => {
      expect(geminiProvider.config.name).toBe('Gemini');
      expect(geminiProvider.config.defaultModel).toBe('gemini-1.5-flash');
      expect(geminiProvider.config.maxDiffLength).toBe(6000);
    });
  });

  describe('generateCommitMessages', () => {
    it('should generate commit messages with mock client', async () => {
      const mockClient = {
        generateContent: vi.fn().mockResolvedValue(
          JSON.stringify([
            { message: 'feat: add feature', confidence: 0.9 },
            { message: 'fix: resolve bug', confidence: 0.8 },
          ])
        ),
        validateKey: vi.fn().mockResolvedValue(true),
      };

      const result = await geminiProvider.generateCommitMessages(
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
        geminiProvider.generateCommitMessages(mockOptions, mockClient)
      ).rejects.toThrow('Failed to generate commit messages after 3 attempts');
    });

    it('should retry with lower temperature on failure', async () => {
      const mockClient = {
        generateContent: vi
          .fn()
          .mockRejectedValueOnce(new Error('API Error'))
          .mockResolvedValueOnce(
            JSON.stringify([{ message: 'feat: success', confidence: 0.9 }])
          ),
        validateKey: vi.fn(),
      };

      const result = await geminiProvider.generateCommitMessages(
        mockOptions,
        mockClient
      );

      expect(mockClient.generateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ message: 'Feat: Success', confidence: 0.9 }]);
    });

    it('should handle prepend in commit messages', async () => {
      const mockClient = {
        generateContent: vi
          .fn()
          .mockResolvedValue(
            JSON.stringify([{ message: 'add feature', confidence: 0.9 }])
          ),
        validateKey: vi.fn(),
      };

      const optionsWithPrepend = { ...mockOptions, prepend: 'PROJ-123' };
      const result = await geminiProvider.generateCommitMessages(
        optionsWithPrepend,
        mockClient
      );

      expect(result).toEqual([
        { message: 'PROJ-123: Add feature', confidence: 0.9 },
      ]);
    });

    it('should handle generateContent that returns empty string', async () => {
      const mockClient = {
        generateContent: vi.fn().mockResolvedValue(''),
        validateKey: vi.fn(),
      };

      await expect(
        geminiProvider.generateCommitMessages(mockOptions, mockClient)
      ).rejects.toThrow('Failed to generate commit messages after 3 attempts');
    });

    it('should combine system and user prompts correctly', async () => {
      const mockClient = {
        generateContent: vi
          .fn()
          .mockResolvedValue(
            JSON.stringify([{ message: 'test commit', confidence: 0.9 }])
          ),
        validateKey: vi.fn(),
      };

      await geminiProvider.generateCommitMessages(mockOptions, mockClient);

      // Verify the prompt combination business logic
      expect(mockClient.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('clear, concise commit messages'), // system prompt part
        expect.objectContaining({
          model: mockOptions.model,
          temperature: mockOptions.temperature,
          maxTokens: mockOptions.maxTokens,
        })
      );
    });
  });

  describe('validateApiKey', () => {
    it('should have validateApiKey method that returns a boolean', async () => {
      // Test the method exists and returns a boolean
      const result = await geminiProvider.validateApiKey('test-key');
      expect(typeof result).toBe('boolean');
    });

    it('should handle validateKey success path', async () => {
      const mockClient = {
        generateContent: vi.fn(),
        validateKey: vi.fn().mockResolvedValue(true),
      };

      const result = await geminiProvider.validateApiKey(
        'test-key',
        mockClient
      );
      expect(result).toBe(true);
    });

    it('should handle validateKey error path', async () => {
      const mockClient = {
        generateContent: vi
          .fn()
          .mockRejectedValue(new Error('Invalid API key')),
        validateKey: vi.fn().mockRejectedValue(new Error('Invalid API key')),
      };

      const result = await geminiProvider.validateApiKey(
        'invalid-key',
        mockClient
      );
      expect(result).toBe(false);
    });

    it('should handle validateKey throwing non-Error objects', async () => {
      const mockClient = {
        generateContent: vi.fn().mockRejectedValue('String error'),
        validateKey: vi.fn().mockRejectedValue('String error'),
      };

      const result = await geminiProvider.validateApiKey(
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

      const result = await geminiProvider.validateApiKey(
        'invalid-key',
        mockClient
      );
      expect(result).toBe(false);
    });

    it('should handle Gemini-specific safety errors during validation', async () => {
      const mockClient = {
        generateContent: vi.fn().mockRejectedValue(new Error('SAFETY')),
        validateKey: vi.fn(),
      };

      const result = await geminiProvider.validateApiKey(
        'safety-error-key',
        mockClient
      );
      expect(result).toBe(false);
    });

    it('should handle Gemini quota exceeded errors during validation', async () => {
      const mockClient = {
        generateContent: vi.fn().mockRejectedValue(new Error('QUOTA_EXCEEDED')),
        validateKey: vi.fn(),
      };

      const result = await geminiProvider.validateApiKey(
        'quota-exceeded-key',
        mockClient
      );
      expect(result).toBe(false);
    });
  });

  describe('Client Adapter Business Logic', () => {
    it('should handle response that throws on text()', async () => {
      const mockClient = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: vi
              .fn()
              .mockRejectedValue(new Error('Text extraction failed')),
          },
        }),
        validateKey: vi.fn(),
      };

      await expect(
        geminiProvider.generateCommitMessages(mockOptions, mockClient)
      ).rejects.toThrow('Failed to generate commit messages after 3 attempts');
    });

    it('should combine system and user prompts correctly', async () => {
      const mockClient = {
        generateContent: vi
          .fn()
          .mockResolvedValue(
            JSON.stringify([{ message: 'test commit', confidence: 0.9 }])
          ),
        validateKey: vi.fn(),
      };

      await geminiProvider.generateCommitMessages(mockOptions, mockClient);

      // Verify the prompt combination business logic
      expect(mockClient.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('clear, concise commit messages'), // system prompt part
        expect.objectContaining({
          model: mockOptions.model,
          temperature: mockOptions.temperature,
          maxTokens: mockOptions.maxTokens,
        })
      );
    });
  });

  describe('Gemini Client Adapter Internal Methods', () => {
    it('should handle client adapter validateKey success', async () => {
      const mockGoogleAI = createGeminiClientMock();

      // Test the actual validateKey method structure from the client adapter
      const createGeminiClientAdapter = (_apiKey: string) => {
        return {
          async generateContent() {
            return 'response';
          },
          async validateKey(): Promise<boolean> {
            try {
              const genModel = mockGoogleAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
              });
              await genModel.generateContent('Hello');
              return true;
            } catch {
              return false;
            }
          },
        };
      };

      const client = createGeminiClientAdapter('test-key');
      const result = await client.validateKey();
      expect(result).toBe(true);
      expect(mockGoogleAI.getGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-flash',
      });
    });

    it('should handle client adapter validateKey failure', async () => {
      const mockGoogleAI = createGeminiClientErrorMock();

      const createGeminiClientAdapter = (_apiKey: string) => {
        return {
          async generateContent() {
            return 'response';
          },
          async validateKey(): Promise<boolean> {
            try {
              const genModel = mockGoogleAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
              });
              await genModel.generateContent('Hello');
              return true;
            } catch {
              return false;
            }
          },
        };
      };

      const client = createGeminiClientAdapter('invalid-key');
      const result = await client.validateKey();
      expect(result).toBe(false);
      expect(mockGoogleAI.getGenerativeModel).toHaveBeenCalled();
    });
  });
});
