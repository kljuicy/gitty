/* istanbul ignore file */
/**
 * Testing utilities - centralized exports
 * Import from here for consistent testing patterns
 */

// Console utilities
export {
  expectConsoleOutput,
  testSigintHandling,
  setupConsoleSpy,
} from './console';

// Validation test utilities
export { createValidationTestHelpers } from './validation';

// Inquirer utilities
export { mockInquirerResponses } from './inquirer';

/**
 * ⚠️ CONF MOCKING NOTE:
 * Conf mocking must be done inline within vi.hoisted() due to hoisting limitations.
 * See working patterns in manager-provider-override.test.ts and manager-file-io.test.ts
 */

// Common setup utilities
import { vi, beforeEach, afterEach } from 'vitest';

/**
 * Standard mock cleanup
 */
export const setupMockCleanup = () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
};
