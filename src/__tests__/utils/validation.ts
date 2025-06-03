/* istanbul ignore file */
import { expect } from 'vitest';

/**
 * Validation test helpers
 */
export const createValidationTestHelpers = () => ({
  expectValidationError: (result: any, message: string) => {
    expect(result).toBe(message);
  },

  expectValidationSuccess: (result: any) => {
    expect(result).toBe(true);
  },

  testTemperature: {
    valid: [0, 0.5, 1, 1.5, 2],
    invalid: [-0.1, 2.1, 'invalid', null, undefined],
  },

  testMaxTokens: {
    valid: [1, 100, 1000, 4000],
    invalid: [0, -1, 'invalid', null, undefined],
  },

  testProvider: {
    valid: ['openai', 'gemini'],
    invalid: ['invalid', 'gpt', '', null, undefined],
  },
});
