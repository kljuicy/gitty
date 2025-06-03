import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, type RetryOptions } from './retry-strategy';

describe('Retry Strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const options: RetryOptions = { baseTemperature: 0.7 };

      const result = await withRetry(operation, options);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith(1, 0.7);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success on retry');

      const options: RetryOptions = {
        baseTemperature: 0.7,
        fallbackTemperature: 0.3,
      };

      const result = await withRetry(operation, options);

      expect(result).toBe('success on retry');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(operation).toHaveBeenCalledWith(1, 0.7); // First attempt with base temperature
      expect(operation).toHaveBeenCalledWith(2, 0.3); // Second attempt with fallback temperature
    });

    it('should use lower temperature on retry attempts', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failed'))
        .mockRejectedValueOnce(new Error('Second failed'))
        .mockResolvedValueOnce('success on third');

      const options: RetryOptions = {
        baseTemperature: 0.9,
        fallbackTemperature: 0.2,
      };

      const result = await withRetry(operation, options);

      expect(result).toBe('success on third');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(operation).toHaveBeenCalledWith(1, 0.9); // First: base temperature
      expect(operation).toHaveBeenCalledWith(2, 0.2); // Second: fallback temperature
      expect(operation).toHaveBeenCalledWith(3, 0.2); // Third: fallback temperature
    });

    it('should respect maxAttempts limit', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const options: RetryOptions = {
        maxAttempts: 2,
        baseTemperature: 0.7,
      };

      await expect(withRetry(operation, options)).rejects.toThrow(
        'Failed to generate commit messages after 2 attempts: Always fails'
      );

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use default maxAttempts of 3', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const options: RetryOptions = { baseTemperature: 0.7 };

      await expect(withRetry(operation, options)).rejects.toThrow(
        'Failed to generate commit messages after 3 attempts: Always fails'
      );

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use fallbackTemperature when baseTemperature is higher', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce('success');

      const options: RetryOptions = {
        baseTemperature: 0.9,
        fallbackTemperature: 0.3,
      };

      await withRetry(operation, options);

      expect(operation).toHaveBeenCalledWith(1, 0.9);
      expect(operation).toHaveBeenCalledWith(2, 0.3);
    });

    it('should use baseTemperature when it is lower than fallbackTemperature', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce('success');

      const options: RetryOptions = {
        baseTemperature: 0.2,
        fallbackTemperature: 0.5,
      };

      await withRetry(operation, options);

      expect(operation).toHaveBeenCalledWith(1, 0.2);
      expect(operation).toHaveBeenCalledWith(2, 0.2); // min(0.5, 0.2) = 0.2
    });

    it('should use default fallbackTemperature of 0.3', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce('success');

      const options: RetryOptions = { baseTemperature: 0.7 };

      await withRetry(operation, options);

      expect(operation).toHaveBeenCalledWith(1, 0.7);
      expect(operation).toHaveBeenCalledWith(2, 0.3);
    });

    it('should handle string error messages', async () => {
      const operation = vi.fn().mockRejectedValue('String error');
      const options: RetryOptions = {
        maxAttempts: 1,
        baseTemperature: 0.7,
      };

      await expect(withRetry(operation, options)).rejects.toThrow(
        'Failed to generate commit messages after 1 attempts: String error'
      );
    });

    it('should handle non-string, non-Error rejections', async () => {
      const operation = vi.fn().mockRejectedValue({ custom: 'error object' });
      const options: RetryOptions = {
        maxAttempts: 1,
        baseTemperature: 0.7,
      };

      await expect(withRetry(operation, options)).rejects.toThrow(
        'Failed to generate commit messages after 1 attempts: [object Object]'
      );
    });

    it('should propagate the last error with full context', async () => {
      const specificError = new Error('Very specific error message');
      const operation = vi.fn().mockRejectedValue(specificError);
      const options: RetryOptions = {
        maxAttempts: 2,
        baseTemperature: 0.7,
      };

      await expect(withRetry(operation, options)).rejects.toThrow(
        'Failed to generate commit messages after 2 attempts: Very specific error message'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle maxAttempts of 1', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));
      const options: RetryOptions = {
        maxAttempts: 1,
        baseTemperature: 0.7,
      };

      await expect(withRetry(operation, options)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith(1, 0.7);
    });

    it('should handle maxAttempts of 0 by using undefined behavior', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));
      const options: RetryOptions = {
        maxAttempts: 0,
        baseTemperature: 0.7,
      };

      // maxAttempts of 0 leads to undefined behavior - the loop never runs
      await expect(withRetry(operation, options)).rejects.toThrow(
        'Unexpected error in retry strategy'
      );
      expect(operation).not.toHaveBeenCalled();
    });

    it('should handle temperature values at boundaries', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('success');

      const options: RetryOptions = {
        baseTemperature: 0,
        fallbackTemperature: 1,
      };

      await withRetry(operation, options);

      expect(operation).toHaveBeenCalledWith(1, 0);
      expect(operation).toHaveBeenCalledWith(2, 0); // min(1, 0) = 0
    });

    it('should maintain attempt count correctly across retries', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockRejectedValueOnce(new Error('Attempt 3'))
        .mockResolvedValueOnce('success');

      const options: RetryOptions = {
        maxAttempts: 4,
        baseTemperature: 0.7,
      };

      await withRetry(operation, options);

      expect(operation).toHaveBeenCalledWith(1, 0.7);
      expect(operation).toHaveBeenCalledWith(2, 0.3);
      expect(operation).toHaveBeenCalledWith(3, 0.3);
      expect(operation).toHaveBeenCalledWith(4, 0.3);
    });

    it('should handle negative maxAttempts gracefully', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));
      const options: RetryOptions = {
        maxAttempts: -1,
        baseTemperature: 0.7,
      };

      await expect(withRetry(operation, options)).rejects.toThrow(
        'Unexpected error in retry strategy'
      );
      expect(operation).not.toHaveBeenCalled();
    });

    it('should handle extremely high maxAttempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const options: RetryOptions = {
        maxAttempts: 1000,
        baseTemperature: 0.7,
      };

      // Should fail after 1000 attempts
      await expect(withRetry(operation, options)).rejects.toThrow(
        'Failed to generate commit messages after 1000 attempts: Always fails'
      );
      expect(operation).toHaveBeenCalledTimes(1000);
    });

    it('should handle null error objects', async () => {
      const operation = vi.fn().mockRejectedValue(null);
      const options: RetryOptions = {
        maxAttempts: 1,
        baseTemperature: 0.7,
      };

      await expect(withRetry(operation, options)).rejects.toThrow(
        'Failed to generate commit messages after 1 attempts: null'
      );
    });

    it('should handle undefined error objects', async () => {
      const operation = vi.fn().mockRejectedValue(undefined);
      const options: RetryOptions = {
        maxAttempts: 1,
        baseTemperature: 0.7,
      };

      await expect(withRetry(operation, options)).rejects.toThrow(
        'Failed to generate commit messages after 1 attempts: undefined'
      );
    });

    it('should handle complex error objects', async () => {
      const complexError = { code: 500, message: 'Server Error', details: {} };
      const operation = vi.fn().mockRejectedValue(complexError);
      const options: RetryOptions = {
        maxAttempts: 1,
        baseTemperature: 0.7,
      };

      await expect(withRetry(operation, options)).rejects.toThrow(
        'Failed to generate commit messages after 1 attempts: [object Object]'
      );
    });
  });

  describe('Type Safety', () => {
    it('should preserve return type of operation', async () => {
      const numberOperation = vi.fn().mockResolvedValue(42);
      const options: RetryOptions = { baseTemperature: 0.7 };

      const result = await withRetry(numberOperation, options);

      // TypeScript should infer result as number
      expect(typeof result).toBe('number');
      expect(result).toBe(42);
    });

    it('should handle complex return types', async () => {
      interface ComplexResult {
        data: string[];
        count: number;
      }

      const complexOperation = vi.fn().mockResolvedValue({
        data: ['a', 'b', 'c'],
        count: 3,
      } as ComplexResult);

      const options: RetryOptions = { baseTemperature: 0.7 };

      const result: ComplexResult = await withRetry(complexOperation, options);

      expect(result.data).toEqual(['a', 'b', 'c']);
      expect(result.count).toBe(3);
    });
  });
});
