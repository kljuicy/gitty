import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Ora } from 'ora';

// Mock ora before importing our spinner
const mockOra = vi.hoisted(() => {
  const mockSpinner: Partial<Ora> = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };

  return {
    default: vi.fn(() => mockSpinner),
    mockSpinner,
  };
});

vi.mock('ora', () => mockOra);

import { createSpinner, type OraLike } from './spinner';

describe('Spinner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSpinner', () => {
    it('should create a spinner instance', async () => {
      const spinner = await createSpinner();

      expect(spinner).toBeDefined();
      expect(typeof spinner.start).toBe('function');
      expect(typeof spinner.succeed).toBe('function');
      expect(typeof spinner.fail).toBe('function');
      expect(typeof spinner.stop).toBe('function');
    });

    it('should create a single ora instance and reuse it', async () => {
      await createSpinner();

      // Verify ora was called to create the instance
      expect(mockOra.default).toHaveBeenCalledOnce();
      expect(mockOra.default).toHaveBeenCalledWith(); // No initial text
    });

    it('should call start with message on the same instance', async () => {
      const spinner = await createSpinner();

      spinner.start('Testing message');

      expect(mockOra.mockSpinner.start).toHaveBeenCalledOnce();
      expect(mockOra.mockSpinner.start).toHaveBeenCalledWith('Testing message');
    });

    it('should call succeed with message on the same instance', async () => {
      const spinner = await createSpinner();

      spinner.succeed('Success message');

      expect(mockOra.mockSpinner.succeed).toHaveBeenCalledOnce();
      expect(mockOra.mockSpinner.succeed).toHaveBeenCalledWith(
        'Success message'
      );
    });

    it('should call fail with message on the same instance', async () => {
      const spinner = await createSpinner();

      spinner.fail('Error message');

      expect(mockOra.mockSpinner.fail).toHaveBeenCalledOnce();
      expect(mockOra.mockSpinner.fail).toHaveBeenCalledWith('Error message');
    });

    it('should call stop on the same instance', async () => {
      const spinner = await createSpinner();

      spinner.stop();

      expect(mockOra.mockSpinner.stop).toHaveBeenCalledOnce();
      expect(mockOra.mockSpinner.stop).toHaveBeenCalledWith();
    });

    it('should reuse the same ora instance for all operations', async () => {
      const spinner = await createSpinner();

      // Call multiple methods
      spinner.start('Starting...');
      spinner.succeed('Done!');

      // Should still be using the same ora instance
      expect(mockOra.default).toHaveBeenCalledOnce(); // Only one ora instance created
      expect(mockOra.mockSpinner.start).toHaveBeenCalledWith('Starting...');
      expect(mockOra.mockSpinner.succeed).toHaveBeenCalledWith('Done!');
    });

    it('should work with a typical spinner lifecycle', async () => {
      const spinner = await createSpinner();

      // Typical usage pattern
      spinner.start('Loading...');
      spinner.succeed('Loaded successfully!');

      // Verify the sequence
      expect(mockOra.mockSpinner.start).toHaveBeenCalledWith('Loading...');
      expect(mockOra.mockSpinner.succeed).toHaveBeenCalledWith(
        'Loaded successfully!'
      );

      // Verify they were called on the same instance
      expect(mockOra.default).toHaveBeenCalledOnce();
    });

    it('should handle error scenarios', async () => {
      const spinner = await createSpinner();

      // Error scenario
      spinner.start('Processing...');
      spinner.fail('Something went wrong!');

      expect(mockOra.mockSpinner.start).toHaveBeenCalledWith('Processing...');
      expect(mockOra.mockSpinner.fail).toHaveBeenCalledWith(
        'Something went wrong!'
      );
    });
  });

  describe('OraLike interface', () => {
    it('should match the expected interface', async () => {
      const spinner: OraLike = await createSpinner();

      // Verify interface compliance
      expect(spinner).toMatchObject({
        start: expect.any(Function),
        succeed: expect.any(Function),
        fail: expect.any(Function),
        stop: expect.any(Function),
      });
    });
  });
});
