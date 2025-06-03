/* eslint-env node */

/**
 * CLI Validation & Error Handling Test Cases
 *
 * Tests for:
 * - Invalid argument combinations
 * - Missing required dependencies
 * - Graceful error handling
 * - User-friendly error messages
 */

/**
 * Register validation test cases
 */
export function registerValidationTests(framework) {
  // Test Suite: CLI Validation
  framework.registerSuite('validation');

  // Test: Force prepend requires prepend flag
  framework.registerTest(
    'validation',
    'Force prepend validation',
    async context => {
      // Execute: gitty --force-prepend (without --prepend)
      const result = await context.executeGitty(['--force-prepend']);

      // Validate: Should fail with helpful error
      context.assert.commandFailed(result, 'Should fail without --prepend');
      context.assert.outputContains(
        result,
        'force-prepend requires',
        'Should mention that force-prepend requires --prepend flag'
      );

      context.cleanup();
    }
  );

  // Test: Add repo requires preset flag
  framework.registerTest('validation', 'Add repo validation', async context => {
    // Setup minimal config
    context.createGlobalConfig({
      defaultProvider: 'openai',
      providers: {
        openai: { apiKey: 'test-key' },
      },
      default: { style: 'concise' },
    });

    // Execute: gitty --add-repo (without -P)
    const result = await context.executeGitty(['--add-repo'], {
      stdin: false, // Fails immediately, no interaction needed
    });

    // Validate: Should fail with helpful error
    context.assert.commandFailed(result, 'Should fail without --preset');
    context.assert.outputContains(
      result,
      'add-repo requires',
      'Should mention that add-repo requires --preset flag'
    );

    context.cleanup();
  });

  // Test: Invalid provider rejection
  framework.registerTest(
    'validation',
    'Invalid provider rejection',
    async context => {
      // Execute: gitty --provider invalid
      const result = await context.executeGitty(['--provider', 'invalid'], {
        stdin: false, // Fails immediately, no interaction needed
      });

      // Validate: Should fail with validation error
      context.assert.commandFailed(result, 'Should reject invalid provider');
      context.assert.outputContains(
        result,
        'invalid',
        'Should mention the invalid provider in error message'
      );
      // Should suggest valid options
      context.assert.containsOneOf(
        result.stderr + result.stdout,
        ['openai', 'gemini', 'valid'],
        'Should suggest valid provider options'
      );

      context.cleanup();
    }
  );

  // Test: Invalid style rejection
  framework.registerTest(
    'validation',
    'Invalid style rejection',
    async context => {
      // Execute: gitty --style invalid
      const result = await context.executeGitty(['--style', 'invalid'], {
        stdin: false, // Fails immediately, no interaction needed
      });

      // Validate: Should fail with validation error
      context.assert.commandFailed(result, 'Should reject invalid style');
      context.assert.outputContains(
        result,
        'style',
        'Should mention style in error message'
      );
      // Should suggest valid styles
      context.assert.containsOneOf(
        result.stderr + result.stdout,
        ['concise', 'detailed', 'funny', 'emoji'],
        'Should suggest valid style options'
      );

      context.cleanup();
    }
  );

  // Test: Invalid language rejection
  framework.registerTest(
    'validation',
    'Invalid language rejection',
    async context => {
      // Execute: gitty --language INVALID
      const result = await context.executeGitty(['--language', 'INVALID'], {
        stdin: false, // Fails immediately, no interaction needed
      });

      // Validate: Should fail with validation error
      context.assert.commandFailed(result, 'Should reject invalid language');
      context.assert.outputContains(
        result,
        'language',
        'Should mention language in error message'
      );
      // Should suggest valid languages
      context.assert.containsOneOf(
        result.stderr + result.stdout,
        ['en', 'es', 'fr', 'de'],
        'Should suggest valid language options'
      );

      context.cleanup();
    }
  );

  // Test: Invalid temperature rejection
  framework.registerTest(
    'validation',
    'Invalid temperature rejection',
    async context => {
      // Execute: gitty --temperature abc
      const result = await context.executeGitty(['--temperature', 'abc'], {
        stdin: false, // Fails immediately, no interaction needed
      });

      // Validate: Should fail with validation error
      context.assert.commandFailed(
        result,
        'Should reject non-numeric temperature'
      );
      context.assert.outputContains(
        result,
        'temperature',
        'Should mention temperature in error message'
      );
      context.assert.containsOneOf(
        result.stderr + result.stdout,
        ['number', 'numeric', '0.0', '1.0'],
        'Should suggest valid temperature format'
      );

      context.cleanup();
    }
  );

  // Test: Multiple conflicting commands
  framework.registerTest(
    'validation',
    'Multiple conflicting commands',
    async context => {
      // Setup minimal config for commands that need it
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: { apiKey: 'test-key' },
        },
        presets: {
          work: { style: 'detailed' },
        },
      });

      // Execute: gitty --set-key --add-repo -P work --provider openai
      const result = await context.executeGitty(
        ['--set-key', '--add-repo', '-P', 'work', '--provider', 'openai'],
        {
          stdin: false, // Fails immediately, no interaction needed
        }
      );

      // Validate: Should fail due to multiple commands
      context.assert.commandFailed(result, 'Should reject multiple commands');
      context.assert.outputContains(
        result,
        'multiple commands',
        'Should mention command conflict in error message'
      );
      // Should mention the conflicting commands
      context.assert.containsOneOf(
        result.stderr + result.stdout,
        ['set-key', 'add-repo'],
        'Should mention the conflicting command names'
      );

      context.cleanup();
    }
  );

  // Test: Help command works
  framework.registerTest(
    'validation',
    'Help command functionality',
    async context => {
      // Execute: gitty --help (no stdin needed for help)
      const result = await context.executeGitty(['--help'], {
        stdin: false, // Disable stdin for help command
      });

      // Validate: Should succeed and show help
      context.assert.commandSucceeded(result, 'Help should work');
      context.assert.outputContains(
        result,
        'Usage:',
        'Should show usage information'
      );
      context.assert.outputContains(result, '🐥', 'Should show Gitty branding');
      // Should show main command sections
      context.assert.containsOneOf(
        result.stdout,
        ['Options:', 'Commands:', 'Examples:'],
        'Should show help sections'
      );

      context.cleanup();
    }
  );

  // Test: Version command works
  framework.registerTest(
    'validation',
    'Version command functionality',
    async context => {
      // Execute: gitty --version (no stdin needed for version)
      const result = await context.executeGitty(['--version'], {
        stdin: false, // Disable stdin for version command
      });

      // Validate: Should succeed and show version
      context.assert.commandSucceeded(result, 'Version should work');
      // Should show version number (format: x.y.z or similar)
      context.assert.matchesRegex(
        result.stdout,
        /\d+\.\d+\.\d+/,
        'Should show semantic version number'
      );

      context.cleanup();
    }
  );
}
