# Gitty Integration Test Framework

A comprehensive, modular, and extensible integration test framework for Gitty that simulates real user behavior while providing safe, isolated testing environments.

## 🎯 Features

- **True Integration Testing**: Tests the actual `gitty` CLI binary as users would use it
- **Console Output Validation**: Validates actual command output, not just success/failure
- **Clean Isolation**: Each test runs in its own temporary Git repository with isolated configs
- **Modular Architecture**: Easy to add new test suites and cases
- **Safe Execution**: Automatic backup and restoration of existing configs with emergency handlers
- **Comprehensive Coverage**: Tests all aspects from TESTDEF.md requirements
- **Enhanced Assertions**: Rich assertion library for output validation and behavior verification
- **Future-Proof**: Extensible design for adding new functionality tests

## 🏗️ Architecture

```
integration-tests/
├── framework/
│   └── test-runner.js          # Core test framework
├── test-cases/
│   ├── config-resolution.js    # Config hierarchy tests (TC-01 to TC-10)
│   └── validation.js          # CLI validation tests
├── run-tests.js               # Main test runner
├── TESTDEF.md                 # Test definitions and requirements
└── README.md                  # This file
```

### Framework Components

#### `GittyTestFramework`

- **Test Suite Management**: Register and organize test suites
- **Environment Setup**: Automatic Gitty installation and temp directory creation
- **Config Safety**: Backup/restore existing user configs
- **Execution Control**: Run tests with timeouts and error handling
- **Result Reporting**: Comprehensive pass/fail reporting with details

#### `TestContext`

- **Test Utilities**: Config creation, CLI execution, assertions
- **Isolation**: Each test gets a clean Git repository and environment
- **Mocking**: Automatic API key injection for testing without real API calls
- **Cleanup**: Automatic cleanup of test artifacts

## 🚀 Usage

### Running Tests

```bash
# Run all integration tests
npm run test:integration

# Or run directly
node integration-tests/run-tests.js

# Run unit tests and integration tests
npm run test:all
```

### Test Output

```
🐥 Gitty Integration Tests
==========================

🔧 Setting up test environment...
✅ Created temp directory: /tmp/gitty-integration-test-1703123456789
📦 Backed up existing global config
📦 Installing Gitty globally for testing...
✅ Gitty installed globally

📚 Registering test suites...
✅ Test suites registered

🚀 Starting Gitty Integration Tests
=====================================

📁 Test Suite: config-resolution
──────────────────────────────────────────────────
🧪 Running: config-resolution > TC-01: Global Default Only
✅ PASS: TC-01: Global Default Only (1234ms)

🧪 Running: config-resolution > TC-02: Global Preset Applied
✅ PASS: TC-02: Global Preset Applied (987ms)

...

📊 Test Results Summary
========================
✅ Passed: 18
❌ Failed: 0
⏭️ Skipped: 0

🎉 All tests passed!
```

## 📝 Test Cases

### Config Resolution Tests (TESTDEF.md)

| Test ID | Description                   | Validation                                |
| ------- | ----------------------------- | ----------------------------------------- |
| TC-01   | Global Default Only           | Uses global defaults when no other config |
| TC-02   | Global Preset Applied         | Applies preset when specified with `-P`   |
| TC-03   | Preset + CLI Prepend (Append) | Appends CLI prepend to preset prepend     |
| TC-04   | Preset + CLI Prepend (Force)  | Force mode replaces entire prepend        |
| TC-05   | Preset + Local Override       | Local config overrides preset values      |
| TC-06   | Local Config Without Preset   | Standalone local config works             |
| TC-07   | CLI Prepend Override          | CLI prepend appends to local config       |
| TC-08   | CLI Force Override            | Force mode bypasses all config layers     |
| TC-09   | Environment Variable Fallback | Uses env vars when no config API key      |
| TC-10   | Missing Config Fallback       | Graceful failure with helpful errors      |

### Validation Tests

- Force prepend validation (requires `--prepend`)
- Add repo validation (requires `--preset`)
- Invalid provider/style/language rejection
- Multiple conflicting commands detection
- Help and version command functionality

## 🔧 Adding New Tests

### 1. Create a New Test Suite

```javascript
// test-cases/my-new-suite.js
export function registerMyNewTests(framework) {
  framework.registerSuite('my-suite');

  framework.registerTest('my-suite', 'My test case', async context => {
    // Test implementation
    const result = await context.executeGitty(['--help']);
    context.assert.isTrue(result.success);
    context.cleanup();
  });
}
```

### 2. Register in Main Runner

```javascript
// run-tests.js
import { registerMyNewTests } from './test-cases/my-new-suite.js';

// In runIntegrationTests()
registerMyNewTests(framework);
```

### 3. Test Context API

```javascript
async context => {
  // Create configs
  context.createGlobalConfig({
    /* config object */
  });
  context.createLocalConfig({
    /* config object */
  });

  // Execute gitty
  const result = await context.executeGitty(['--preview'], {
    env: { CUSTOM_VAR: 'value' },
  });

  // Enhanced assertions for output validation
  context.assert.commandSucceeded(result, 'Command should succeed');
  context.assert.outputContains(
    result,
    'expected text',
    'Should show expected text'
  );
  context.assert.outputNotContains(
    result,
    'unexpected',
    'Should not show unexpected text'
  );
  context.assert.matchesRegex(result.stdout, /pattern/, 'Should match pattern');
  context.assert.containsOneOf(
    result.stdout,
    ['option1', 'option2'],
    'Should show one of the options'
  );

  // Basic assertions (still available)
  context.assert.isTrue(result.success);
  context.assert.contains(result.stdout, 'expected text');
  context.assert.equals(result.code, 0);

  // Cleanup (important!)
  context.cleanup();
};
```

### 4. Enhanced Assertion Methods

Our framework provides comprehensive assertion methods for validating CLI behavior:

#### Command Result Assertions

- `commandSucceeded(result, message)` - Validates command succeeded with exit code 0
- `commandFailed(result, message)` - Validates command failed with helpful error info

#### Output Validation Assertions

- `outputContains(result, substring, message)` - Checks both stdout and stderr
- `outputNotContains(result, substring, message)` - Ensures text is not present
- `matchesRegex(text, regex, message)` - Pattern matching validation
- `containsOneOf(text, substrings, message)` - Checks for any of multiple options

#### Traditional Assertions

- `equals(actual, expected, message)` - Exact value comparison
- `contains(text, substring, message)` - Simple substring check
- `notContains(text, substring, message)` - Negative substring check
- `isTrue(value, message)` / `isFalse(value, message)` - Boolean validation

These enhanced assertions provide detailed error messages showing actual vs expected output when tests fail.

## 🛡️ Safety Features

### Config Protection

- **Automatic backup** of existing `~/.gitty/config.json` before tests start
- **Safe restoration** on test completion or interruption
- **Isolated environment**: Tests use fake home directories to prevent config overwrites
- **Multiple signal handlers** for guaranteed restoration on interruption (SIGINT, SIGTERM, SIGHUP)
- **Emergency restoration** on uncaught exceptions and unhandled promise rejections

### Environment Isolation

- Each test runs in a unique temporary directory
- Fresh Git repository for every test
- No interference between tests
- Real user configs are **NEVER** touched during test execution

### Error Handling

- Graceful handling of Ctrl+C interruption
- Automatic cleanup on failures
- Preservation of user configs even on crashes
- **Emergency restoration script** for manual recovery

### Emergency Config Restoration

If tests are interrupted and your config is corrupted, use the emergency restoration script:

```bash
# Check your config status and restore if needed
node integration-tests/restore-config.js

# Force restore without prompts
node integration-tests/restore-config.js --force
```

The script will:

- Detect if your config contains test data
- Offer to restore a clean default configuration
- Guide you through reconfiguring your API keys and settings

**The restoration script can detect test data patterns like:**

- API keys: `test-key`, `test-openai-key`, `test-gemini-key`
- Prepends: `GLOBAL-`, `PRESET-`
- Other test-specific configuration markers

## 🧪 Mocking Strategy

### API Key Mocking

- Tests automatically inject fake API keys
- No real API calls during testing
- Env var fallback testing with controlled values

### Command Simulation

- Tests execute actual `gitty` binary
- Real CLI argument parsing and validation
- Authentic user experience simulation

## 📊 Test Configuration

### Test Options

```javascript
framework.registerTest('suite-name', 'test-name', testFunction, {
  timeout: 30000, // Test timeout in ms
  skip: false, // Skip this test
  mock: true, // Enable API key mocking
  // Additional options...
});
```

### Environment Variables

- `TMPDIR`: Override temp directory location
- `OPENAI_API_KEY`: Cleared/set for testing
- `GEMINI_API_KEY`: Cleared/set for testing

## 🚧 Extending the Framework

The framework is designed for easy extension:

1. **New Assertion Types**: Add methods to `TestContext.assert`
2. **Setup/Teardown**: Suite-level setup and cleanup functions
3. **Test Utilities**: Add helper methods to `TestContext`
4. **Reporter Formats**: Customize result output in `GittyTestFramework`
5. **Parallel Execution**: Framework ready for parallel test execution

## 📋 Requirements

- Node.js 22+ (same as Gitty)
- Git available in PATH
- Write access to temp directory
- NPM/PNPM for package management

## 🎉 Benefits

1. **User-Centric**: Tests exactly what users experience
2. **Maintainable**: Modular design easy to update and extend
3. **Reliable**: Isolated environments prevent test interference
4. **Safe**: Protects user configs and data
5. **Comprehensive**: Covers all config resolution scenarios
6. **Future-Ready**: Easy to add new functionality tests

---

> 🐥 **Gitty says:** "These tests make sure I work perfectly for every user, every time!"
