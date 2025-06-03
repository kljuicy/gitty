#!/usr/bin/env node

/* eslint-env node */
/* global process, console, setTimeout, clearTimeout */

import { execSync, spawn } from 'child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Modular Integration Test Framework for Gitty
 *
 * Features:
 * - Clean test isolation (temporary directories and configs)
 * - Parallel test execution
 * - Extensible test case registration
 * - Real CLI simulation
 * - Config management and mocking
 * - Comprehensive result reporting
 * - GUARANTEED config restoration on interruption
 */
class GittyTestFramework {
  constructor() {
    this.tests = new Map();
    this.testSuites = new Map();
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };
    this.tempDir = null;
    this.originalCwd = process.cwd();
    this.globalConfigBackup = null;
    this.installAttempted = false;
    this.emergencyRestoreNeeded = false;
    this.signalHandlersSetup = false;

    // Setup emergency restoration immediately
    this.setupEmergencyRestoration();
  }

  /**
   * Setup emergency signal handlers for guaranteed config restoration
   */
  setupEmergencyRestoration() {
    if (this.signalHandlersSetup) return;
    this.signalHandlersSetup = true;

    const emergencyRestore = async signal => {
      console.log(
        chalk.red(`\n🚨 ${signal} received! Emergency config restoration...`)
      );

      if (this.emergencyRestoreNeeded && this.globalConfigBackup) {
        try {
          await this.forceRestoreConfigs();
          console.log(chalk.green('✅ Emergency restoration completed!'));
        } catch (error) {
          console.error(
            chalk.red(`❌ Emergency restoration failed: ${error.message}`)
          );
          console.error(chalk.yellow(`⚠️  Manual restoration may be needed!`));
          console.error(
            chalk.yellow(
              `Your backup should be available in the test framework.`
            )
          );
        }
      }

      // Clean up temp directory if it exists
      if (this.tempDir && existsSync(this.tempDir)) {
        try {
          rmSync(this.tempDir, { recursive: true, force: true });
          console.log(chalk.green('✅ Cleaned up temp directory'));
        } catch (error) {
          console.warn(
            chalk.yellow(`⚠️ Could not clean temp directory: ${error.message}`)
          );
        }
      }

      process.exit(signal === 'SIGINT' ? 130 : 143);
    };

    // Only handle SIGTERM and SIGHUP - let the main runner handle SIGINT
    process.on('SIGTERM', () => emergencyRestore('SIGTERM'));
    process.on('SIGHUP', () => emergencyRestore('SIGHUP'));

    // Final safety net on process exit
    process.on('exit', () => {
      if (this.emergencyRestoreNeeded && this.globalConfigBackup) {
        console.log(chalk.yellow('🔄 Final safety restoration check...'));
        try {
          // Synchronous restore on exit
          const homeDir = process.env.HOME || process.env.USERPROFILE;
          const configDir = join(homeDir, '.gitty');
          const globalConfigPath = join(configDir, 'config.json');
          mkdirSync(configDir, { recursive: true });
          writeFileSync(globalConfigPath, this.globalConfigBackup);
          console.log(chalk.green('✅ Final restoration completed'));
        } catch (error) {
          console.error(
            chalk.red(`❌ Final restoration failed: ${error.message}`)
          );
        }
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async error => {
      console.error(chalk.red('💥 Uncaught Exception:'), error);
      await emergencyRestore('EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error(
        chalk.red('💥 Unhandled Rejection at:'),
        promise,
        'reason:',
        reason
      );
      await emergencyRestore('REJECTION');
    });

    console.log(chalk.blue('🛡️  Emergency restoration handlers activated'));
  }

  /**
   * Force restore configs (can be called in emergency situations)
   */
  async forceRestoreConfigs() {
    if (!this.globalConfigBackup) {
      console.log(chalk.yellow('ℹ️  No backup to restore'));
      return;
    }

    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const configDir = join(homeDir, '.gitty');
      const globalConfigPath = join(configDir, 'config.json');

      mkdirSync(configDir, { recursive: true });
      writeFileSync(globalConfigPath, this.globalConfigBackup);

      this.emergencyRestoreNeeded = false;
      console.log(chalk.green('✅ Force restored original global config'));
    } catch (error) {
      console.error(chalk.red(`❌ Force restore failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Generate a unique test ID
   */
  generateTestId(name) {
    return createHash('md5').update(name).digest('hex').substring(0, 8);
  }

  /**
   * Setup temporary test environment
   */
  async setupTestEnvironment() {
    console.log(chalk.blue('🔧 Setting up test environment...'));
    console.log(
      chalk.yellow('🛡️  SAFETY: Tests will run in ISOLATED environment')
    );
    console.log(chalk.yellow('🛡️  Your real configs will NOT be touched!'));

    // Create unique temp directory
    const tempBase = process.env.TMPDIR || '/tmp';
    const timestamp = Date.now();
    this.tempDir = join(tempBase, `gitty-integration-test-${timestamp}`);

    try {
      mkdirSync(this.tempDir, { recursive: true });
      console.log(chalk.green(`✅ Created temp directory: ${this.tempDir}`));

      // Backup original configs FIRST (extra safety measure)
      await this.backupConfigs();

      // Try to install gitty globally for testing
      await this.ensureGittyInstalled();
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to setup test environment: ${error.message}`)
      );
      // Attempt emergency restoration before throwing
      if (this.emergencyRestoreNeeded) {
        await this.forceRestoreConfigs();
      }
      throw error;
    }
  }

  /**
   * Backup existing configs safely (extra safety measure)
   */
  async backupConfigs() {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const globalConfigPath = join(homeDir, '.gitty', 'config.json');

    if (existsSync(globalConfigPath)) {
      try {
        this.globalConfigBackup = readFileSync(globalConfigPath, 'utf8');
        this.emergencyRestoreNeeded = true; // Flag that restoration is needed
        console.log(
          chalk.yellow('📦 Backed up existing global config (safety measure)')
        );
        console.log(chalk.blue('🛡️  Emergency restoration activated'));
      } catch (error) {
        console.warn(
          chalk.yellow(`⚠️ Could not backup global config: ${error.message}`)
        );
      }
    } else {
      console.log(chalk.green('ℹ️  No existing global config found'));
    }
  }

  /**
   * Ensure Gitty is installed globally for testing
   */
  async ensureGittyInstalled() {
    if (this.installAttempted) return;
    this.installAttempted = true;

    try {
      // Check if gitty is already available
      execSync('gitty --version', { stdio: 'pipe' });
      console.log(chalk.green('✅ Gitty already installed globally'));
      return;
    } catch {
      // Need to install
    }

    console.log(chalk.blue('📦 Installing Gitty globally for testing...'));

    try {
      // Go to project root and install
      const projectRoot = join(__dirname, '../../');
      process.chdir(projectRoot);

      // Build first
      execSync('npm run build', { stdio: 'pipe' });

      // Install globally
      execSync('npm install -g .', { stdio: 'pipe' });

      console.log(chalk.green('✅ Gitty installed globally'));

      // Verify installation
      execSync('gitty --version', { stdio: 'pipe' });
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to install Gitty globally: ${error.message}`)
      );
      throw error;
    } finally {
      process.chdir(this.originalCwd);
    }
  }

  /**
   * Create isolated test environment for a specific test
   */
  async createTestRepo(testId) {
    const testDir = join(this.tempDir, `test-${testId}`);
    mkdirSync(testDir, { recursive: true });

    // Initialize git repo
    process.chdir(testDir);
    execSync('git init', { stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
    execSync('git config user.name "Test User"', { stdio: 'pipe' });

    // Create a dummy file and commit to have something to diff
    writeFileSync(
      'test-file.js',
      '// Test file for gitty integration tests\nconsole.log("hello");'
    );
    execSync('git add test-file.js', { stdio: 'pipe' });
    execSync('git commit -m "Initial test commit"', { stdio: 'pipe' });

    // Make a change for next commit
    writeFileSync(
      'test-file.js',
      '// Test file for gitty integration tests\nconsole.log("hello world");'
    );
    execSync('git add test-file.js', { stdio: 'pipe' });

    return testDir;
  }

  /**
   * Clean up test environment
   */
  async cleanupTestEnvironment() {
    console.log(chalk.blue('🧹 Cleaning up test environment...'));

    try {
      // Restore original configs
      await this.restoreConfigs();

      // Clean up temp directory
      if (this.tempDir && existsSync(this.tempDir)) {
        rmSync(this.tempDir, { recursive: true, force: true });
        console.log(chalk.green('✅ Cleaned up temp directory'));
      }

      // Return to original directory
      process.chdir(this.originalCwd);
    } catch (error) {
      console.error(chalk.red(`⚠️ Cleanup error: ${error.message}`));
      // Attempt emergency restoration on cleanup error
      if (this.emergencyRestoreNeeded) {
        await this.forceRestoreConfigs();
      }
    }
  }

  /**
   * Restore backed up configs
   */
  async restoreConfigs() {
    if (!this.globalConfigBackup) {
      console.log(chalk.green('ℹ️  No backup to restore'));
      return;
    }

    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const configDir = join(homeDir, '.gitty');
      const globalConfigPath = join(configDir, 'config.json');

      mkdirSync(configDir, { recursive: true });
      writeFileSync(globalConfigPath, this.globalConfigBackup);

      this.emergencyRestoreNeeded = false; // Clear the emergency flag
      console.log(chalk.green('✅ Restored original global config'));
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️ Could not restore global config: ${error.message}`)
      );
      // Keep emergency flag active if restoration failed
      throw error;
    }
  }

  /**
   * Register a test suite
   */
  registerSuite(name, setupFn, cleanupFn) {
    this.testSuites.set(name, {
      name,
      setupFn: setupFn || (() => {}),
      cleanupFn: cleanupFn || (() => {}),
      tests: [],
    });
    return this;
  }

  /**
   * Register a test case
   */
  registerTest(suiteName, testName, testFn, options = {}) {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(
        `Test suite '${suiteName}' not found. Register the suite first.`
      );
    }

    const testId = this.generateTestId(`${suiteName}-${testName}`);
    const test = {
      id: testId,
      name: testName,
      suiteName,
      fn: testFn,
      options: {
        timeout: options.timeout || 30000,
        skip: options.skip || false,
        mock: options.mock !== false, // Default to true
        ...options,
      },
    };

    suite.tests.push(test);
    this.tests.set(testId, test);
    return this;
  }

  /**
   * Execute a single test
   */
  async executeTest(test) {
    if (test.options.skip) {
      this.results.skipped++;
      return { status: 'skipped', message: 'Test skipped' };
    }

    const testStartTime = Date.now();
    console.log(chalk.yellow(`🧪 Running: ${test.suiteName} > ${test.name}`));

    try {
      // Create isolated test environment
      const testDir = await this.createTestRepo(test.id);

      // Create test context
      const context = new TestContext(testDir, test.options);

      // Execute test with timeout
      const result = await Promise.race([
        test.fn(context),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Test timeout')),
            test.options.timeout
          )
        ),
      ]);

      const duration = Date.now() - testStartTime;
      console.log(chalk.green(`✅ PASS: ${test.name} (${duration}ms)`));
      this.results.passed++;

      return { status: 'passed', result, duration };
    } catch (error) {
      const duration = Date.now() - testStartTime;
      console.log(chalk.red(`❌ FAIL: ${test.name} (${duration}ms)`));
      console.log(chalk.red(`   Error: ${error.message}`));

      this.results.failed++;
      this.results.errors.push({
        test: `${test.suiteName} > ${test.name}`,
        error: error.message,
        stack: error.stack,
      });

      return { status: 'failed', error: error.message, duration };
    }
  }

  /**
   * Run all tests with guaranteed config safety
   */
  async runAllTests() {
    console.log(chalk.blue.bold('🚀 Starting Gitty Integration Tests'));
    console.log(chalk.blue('=====================================\n'));

    try {
      await this.setupTestEnvironment();

      for (const [suiteName, suite] of this.testSuites) {
        console.log(chalk.cyan.bold(`\n📁 Test Suite: ${suiteName}`));
        console.log(chalk.cyan('─'.repeat(50)));

        // Run suite setup
        try {
          await suite.setupFn();
        } catch (error) {
          console.error(chalk.red(`❌ Suite setup failed: ${error.message}`));
          continue;
        }

        // Run tests in suite
        for (const test of suite.tests) {
          await this.executeTest(test);
        }

        // Run suite cleanup
        try {
          await suite.cleanupFn();
        } catch (error) {
          console.warn(
            chalk.yellow(`⚠️ Suite cleanup warning: ${error.message}`)
          );
        }
      }
    } catch (error) {
      console.error(chalk.red(`💥 Critical test error: ${error.message}`));
      throw error;
    } finally {
      // ALWAYS attempt cleanup and restoration
      await this.cleanupTestEnvironment();
    }

    this.printResults();
    return this.results.failed === 0;
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log(chalk.blue.bold('\n📊 Test Results Summary'));
    console.log(chalk.blue('========================'));
    console.log(chalk.green(`✅ Passed: ${this.results.passed}`));
    console.log(chalk.red(`❌ Failed: ${this.results.failed}`));
    console.log(chalk.yellow(`⏭️ Skipped: ${this.results.skipped}`));

    if (this.results.errors.length > 0) {
      console.log(chalk.red('\n🔍 Failure Details:'));
      this.results.errors.forEach((error, index) => {
        console.log(chalk.red(`${index + 1}. ${error.test}`));
        console.log(chalk.red(`   ${error.error}`));
      });
    }

    const success = this.results.failed === 0;
    console.log(
      chalk[success ? 'green' : 'red'].bold(
        `\n${success ? '🎉 All tests passed!' : '💥 Some tests failed!'}`
      )
    );
  }
}

/**
 * Test Context - provides utilities for individual tests
 */
class TestContext {
  constructor(testDir, options) {
    this.testDir = testDir;
    this.options = options;
    this.homeDir = join(testDir, 'fake-home');
    this.realHomeDir = process.env.HOME || process.env.USERPROFILE;
  }

  /**
   * Create a global config file in ISOLATED fake home directory
   */
  createGlobalConfig(config) {
    const configDir = join(this.homeDir, '.gitty');
    mkdirSync(configDir, { recursive: true });
    const configPath = join(configDir, 'config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    return configPath;
  }

  /**
   * Create a local repo config file
   */
  createLocalConfig(config) {
    const gitDir = join(this.testDir, '.git');
    mkdirSync(gitDir, { recursive: true });
    const configPath = join(gitDir, 'gittyrc.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    return configPath;
  }

  /**
   * Execute gitty command with mocking and ISOLATED HOME directory
   */
  async executeGitty(args = [], options = {}) {
    const env = {
      ...process.env,
      HOME: this.homeDir,
      USERPROFILE: this.homeDir,
    };

    // Add custom env vars, filtering out undefined values
    if (options.env) {
      Object.keys(options.env).forEach(key => {
        if (options.env[key] === undefined) {
          delete env[key];
        } else {
          env[key] = options.env[key];
        }
      });
    }

    // Add fake API keys if mocking is enabled
    if (this.options.mock) {
      env.OPENAI_API_KEY = env.OPENAI_API_KEY || 'test-openai-key';
      env.GEMINI_API_KEY = env.GEMINI_API_KEY || 'test-gemini-key';
    }

    return new Promise((resolve, reject) => {
      const gittyProcess = spawn('gitty', args, {
        cwd: options.cwd || this.testDir,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      gittyProcess.stdout.on('data', data => {
        stdout += data.toString();
      });

      gittyProcess.stderr.on('data', data => {
        stderr += data.toString();
      });

      // Auto-answer interactive prompts with customizable stdin
      if (options.stdin === false) {
        // Don't send any stdin input - for commands like --help, --version
        // that don't need interaction and exit immediately
      } else if (options.stdin) {
        // Use custom stdin sequence with proper timing
        const inputs = options.stdin.split('');
        let inputIndex = 0;

        const sendNextInput = () => {
          if (inputIndex < inputs.length) {
            try {
              gittyProcess.stdin.write(inputs[inputIndex]);
              inputIndex++;
              // Add small delay between characters to prevent timing issues
              setTimeout(sendNextInput, 50);
            } catch (error) {
              // Ignore EPIPE errors - process may have exited
              if (error.code !== 'EPIPE') {
                console.warn('Stdin write error:', error.message);
              }
            }
          } else {
            // Wait a bit before ending stdin
            setTimeout(() => {
              try {
                gittyProcess.stdin.end();
              } catch (error) {
                // Ignore EPIPE errors - process may have exited
                if (error.code !== 'EPIPE') {
                  console.warn('Stdin end error:', error.message);
                }
              }
            }, 100);
          }
        };

        // Start sending inputs after a small delay
        setTimeout(sendNextInput, 100);
      } else {
        // Check if this is a command that likely needs stdin (interactive commands)
        const needsStdin = !args.some(
          arg =>
            arg === '--help' ||
            arg === '--version' ||
            arg === '-h' ||
            arg === '-v' ||
            arg === '--force-prepend' // These commands typically fail quickly without stdin
        );

        if (needsStdin) {
          // Track all timeouts to clear them if process exits early
          const timeouts = [];

          // Default auto-answer sequence with delays and error handling
          const safeWrite = (data, delay) => {
            const timeoutId = setTimeout(() => {
              try {
                // Check multiple conditions before writing
                if (
                  !gittyProcess.stdin.destroyed &&
                  !gittyProcess.stdin.writableEnded &&
                  !gittyProcess.killed &&
                  gittyProcess.stdin.writable
                ) {
                  gittyProcess.stdin.write(data);
                }
              } catch (error) {
                // Ignore EPIPE errors - process may have exited
                if (error.code !== 'EPIPE') {
                  console.warn('Stdin write error:', error.message);
                }
              }
            }, delay);
            timeouts.push(timeoutId);
            return timeoutId;
          };

          // Track if process has exited to avoid further writes
          let processExited = false;
          gittyProcess.on('exit', () => {
            processExited = true;
            // Clear all pending timeouts when process exits
            timeouts.forEach(timeoutId => clearTimeout(timeoutId));
          });

          const safeWriteWithExitCheck = (data, delay) => {
            const timeoutId = setTimeout(() => {
              if (!processExited) {
                safeWrite(data, 0);
              }
            }, delay);
            timeouts.push(timeoutId);
            return timeoutId;
          };

          safeWriteWithExitCheck('y\n', 100); // Answer "yes" to first prompt
          safeWriteWithExitCheck('\n', 200); // Press enter for any additional prompts
          safeWriteWithExitCheck('0\n', 300); // Select first option if menu appears
          safeWriteWithExitCheck('n\n', 400); // Answer "no" to final commit confirmation

          const endTimeoutId = setTimeout(() => {
            if (!processExited) {
              try {
                if (
                  !gittyProcess.stdin.destroyed &&
                  !gittyProcess.stdin.writableEnded
                ) {
                  gittyProcess.stdin.end();
                }
              } catch (error) {
                // Ignore EPIPE errors - process may have exited
                if (error.code !== 'EPIPE') {
                  console.warn('Stdin end error:', error.message);
                }
              }
            }
          }, 500);
          timeouts.push(endTimeoutId);
        }
      }

      gittyProcess.on('close', code => {
        resolve({
          code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: code === 0,
        });
      });

      gittyProcess.on('error', error => {
        reject(error);
      });

      // Handle timeout
      const timeout = setTimeout(() => {
        gittyProcess.kill('SIGTERM');
        reject(new Error('Command timeout'));
      }, options.timeout || 10000);

      gittyProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Clean up configs created by this test (now safe since using fake home)
   */
  cleanup() {
    try {
      const globalConfigPath = join(this.homeDir, '.gitty', 'config.json');
      if (existsSync(globalConfigPath)) {
        rmSync(globalConfigPath, { force: true });
      }

      const localConfigPath = join(this.testDir, '.git', 'gittyrc.json');
      if (existsSync(localConfigPath)) {
        rmSync(localConfigPath, { force: true });
      }
    } catch (error) {
      console.warn(`Cleanup warning: ${error.message}`);
    }
  }

  /**
   * Assert utilities
   */
  assert = {
    equals: (actual, expected, message) => {
      if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
      }
    },

    contains: (text, substring, message) => {
      if (!text.includes(substring)) {
        throw new Error(
          message || `Expected text to contain "${substring}", got: ${text}`
        );
      }
    },

    notContains: (text, substring, message) => {
      if (text.includes(substring)) {
        throw new Error(
          message || `Expected text to not contain "${substring}", got: ${text}`
        );
      }
    },

    isTrue: (value, message) => {
      if (value !== true) {
        throw new Error(message || `Expected true, got ${value}`);
      }
    },

    isFalse: (value, message) => {
      if (value !== false) {
        throw new Error(message || `Expected false, got ${value}`);
      }
    },

    // New assertion methods for better output validation
    matchesRegex: (text, regex, message) => {
      if (!regex.test(text)) {
        throw new Error(
          message || `Expected text to match regex ${regex}, got: ${text}`
        );
      }
    },

    outputContains: (result, substring, message) => {
      const fullOutput = result.stdout + '\n' + result.stderr;
      if (!fullOutput.includes(substring)) {
        throw new Error(
          message ||
            `Expected output to contain "${substring}".\nStdout: ${result.stdout}\nStderr: ${result.stderr}`
        );
      }
    },

    outputNotContains: (result, substring, message) => {
      const fullOutput = result.stdout + '\n' + result.stderr;
      if (fullOutput.includes(substring)) {
        throw new Error(
          message ||
            `Expected output to not contain "${substring}".\nStdout: ${result.stdout}\nStderr: ${result.stderr}`
        );
      }
    },

    commandSucceeded: (result, message) => {
      if (!result.success || result.code !== 0) {
        throw new Error(
          message ||
            `Expected command to succeed.\nCode: ${result.code}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`
        );
      }
    },

    commandFailed: (result, message) => {
      if (result.success || result.code === 0) {
        throw new Error(
          message ||
            `Expected command to fail.\nCode: ${result.code}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`
        );
      }
    },

    containsOneOf: (text, substrings, message) => {
      const found = substrings.some(substring => text.includes(substring));
      if (!found) {
        throw new Error(
          message ||
            `Expected text to contain one of: ${substrings.join(', ')}, got: ${text}`
        );
      }
    },
  };
}

export { GittyTestFramework, TestContext };
