/* eslint-env node */

/**
 * Centralized test strings for integration tests
 *
 * This file contains all expected strings used in test assertions.
 * Benefits:
 * - Single source of truth for expected outputs
 * - Easy to update when UI messages change
 * - Prepared for future internationalization
 * - Better maintainability
 */

export const TEST_STRINGS = {
  // Error messages from config manager
  CONFIG_ERRORS: {
    INVALID_JSON: '🚨 Your gitty configuration file has invalid JSON syntax',
    CONFIG_LOCATION: 'Config file location:',
    FIX_SYNTAX:
      'Please fix the JSON syntax or delete the file to reset to defaults',

    // Specific JSON error hints
    TRAILING_COMMA:
      '💡 Hint: Detected trailing comma - remove the comma before } or ]',
    UNQUOTED_VALUES:
      '💡 Hint: Detected unquoted values - wrap string values in quotes',
    UNQUOTED_PROPERTIES:
      '💡 Hint: Detected unquoted property names - wrap property names in quotes',
    UNCLOSED_BRACES: '💡 Hint: Detected unclosed braces - missing closing }',
    GENERIC_ISSUES:
      '💡 Hint: Common issues: missing quotes, trailing commas, unclosed braces',
    LINE_NUMBER: '💡 Hint: Error appears to be around line',

    // Local config specific
    LOCAL_MALFORMED: 'Local repository configuration has malformed JSON syntax',
    FALLBACK_TO_GLOBAL: 'Falling back to global configuration',
  },

  // Git repository errors
  GIT_ERRORS: {
    NOT_GIT_REPO: 'Git repository error',
    SUGGEST_INIT: 'git init',
    NO_COMMITS: 'No changes to commit',
    NO_STAGED: 'No staged changes found',
    STAGE_FIRST: 'Stage your changes first',
  },

  // API and provider errors
  API_ERRORS: {
    NO_API_KEY: 'No API key found',
    SET_API_KEY: 'Set up your API key',
    SET_KEY_FLAG: '--set-key',
    ENVIRONMENT_VAR: 'environment variable',
    API_KEY_GENERAL: 'API key',
  },

  // CLI validation errors
  CLI_ERRORS: {
    COMMAND_CONFLICT: 'command',
    TEMPERATURE_RANGE: 'Temperature must be between 0 and 2',
    PREPEND_ISSUE: 'prepend',
    PERMISSION_ISSUE: 'permission',
    ADD_REPO_REQUIRES: 'add-repo requires',
  },

  // Success indicators
  SUCCESS: {
    GITTY_HEADER: '🐥 Gitty',
    CHANGES_TO_COMMIT: '📋 Changes to be committed',
    AI_CONFIG: '🤖 AI Configuration',
  },

  // Fallback and warning patterns
  WARNINGS: {
    SYNTAX_ERROR: 'SyntaxError',
    JSON_PARSE: 'JSON.parse',
    NOT_VALID_JSON: 'not valid JSON',
    CONFIG_GENERAL: 'config',
    CONFIGURATION: 'configuration',
  },

  // Test prepends for verification
  TEST_PREPENDS: {
    DEFAULT: 'DEFAULT-',
    GLOBAL: 'GLOBAL-',
    WORK: 'WORK-',
    TEST: 'TEST-',
  },
};

/**
 * Helper function to get a test string by path
 * Example: getTestString('CONFIG_ERRORS.INVALID_JSON')
 */
export function getTestString(path) {
  const parts = path.split('.');
  let current = TEST_STRINGS;

  for (const part of parts) {
    if (current[part] === undefined) {
      throw new Error(`Test string not found: ${path}`);
    }
    current = current[part];
  }

  return current;
}

/**
 * Helper function to check if output contains any of multiple possible strings
 * Useful for error messages that might vary slightly
 */
export function containsAny(output, possibleStrings) {
  return possibleStrings.some(str => output.includes(str));
}
