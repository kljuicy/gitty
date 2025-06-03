/* eslint-env node */

/**
 * Config Resolution & Override Logic Test Cases
 *
 * Tests from TESTDEF.md:
 * - Global defaults only
 * - Global presets applied
 * - CLI prepend modes (append/force)
 * - Preset + local config overrides
 * - Environment variable fallbacks
 * - Config hierarchy validation
 */

/**
 * Register config resolution test cases
 */
export function registerConfigResolutionTests(framework) {
  // Test Suite: Basic Config Resolution
  framework.registerSuite('config-resolution');

  // TC-01: Global Default Only
  framework.registerTest(
    'config-resolution',
    'TC-01: Global Default Only',
    async context => {
      // Setup: Basic global config only
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4o-mini',
            temperature: 0.7,
          },
        },
        default: {
          prepend: 'GLOBAL-',
          style: 'concise',
          language: 'en',
        },
      });

      // Execute: gitty with no additional flags
      const result = await context.executeGitty(['--preview']);

      // Validate: Should use global defaults
      context.assert.commandSucceeded(result, 'Command should succeed');
      context.assert.outputContains(
        result,
        'GLOBAL-',
        'Output should contain global default prepend'
      );

      context.cleanup();
    }
  );

  // TC-02: Global Preset Applied
  framework.registerTest(
    'config-resolution',
    'TC-02: Global Preset Applied',
    async context => {
      // Setup: Global config with preset
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4o-mini',
            temperature: 0.7,
          },
        },
        default: {
          prepend: 'GLOBAL-',
          style: 'concise',
          language: 'en',
        },
        presets: {
          work: {
            prepend: 'PRESET-',
            style: 'detailed',
          },
        },
      });

      // Execute: gitty -P work
      const result = await context.executeGitty(['-P', 'work', '--preview']);

      // Validate: Should use preset values
      context.assert.commandSucceeded(result, 'Command should succeed');
      context.assert.outputContains(
        result,
        'PRESET-',
        'Output should contain preset prepend overriding global default'
      );
      context.assert.outputNotContains(
        result,
        'GLOBAL-',
        'Preset should override global default prepend'
      );

      context.cleanup();
    }
  );

  // TC-03: Preset + CLI Prepend (Append Mode)
  framework.registerTest(
    'config-resolution',
    'TC-03: Preset + CLI Prepend (Append Mode)',
    async context => {
      // Setup: Preset with prepend
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4o-mini',
            temperature: 0.7,
          },
        },
        default: {
          prepend: '',
          style: 'concise',
          language: 'en',
        },
        presets: {
          work: {
            prepend: 'PROJ-',
            style: 'detailed',
          },
        },
      });

      // Execute: gitty -P work -p "123"
      const result = await context.executeGitty([
        '-P',
        'work',
        '-p',
        '123',
        '--preview',
      ]);

      // Validate: Should be PROJ-123 (append mode)
      context.assert.isTrue(result.success, 'Command should succeed');
      // Check that the output contains the expected combined prepend
      context.assert.contains(
        result.stdout,
        'PROJ-123',
        'Output should contain combined prepend PROJ-123 in append mode'
      );

      context.cleanup();
    }
  );

  // TC-04: Preset + CLI Prepend (Force Mode)
  framework.registerTest(
    'config-resolution',
    'TC-04: Preset + CLI Prepend (Force Mode)',
    async context => {
      // Setup: Preset with prepend
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4o-mini',
            temperature: 0.7,
          },
        },
        default: {
          prepend: '',
          style: 'concise',
          language: 'en',
        },
        presets: {
          work: {
            prepend: 'PROJ-',
            style: 'detailed',
          },
        },
      });

      // Execute: gitty -P work -p "HOTFIX-" -f
      const result = await context.executeGitty([
        '-P',
        'work',
        '-p',
        'HOTFIX-',
        '-f',
        '--preview',
      ]);

      // Validate: Should be exactly HOTFIX- (force mode)
      context.assert.isTrue(
        result.success,
        'Command should succeed with force prepend'
      );
      // Check that force mode replaces the preset prepend entirely
      context.assert.contains(
        result.stdout,
        'HOTFIX-',
        'Output should contain force prepend HOTFIX- replacing preset'
      );
      // Should NOT contain the original preset prepend
      context.assert.notContains(
        result.stdout,
        'PROJ-HOTFIX-',
        'Force mode should not append to preset prepend'
      );

      context.cleanup();
    }
  );

  // TC-05: Preset + Local Config Override
  framework.registerTest(
    'config-resolution',
    'TC-05: Preset + Local Config Override',
    async context => {
      // Setup: Global preset and local config
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4o-mini',
            temperature: 0.7,
          },
        },
        default: {
          prepend: '',
          style: 'concise',
          language: 'en',
        },
        presets: {
          work: {
            prepend: 'WORK-',
            style: 'detailed',
            language: 'en',
          },
        },
      });

      // Local config overrides style
      context.createLocalConfig({
        preset: 'work',
        style: 'funny',
      });

      // Execute: gitty (uses local config which references preset)
      const result = await context.executeGitty(['--preview']);

      // Validate: Should use preset prepend but local style
      context.assert.isTrue(result.success, 'Command should succeed');
      // The command should execute successfully with combined config

      context.cleanup();
    }
  );

  // TC-06: Local Config Without Preset
  framework.registerTest(
    'config-resolution',
    'TC-06: Local Config Without Preset',
    async context => {
      // Setup: Global config and standalone local config
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4o-mini',
            temperature: 0.7,
          },
        },
        default: {
          prepend: '',
          style: 'concise',
          language: 'en',
        },
      });

      // Local config with no preset reference
      context.createLocalConfig({
        prepend: 'LOCAL-',
        style: 'detailed',
        defaultProvider: 'openai',
      });

      // Execute: gitty
      const result = await context.executeGitty(['--preview']);

      // Validate: Should use local config values
      context.assert.isTrue(result.success, 'Command should succeed');
      // Check that local config prepend is used
      context.assert.contains(
        result.stdout,
        'LOCAL-',
        'Output should contain local config prepend'
      );

      context.cleanup();
    }
  );

  // TC-07: CLI Prepend Overrides Local Config
  framework.registerTest(
    'config-resolution',
    'TC-07: CLI Prepend Overrides Local Config',
    async context => {
      // Setup: Local config with prepend
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4o-mini',
            temperature: 0.7,
          },
        },
        default: {
          prepend: '',
          style: 'concise',
          language: 'en',
        },
      });

      context.createLocalConfig({
        prepend: 'WORK-',
        style: 'detailed',
      });

      // Execute: gitty -p "OVERRIDE"
      const result = await context.executeGitty([
        '-p',
        'OVERRIDE',
        '--preview',
      ]);

      // Validate: Should append CLI prepend to local (WORK-OVERRIDE)
      context.assert.isTrue(result.success, 'Command should succeed');
      // Check that CLI prepend is appended to local config prepend
      context.assert.contains(
        result.stdout,
        'WORK-OVERRIDE',
        'CLI prepend should append to local config prepend (WORK-OVERRIDE)'
      );

      context.cleanup();
    }
  );

  // TC-08: CLI Force Prepend Bypasses All
  framework.registerTest(
    'config-resolution',
    'TC-08: CLI Force Prepend Bypasses All',
    async context => {
      // Setup: Any config present
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4o-mini',
            temperature: 0.7,
          },
        },
        default: {
          prepend: 'GLOBAL-',
          style: 'concise',
          language: 'en',
        },
        presets: {
          work: {
            prepend: 'PRESET-',
            style: 'detailed',
          },
        },
      });

      context.createLocalConfig({
        prepend: 'LOCAL-',
        style: 'funny',
      });

      // Execute: gitty -p "X-" -f
      const result = await context.executeGitty([
        '-p',
        'FORCE-',
        '-f',
        '--preview',
      ]);

      // Validate: Should be exactly FORCE- (bypasses all configs)
      context.assert.isTrue(
        result.success,
        'Command should succeed with force override'
      );
      // Check that force mode uses only CLI prepend
      context.assert.contains(
        result.stdout,
        'FORCE-',
        'Output should contain only force prepend'
      );
      // Should not contain any config prepends
      context.assert.notContains(
        result.stdout,
        'LOCAL-FORCE-',
        'Force mode should not append to local config'
      );
      context.assert.notContains(
        result.stdout,
        'GLOBAL-',
        'Force mode should bypass global config'
      );

      context.cleanup();
    }
  );

  // TC-09: Environment Variable API Key Fallback
  framework.registerTest(
    'config-resolution',
    'TC-09: Environment Variable API Key Fallback',
    async context => {
      // Setup: Minimal config without API key, rely on env var
      context.createGlobalConfig({
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: '', // No API key in config
            model: 'gpt-4o-mini',
            temperature: 0.7,
          },
        },
        default: {
          prepend: 'ENV-TEST-',
          style: 'concise',
          language: 'en',
        },
      });

      // Execute: gitty with env var
      const result = await context.executeGitty(['--preview'], {
        env: {
          OPENAI_API_KEY: 'env-test-key',
        },
      });

      // Validate: Should use env var API key and config prepend
      context.assert.isTrue(
        result.success,
        'Command should succeed with env API key'
      );
      // Check that config is still applied even with env API key
      context.assert.contains(
        result.stdout,
        'ENV-TEST-',
        'Should use config prepend with env var API key'
      );

      context.cleanup();
    }
  );

  // TC-10: Missing Configs Fallback
  framework.registerTest(
    'config-resolution',
    'TC-10: Missing Configs Fallback',
    async context => {
      // Setup: No global or local config, no env var

      // Execute: gitty with explicitly cleared environment
      const result = await context.executeGitty(['--preview'], {
        env: {
          // Explicitly unset API keys
          OPENAI_API_KEY: undefined,
          GEMINI_API_KEY: undefined,
          GOOGLE_API_KEY: undefined,
        },
      });

      // Validate: Should fail gracefully with helpful error
      context.assert.commandFailed(
        result,
        'Command should fail without API key'
      );
      context.assert.outputContains(
        result,
        'API key',
        'Should mention missing API key in error message'
      );

      context.cleanup();
    },
    { mock: false } // Disable mocking for this test
  );
}
