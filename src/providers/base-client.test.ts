import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBaseAIFunctions, type BaseAIFunctions } from './base-client';

// Mock the diff utility
vi.mock('../utils/diff.js', () => ({
  truncateDiff: vi.fn((diff: string, maxLength: number) =>
    diff.length > maxLength ? `${diff.substring(0, maxLength)}...` : diff
  ),
}));

describe('Base AI Client Functions', () => {
  let baseFunctions: BaseAIFunctions;

  beforeEach(() => {
    vi.clearAllMocks();
    baseFunctions = createBaseAIFunctions();
  });

  describe('BaseAIFunctions Interface', () => {
    it('should create a BaseAIFunctions object with all required methods', () => {
      expect(baseFunctions).toHaveProperty('formatMessage');
      expect(baseFunctions).toHaveProperty('buildSystemPrompt');
      expect(baseFunctions).toHaveProperty('buildUserPrompt');
      expect(baseFunctions).toHaveProperty('parseResponse');
      expect(typeof baseFunctions.formatMessage).toBe('function');
      expect(typeof baseFunctions.buildSystemPrompt).toBe('function');
      expect(typeof baseFunctions.buildUserPrompt).toBe('function');
      expect(typeof baseFunctions.parseResponse).toBe('function');
    });
  });

  describe('formatMessage', () => {
    it('should capitalize first letter of message', () => {
      const result = baseFunctions.formatMessage('test message');
      expect(result).toBe('Test message');
    });

    it('should add prepend with colon separator', () => {
      const result = baseFunctions.formatMessage('test message', 'PROJ-123');
      expect(result).toBe('PROJ-123: Test message');
    });

    it('should capitalize after colons in message', () => {
      const result = baseFunctions.formatMessage('feat: add new feature');
      expect(result).toBe('Feat: Add new feature');
    });

    it('should handle empty message', () => {
      const result = baseFunctions.formatMessage('');
      expect(result).toBe('');
    });

    it('should handle message with prepend and internal colons', () => {
      const result = baseFunctions.formatMessage(
        'feat: add new feature',
        'PROJ-123'
      );
      expect(result).toBe('PROJ-123: Feat: Add new feature');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build concise style prompt', () => {
      const result = baseFunctions.buildSystemPrompt('concise', 'en');

      expect(result).toContain('clear, concise commit messages');
      expect(result).toContain('Generate commit messages in en');
      expect(result).toContain('Follow conventional commit format');
    });

    it('should build detailed style prompt', () => {
      const result = baseFunctions.buildSystemPrompt('detailed', 'es');

      expect(result).toContain('detailed commit messages');
      expect(result).toContain('Generate commit messages in es');
      expect(result).toContain('Follow conventional commit format');
    });

    it('should build funny style prompt', () => {
      const result = baseFunctions.buildSystemPrompt('funny', 'fr');

      expect(result).toContain('humorous but informative');
      expect(result).toContain('Generate commit messages in fr');
      expect(result).toContain('Follow conventional commit format');
    });

    it('should default to concise for unknown style', () => {
      const result = baseFunctions.buildSystemPrompt('unknown', 'en');

      expect(result).toContain('clear, concise commit messages');
    });

    it('should modify instructions when prepend is provided', () => {
      const result = baseFunctions.buildSystemPrompt(
        'concise',
        'en',
        'PROJ-123'
      );

      expect(result).toContain(
        'Do not include prefixes like feat:, fix:, docs:'
      );
      expect(result).toContain('custom prefix will be added');
      expect(result).not.toContain('Follow conventional commit format');
    });
  });

  describe('buildUserPrompt', () => {
    it('should build user prompt with diff', () => {
      const diff = 'diff --git a/file.ts b/file.ts\n+added line\n-removed line';
      const result = baseFunctions.buildUserPrompt(diff, 1000);

      expect(result).toContain('Based on this git diff');
      expect(result).toContain('generate 3 different commit message options');
      expect(result).toContain(diff);
      expect(result).toContain('Return ONLY a JSON array');
      expect(result).toContain('"confidence"');
    });

    it('should truncate diff when it exceeds max length', async () => {
      const longDiff = 'a'.repeat(2000);
      baseFunctions.buildUserPrompt(longDiff, 100);

      // Should call truncateDiff with the diff and max length
      const { truncateDiff } = await import('../utils/diff.js');
      expect(truncateDiff).toHaveBeenCalledWith(longDiff, 100);
    });
  });

  describe('parseResponse', () => {
    it('should parse valid JSON response', () => {
      const jsonResponse = JSON.stringify([
        { message: 'feat: add feature', confidence: 0.9 },
        { message: 'update: improve code', confidence: 0.8 },
      ]);

      const result = baseFunctions.parseResponse(jsonResponse);

      expect(result).toEqual([
        { message: 'Feat: Add feature', confidence: 0.9 },
        { message: 'Update: Improve code', confidence: 0.8 },
      ]);
    });

    it('should parse JSON with markdown code blocks', () => {
      const markdownResponse =
        '```json\n[{"message": "fix: bug", "confidence": 0.9}]\n```';

      const result = baseFunctions.parseResponse(markdownResponse);

      expect(result).toEqual([{ message: 'Fix: Bug', confidence: 0.9 }]);
    });

    it('should parse JSON with generic code blocks', () => {
      const markdownResponse =
        '```\n[{"message": "docs: update", "confidence": 0.8}]\n```';

      const result = baseFunctions.parseResponse(markdownResponse);

      expect(result).toEqual([{ message: 'Docs: Update', confidence: 0.8 }]);
    });

    it('should handle object with messages array', () => {
      const objectResponse = JSON.stringify({
        messages: [{ message: 'feat: new feature', confidence: 0.9 }],
      });

      const result = baseFunctions.parseResponse(objectResponse);

      expect(result).toEqual([
        { message: 'Feat: New feature', confidence: 0.9 },
      ]);
    });

    it('should handle object with single message', () => {
      const objectResponse = JSON.stringify({
        message: 'fix: resolve issue',
        confidence: 0.8,
      });

      const result = baseFunctions.parseResponse(objectResponse);

      expect(result).toEqual([
        { message: 'Fix: Resolve issue', confidence: 0.8 },
      ]);
    });

    it('should add prepend to parsed messages', () => {
      const jsonResponse = JSON.stringify([
        { message: 'feat: add feature', confidence: 0.9 },
      ]);

      const result = baseFunctions.parseResponse(jsonResponse, 'PROJ-123');

      expect(result).toEqual([
        { message: 'PROJ-123: Feat: Add feature', confidence: 0.9 },
      ]);
    });

    it('should limit to 3 messages maximum', () => {
      const jsonResponse = JSON.stringify([
        { message: 'msg1', confidence: 0.9 },
        { message: 'msg2', confidence: 0.8 },
        { message: 'msg3', confidence: 0.7 },
        { message: 'msg4', confidence: 0.6 },
        { message: 'msg5', confidence: 0.5 },
      ]);

      const result = baseFunctions.parseResponse(jsonResponse);

      expect(result).toHaveLength(3);
      expect(result[0].message).toBe('Msg1');
      expect(result[1].message).toBe('Msg2');
      expect(result[2].message).toBe('Msg3');
    });

    it('should provide default confidence when missing', () => {
      const jsonResponse = JSON.stringify([
        { message: 'feat: add feature' }, // No confidence
      ]);

      const result = baseFunctions.parseResponse(jsonResponse);

      expect(result).toEqual([
        { message: 'Feat: Add feature', confidence: 0.5 },
      ]);
    });

    it('should filter out invalid messages', () => {
      const jsonResponse = JSON.stringify([
        { message: 'valid message', confidence: 0.9 },
        { confidence: 0.8 }, // No message
        { message: '', confidence: 0.7 }, // Empty message
        { message: 123, confidence: 0.6 }, // Non-string message
        { message: 'another valid', confidence: 0.5 },
      ]);

      const result = baseFunctions.parseResponse(jsonResponse);

      expect(result).toHaveLength(2);
      expect(result[0].message).toBe('Valid message');
      expect(result[1].message).toBe('Another valid');
    });

    describe('Fallback to plain text parsing', () => {
      it('should extract numbered list from plain text', () => {
        const plainText = `
          1. feat: add new feature
          2. fix: resolve bug
          3. docs: update documentation
        `;

        const result = baseFunctions.parseResponse(plainText);

        expect(result).toHaveLength(3);
        expect(result[0].message).toBe('Feat: Add new feature');
        expect(result[1].message).toBe('Fix: Resolve bug');
        expect(result[2].message).toBe('Docs: Update documentation');
        expect(result[0].confidence).toBe(0.9);
        expect(result[1].confidence).toBe(0.8);
        expect(result[2].confidence).toBe(0.7);
      });

      it('should extract bullet list from plain text', () => {
        const plainText = `
          - feat: add new feature
          • fix: resolve bug
          * docs: update documentation
        `;

        const result = baseFunctions.parseResponse(plainText);

        expect(result).toHaveLength(3);
        expect(result[0].message).toBe('Feat: Add new feature');
        expect(result[1].message).toBe('Fix: Resolve bug');
        expect(result[2].message).toBe('Docs: Update documentation');
      });

      it('should clean markdown formatting from plain text', () => {
        const plainText = `
          1. **feat**: add *new* feature
          2. **fix**: resolve **critical** bug
        `;

        const result = baseFunctions.parseResponse(plainText);

        expect(result[0].message).toBe('Feat: Add new feature');
        expect(result[1].message).toBe('Fix: Resolve critical bug');
      });

      it('should return fallback message when no parsing succeeds', () => {
        const invalidText = 'This is just random text with no structure';

        const result = baseFunctions.parseResponse(invalidText);

        expect(result).toEqual([
          { message: 'Update code and documentation', confidence: 0.5 },
        ]);
      });

      it('should return fallback message with prepend', () => {
        const invalidText = 'Invalid content';

        const result = baseFunctions.parseResponse(invalidText, 'PROJ-123');

        expect(result).toEqual([
          {
            message: 'PROJ-123: Update code and documentation',
            confidence: 0.5,
          },
        ]);
      });
    });
  });
});
