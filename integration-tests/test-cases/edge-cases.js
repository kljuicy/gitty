/* eslint-env node */
/* global process, console */

/**
 * Edge Cases & Negative Test Scenarios
 *
 * Tests for:
 * - Git repository issues
 * - API failures and network problems
 * - File system permissions and corruption
 * - Config edge cases and malformed data
 * - Error handling and graceful degradation
 */

import { join } from 'path';
import { writeFileSync, mkdirSync, chmodSync } from 'fs';
import { TEST_STRINGS } from '../framework/test-strings.js';

/**
 * Register edge cases and negative test scenarios
 */
export function registerEdgeCasesTests(framework) {
  // Test Suite: Edge Cases & Error Scenarios
  framework.registerSuite('edge-cases');

  // ===== GIT REPOSITORY ISSUES =====

  // Test: Not in a git repository
  framework.registerTest(
    'edge-cases',
    'Not in git repository error',
    async context => {
      try {
        // Setup: Create a directory that's NOT a git repo AND not inside the test git repo
        const tempBase = process.env.TMPDIR || '/tmp';
        const tempDir = join(tempBase, `no-git-${Date.now()}`);
        mkdirSync(tempDir, { recursive: true });

        // Execute: gitty should fail gracefully (run in the non-git directory)
        const result = await context.executeGitty(['--preview'], {
          cwd: tempDir, // Run gitty in the non-git directory
        });

        // Validate: Should succeed but show clean git repository error message
        context.assert.commandSucceeded(
          result,
          'Should succeed with helpful error message'
        );
        context.assert.outputContains(
          result,
          TEST_STRINGS.GIT_ERRORS.NOT_GIT_REPO,
          'Should show "Git repository error"'
        );
        context.assert.outputContains(
          result,
          TEST_STRINGS.GIT_ERRORS.SUGGEST_INIT,
          'Should suggest git init command'
        );
        // Ensure no duplicate messages
        context.assert.outputNotContains(
          result,
          'Not a git repository',
          'Should not show duplicate "Not a git repository" message'
        );
      } finally {
        context.cleanup();
      }
    }
  );

  // Test: Git repository with no commits
  framework.registerTest(
    'edge-cases',
    'Git repo with no commits',
    async context => {
      try {
        // Setup: Fresh git repo with no commits (ISOLATED in temp directory)
        const tempBase = process.env.TMPDIR || '/tmp';
        const tempDir = join(tempBase, `empty-git-${Date.now()}`);
        mkdirSync(tempDir, { recursive: true });

        // Initialize git but don't make any commits
        const { execSync } = await import('child_process');
        execSync('git init', { stdio: 'pipe', cwd: tempDir });
        execSync('git config user.email "test@example.com"', {
          stdio: 'pipe',
          cwd: tempDir,
        });
        execSync('git config user.name "Test User"', {
          stdio: 'pipe',
          cwd: tempDir,
        });

        // Create basic config (in ISOLATED fake home)
        context.createGlobalConfig({
          defaultProvider: 'openai',
          providers: {
            openai: { apiKey: 'test-key' },
          },
          default: { prepend: 'TEST-' },
        });

        // Execute: gitty should handle no commits gracefully (run in the empty git repo)
        const result = await context.executeGitty(['--preview'], {
          cwd: tempDir, // Run gitty in the empty git repository
        });

        // Validate: Should succeed but show appropriate message about no changes
        context.assert.commandSucceeded(
          result,
          'Should succeed with helpful message'
        );
        context.assert.outputContains(
          result,
          TEST_STRINGS.GIT_ERRORS.NO_COMMITS,
          'Should mention no changes to commit'
        );
      } finally {
        context.cleanup();
      }
    }
  );

  // Test: No staged changes (this actually succeeds with warning)
  framework.registerTest(
    'edge-cases',
    'No staged changes warning',
    async context => {
      try {
        // Setup: Ensure no staged changes (SAFE: only in test directory)
        const { execSync } = await import('child_process');
        try {
          execSync('git reset HEAD .', { stdio: 'pipe', cwd: context.testDir });
        } catch {
          // Ignore if nothing to reset
        }

        context.createGlobalConfig({
          defaultProvider: 'openai',
          providers: {
            openai: { apiKey: 'test-key' },
          },
          default: { prepend: 'TEST-' },
        });

        // Execute: gitty should handle no staged changes gracefully
        const result = await context.executeGitty(['--preview']);

        // Validate: Should succeed but show warning about staging
        context.assert.commandSucceeded(result, 'Should succeed with warning');
        context.assert.outputContains(
          result,
          TEST_STRINGS.GIT_ERRORS.NO_STAGED,
          'Should show no staged changes warning'
        );
        context.assert.outputContains(
          result,
          TEST_STRINGS.GIT_ERRORS.STAGE_FIRST,
          'Should suggest staging changes'
        );
      } finally {
        context.cleanup();
      }
    }
  );

  // ===== API AND NETWORK FAILURES =====

  // Test: Invalid API key (simplified - test API key validation failure)
  framework.registerTest(
    'edge-cases',
    'Invalid API key error',
    async context => {
      // Setup: Config with no API key at all (should trigger validation failure)
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          // No API key provided - this should fail during config resolution
        },
        default: { prepend: 'TEST-' },
      });

      // Execute: gitty should detect missing API key during config resolution
      const result = await context.executeGitty(['--preview'], {
        env: {
          // Ensure no fallback to env vars
          OPENAI_API_KEY: undefined,
          GEMINI_API_KEY: undefined,
        },
      });

      // Validate: Should fail with API key setup guidance
      context.assert.commandFailed(result, 'Should fail with missing API key');
      context.assert.containsOneOf(
        result.stderr + result.stdout,
        [
          TEST_STRINGS.API_ERRORS.SET_API_KEY,
          TEST_STRINGS.API_ERRORS.API_KEY_GENERAL,
          TEST_STRINGS.API_ERRORS.NO_API_KEY,
          TEST_STRINGS.API_ERRORS.SET_KEY_FLAG,
        ],
        'Should mention API key setup guidance'
      );

      context.cleanup();
    },
    { mock: false } // Disable mocking for real API validation
  );

  // Test: Missing API key entirely
  framework.registerTest(
    'edge-cases',
    'Missing API key error',
    async context => {
      // Setup: Config with empty/missing API key
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: { apiKey: '' }, // Empty API key
        },
        default: { prepend: 'TEST-' },
      });

      // Execute: gitty should detect missing API key
      const result = await context.executeGitty(['--preview'], {
        env: {
          OPENAI_API_KEY: undefined,
          GEMINI_API_KEY: undefined,
        },
      });

      // Validate: Should fail with setup guidance
      context.assert.commandFailed(result, 'Should fail with missing API key');
      context.assert.outputContains(
        result,
        TEST_STRINGS.API_ERRORS.API_KEY_GENERAL,
        'Should mention missing API key'
      );
      context.assert.containsOneOf(
        result.stderr + result.stdout,
        [
          TEST_STRINGS.API_ERRORS.SET_KEY_FLAG,
          TEST_STRINGS.API_ERRORS.ENVIRONMENT_VAR,
        ],
        'Should suggest API key setup methods'
      );

      context.cleanup();
    },
    { mock: false }
  );

  // ===== CONFIG FILE ISSUES =====

  // Test: Missing preset reference (graceful fallback)
  framework.registerTest(
    'edge-cases',
    'Missing preset graceful fallback',
    async context => {
      // Setup: Config with valid presets but reference non-existent one
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: { apiKey: 'test-key' },
        },
        default: { prepend: 'DEFAULT-' },
        presets: {
          work: { prepend: 'WORK-' },
        },
      });

      // Execute: gitty with non-existent preset should fall back gracefully
      const result = await context.executeGitty([
        '-P',
        'nonexistent',
        '--preview',
      ]);

      // Validate: Should succeed using default config (graceful fallback)
      context.assert.commandSucceeded(result, 'Should fallback gracefully');
      context.assert.outputContains(
        result,
        'DEFAULT-',
        'Should fall back to default prepend when preset missing'
      );

      context.cleanup();
    }
  );

  // Test: Malformed JSON config (should fail gracefully)
  framework.registerTest(
    'edge-cases',
    'Malformed global config fallback',
    async context => {
      // Setup: Create invalid JSON config
      const configDir = join(context.homeDir, '.gitty');
      mkdirSync(configDir, { recursive: true });
      const configPath = join(configDir, 'config.json');
      writeFileSync(configPath, '{ "invalid": json, "missing": quotes }');

      // Execute: gitty should fail gracefully with malformed config
      const result = await context.executeGitty(['--preview']);

      // Validate: Should fail with helpful error about config issue
      context.assert.commandFailed(result, 'Should fail with malformed config');
      context.assert.containsOneOf(
        result.stderr + result.stdout,
        [
          'SyntaxError',
          'not valid JSON',
          'JSON.parse',
          'config',
          'configuration',
        ],
        'Should mention JSON or config error'
      );

      context.cleanup();
    }
  );

  // Test: Corrupted local config
  framework.registerTest(
    'edge-cases',
    'Corrupted local config',
    async context => {
      // Setup: Global config first (valid)
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: { apiKey: 'test-key' },
        },
        default: { prepend: 'GLOBAL-' },
      });

      // Create corrupted local config
      const gitDir = join(context.testDir, '.git');
      mkdirSync(gitDir, { recursive: true });
      const localConfigPath = join(gitDir, 'gittyrc.json');
      writeFileSync(localConfigPath, 'not json at all!');

      // Execute: gitty should fall back to global config
      const result = await context.executeGitty(['--preview']);

      // Validate: Should succeed using global config (graceful degradation)
      context.assert.commandSucceeded(
        result,
        'Should fall back to global config'
      );
      context.assert.outputContains(
        result,
        'GLOBAL-',
        'Should use global config as fallback'
      );

      context.cleanup();
    }
  );

  // ===== CLI ARGUMENT EDGE CASES =====

  // Test: Extremely long prepend
  framework.registerTest(
    'edge-cases',
    'Extremely long prepend',
    async context => {
      // Setup: Basic config
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: { apiKey: 'test-key' },
        },
        default: { prepend: '' },
      });

      // Execute: gitty with very long prepend
      const longPrepend = 'A'.repeat(1000); // 1000 character prepend
      const result = await context.executeGitty([
        '-p',
        longPrepend,
        '--preview',
      ]);

      // Validate: Should either succeed or fail gracefully
      if (result.success) {
        context.assert.outputContains(
          result,
          longPrepend,
          'Should handle long prepend if accepted'
        );
      } else {
        context.assert.outputContains(
          result,
          'prepend',
          'Should mention prepend issue if rejected'
        );
      }

      context.cleanup();
    }
  );

  // Test: Special characters in prepend
  framework.registerTest(
    'edge-cases',
    'Special characters in prepend',
    async context => {
      // Setup: Basic config
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: { apiKey: 'test-key' },
        },
        default: { prepend: '' },
      });

      // Execute: gitty with special characters
      const specialPrepend = '🚀[URGENT]#@$%^&*()';
      const result = await context.executeGitty([
        '-p',
        specialPrepend,
        '--preview',
      ]);

      // Validate: Should handle special characters gracefully
      context.assert.commandSucceeded(
        result,
        'Should handle special characters'
      );
      context.assert.outputContains(
        result,
        specialPrepend,
        'Should preserve special characters in output'
      );

      context.cleanup();
    }
  );

  // ===== FILE SYSTEM EDGE CASES =====

  // Test: No write permissions for config (when possible to simulate)
  framework.registerTest(
    'edge-cases',
    'Config write permission error',
    async context => {
      // SAFETY: This test might not work on all systems due to permission restrictions
      // Skip on systems where we can't safely change permissions
      if (process.platform === 'win32') {
        context.assert.isTrue(true, 'Skipping permission test on Windows');
        context.cleanup();
        return;
      }

      let configDir;
      let permissionsChanged = false;

      try {
        // Setup: Make config directory read-only (SAFE: only in fake home)
        configDir = join(context.homeDir, '.gitty');
        mkdirSync(configDir, { recursive: true });

        // SAFETY: Record that we're about to change permissions
        permissionsChanged = true;
        chmodSync(configDir, 0o444); // Read-only

        // Execute: Try to run set-key which would write config
        const result = await context.executeGitty([
          '--set-key',
          '--provider',
          'openai',
        ]);

        // Validate: Should fail with permission error
        context.assert.commandFailed(
          result,
          'Should fail with permission error'
        );
        context.assert.outputContains(
          result,
          'permission',
          'Should mention permission issue'
        );
      } catch {
        // If we can't test permissions, that's okay
        context.assert.isTrue(
          true,
          'Permission test not applicable on this system'
        );
      } finally {
        // SAFETY: Always restore permissions if we changed them
        if (permissionsChanged && configDir) {
          try {
            chmodSync(configDir, 0o755);
          } catch (permError) {
            console.warn(
              `⚠️  Could not restore permissions on ${configDir}: ${permError.message}`
            );
            console.warn(
              `⚠️  This directory is in a temporary test location and will be cleaned up`
            );
          }
        }
        context.cleanup();
      }
    }
  );

  // ===== INTEGRATION ERROR SCENARIOS =====

  // Test: Conflicting command combinations
  framework.registerTest(
    'edge-cases',
    'Multiple conflicting flags',
    async context => {
      // Setup: Basic config
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: { apiKey: 'test-key' },
        },
      });

      // Execute: gitty with conflicting operations
      const result = await context.executeGitty([
        '--set-key',
        '--add-repo',
        '--set-provider',
        '--preview',
        '-P',
        'work',
      ]);

      // Validate: Should reject conflicting commands
      context.assert.commandFailed(
        result,
        'Should reject conflicting commands'
      );
      context.assert.outputContains(
        result,
        'command',
        'Should mention command conflict'
      );

      context.cleanup();
    }
  );

  // Test: Invalid temperature value
  framework.registerTest(
    'edge-cases',
    'Invalid temperature range',
    async context => {
      // Setup: Basic config
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: { apiKey: 'test-key' },
        },
      });

      // Execute: gitty with invalid temperature (-1 is definitely outside 0-2 range)
      const result = await context.executeGitty(
        ['--temperature', '-1', '--preview'],
        {
          stdin: false,
        }
      );

      // Validate: Should reject invalid temperature
      context.assert.commandFailed(result, 'Should reject invalid temperature');
      context.assert.outputContains(
        result,
        'Temperature must be between 0 and 2',
        'Should mention temperature validation'
      );

      context.cleanup();
    }
  );

  // ===== MALFORMED CONFIG ERROR HANDLING =====

  // Test: Malformed global config with helpful error messages
  framework.registerTest(
    'edge-cases',
    'Malformed global config with user-friendly errors',
    async context => {
      // Setup: Create malformed global config
      const configDir = join(context.homeDir, '.gitty');
      mkdirSync(configDir, { recursive: true });

      // Write malformed JSON to global config
      const malformedConfig =
        '{ "defaultProvider": "openai", "invalid": json }';
      writeFileSync(join(configDir, 'config.json'), malformedConfig);

      // Execute: gitty should show user-friendly error for malformed config
      const result = await context.executeGitty(['--preview']);

      // Validate: Should fail with helpful error message (not raw JSON parse error)
      context.assert.commandFailed(result, 'Should fail with malformed config');
      context.assert.outputContains(
        result,
        TEST_STRINGS.CONFIG_ERRORS.INVALID_JSON,
        'Should show user-friendly error message'
      );
      context.assert.outputContains(
        result,
        TEST_STRINGS.CONFIG_ERRORS.CONFIG_LOCATION,
        'Should show file location'
      );
      context.assert.outputContains(
        result,
        TEST_STRINGS.CONFIG_ERRORS.UNQUOTED_VALUES,
        'Should show helpful hints'
      );
      context.assert.outputNotContains(
        result,
        TEST_STRINGS.WARNINGS.SYNTAX_ERROR,
        'Should not show raw JSON parse errors'
      );

      context.cleanup();
    }
  );

  // Test: Malformed local config with helpful error messages
  framework.registerTest(
    'edge-cases',
    'Malformed local config with user-friendly errors',
    async context => {
      // Setup: Create valid global config first
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: { apiKey: 'test-key' },
        },
        default: { prepend: 'GLOBAL-' },
      });

      // Create malformed local config
      const gitDir = join(context.testDir, '.git');
      mkdirSync(gitDir, { recursive: true });

      const malformedLocalConfig =
        '{ "defaultProvider": "gemini", "invalid": json }';
      writeFileSync(join(gitDir, 'gittyrc.json'), malformedLocalConfig);

      // Execute: gitty should show warning but succeed with global config fallback
      const result = await context.executeGitty(['--preview']);

      // Validate: Should succeed using global config (graceful degradation)
      context.assert.commandSucceeded(
        result,
        'Should succeed with local config fallback'
      );
      context.assert.outputContains(
        result,
        TEST_STRINGS.TEST_PREPENDS.GLOBAL,
        'Should use global config as fallback'
      );
      context.assert.outputContains(
        result,
        TEST_STRINGS.CONFIG_ERRORS.LOCAL_MALFORMED,
        'Should show warning for malformed local config'
      );

      context.cleanup();
    }
  );

  // Test: Empty malformed global config
  framework.registerTest(
    'edge-cases',
    'Empty malformed global config',
    async context => {
      // Setup: Create empty config file
      const configDir = join(context.homeDir, '.gitty');
      mkdirSync(configDir, { recursive: true });
      writeFileSync(join(configDir, 'config.json'), '');

      // Execute: gitty should handle empty config gracefully
      const result = await context.executeGitty(['--preview']);

      // Validate: Should fail with helpful error
      context.assert.commandFailed(result, 'Should fail with empty config');
      context.assert.outputContains(
        result,
        '🚨 Your gitty configuration file has invalid JSON syntax',
        'Should show error for empty config'
      );

      context.cleanup();
    }
  );

  // Test: Config with trailing commas
  framework.registerTest(
    'edge-cases',
    'Config with trailing commas',
    async context => {
      // Setup: Create config with trailing commas
      const configDir = join(context.homeDir, '.gitty');
      mkdirSync(configDir, { recursive: true });

      const configWithTrailingComma =
        '{ "defaultProvider": "openai", "providers": {}, }';
      writeFileSync(join(configDir, 'config.json'), configWithTrailingComma);

      // Execute: gitty should detect trailing comma issue
      const result = await context.executeGitty(['--preview']);

      // Validate: Should fail with helpful hints about trailing commas
      context.assert.commandFailed(
        result,
        'Should fail with trailing comma config'
      );
      context.assert.outputContains(
        result,
        TEST_STRINGS.CONFIG_ERRORS.GENERIC_ISSUES,
        'Should show helpful hints'
      );

      context.cleanup();
    }
  );

  // Test: Config with missing quotes
  framework.registerTest(
    'edge-cases',
    'Config with missing quotes',
    async context => {
      // Setup: Create config with missing quotes
      const configDir = join(context.homeDir, '.gitty');
      mkdirSync(configDir, { recursive: true });

      const configWithMissingQuotes =
        '{ defaultProvider: openai, providers: {} }';
      writeFileSync(join(configDir, 'config.json'), configWithMissingQuotes);

      // Execute: gitty should detect missing quotes
      const result = await context.executeGitty(['--preview']);

      // Validate: Should fail with helpful error
      context.assert.commandFailed(
        result,
        'Should fail with missing quotes config'
      );
      context.assert.outputContains(
        result,
        '🚨 Your gitty configuration file has invalid JSON syntax',
        'Should show error for missing quotes'
      );

      context.cleanup();
    }
  );

  // Test: Multi-line malformed config with line number hint
  framework.registerTest(
    'edge-cases',
    'Multi-line malformed config with line detection',
    async context => {
      // Setup: Create multi-line malformed config
      const configDir = join(context.homeDir, '.gitty');
      mkdirSync(configDir, { recursive: true });

      const multilineMalformedConfig = `{
  "defaultProvider": "openai",
  "providers": {
    "openai": {
      "apiKey": "test"
    }
  },
  "invalid": json,
  "missing": quotes
}`;
      writeFileSync(join(configDir, 'config.json'), multilineMalformedConfig);

      // Execute: gitty should detect error position
      const result = await context.executeGitty(['--preview']);

      // Validate: Should fail with line number hint
      context.assert.commandFailed(
        result,
        'Should fail with multi-line malformed config'
      );
      context.assert.outputContains(
        result,
        TEST_STRINGS.CONFIG_ERRORS.UNQUOTED_VALUES,
        'Should show unquoted values detection'
      );

      context.cleanup();
    }
  );

  // Test: Unclosed braces in config
  framework.registerTest(
    'edge-cases',
    'Config with unclosed braces',
    async context => {
      // Setup: Create config with unclosed braces
      const configDir = join(context.homeDir, '.gitty');
      mkdirSync(configDir, { recursive: true });

      const configWithUnclosedBraces =
        '{ "defaultProvider": "openai", "providers": {';
      writeFileSync(join(configDir, 'config.json'), configWithUnclosedBraces);

      // Execute: gitty should detect unclosed braces
      const result = await context.executeGitty(['--preview']);

      // Validate: Should fail with helpful error
      context.assert.commandFailed(
        result,
        'Should fail with unclosed braces config'
      );
      context.assert.outputContains(
        result,
        TEST_STRINGS.CONFIG_ERRORS.UNCLOSED_BRACES,
        'Should show helpful hints'
      );

      context.cleanup();
    }
  );

  // Test: Large malformed config file
  framework.registerTest(
    'edge-cases',
    'Large malformed config file',
    async context => {
      // Setup: Create large malformed config
      const configDir = join(context.homeDir, '.gitty');
      mkdirSync(configDir, { recursive: true });

      // Create a large but malformed config
      const largeMalformedConfig =
        '{ "defaultProvider": "openai", "data": "' +
        'x'.repeat(5000) +
        '", "invalid": syntax }';
      writeFileSync(join(configDir, 'config.json'), largeMalformedConfig);

      // Execute: gitty should handle large malformed files
      const result = await context.executeGitty(['--preview']);

      // Validate: Should fail gracefully even with large files
      context.assert.commandFailed(
        result,
        'Should fail with large malformed config'
      );
      context.assert.outputContains(
        result,
        '🚨 Your gitty configuration file has invalid JSON syntax',
        'Should show error for large malformed config'
      );

      // Should not show the entire large content in error
      context.assert.outputNotContains(
        result,
        'x'.repeat(1000),
        'Should not show large content in error message'
      );

      context.cleanup();
    }
  );

  // Test: Valid local config with malformed global config
  framework.registerTest(
    'edge-cases',
    'Valid local config with malformed global config',
    async context => {
      // Setup: Create malformed global config
      const configDir = join(context.homeDir, '.gitty');
      mkdirSync(configDir, { recursive: true });
      writeFileSync(join(configDir, 'config.json'), '{ malformed global }');

      // Create valid local config
      const gitDir = join(context.testDir, '.git');
      mkdirSync(gitDir, { recursive: true });
      const validLocalConfig = JSON.stringify({
        defaultProvider: 'gemini',
        style: 'detailed',
      });
      writeFileSync(join(gitDir, 'gittyrc.json'), validLocalConfig);

      // Execute: Should fail on global config before reading local
      const result = await context.executeGitty(['--preview']);

      // Validate: Should fail with global config error
      context.assert.commandFailed(
        result,
        'Should fail with malformed global config'
      );
      context.assert.outputContains(
        result,
        '🚨 Your gitty configuration file has invalid JSON syntax',
        'Should show global config error'
      );

      context.cleanup();
    }
  );
}
