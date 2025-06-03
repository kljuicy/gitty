#!/usr/bin/env node

/* eslint-env node */
/* global process, console */

/**
 * Main Integration Test Runner for Gitty
 *
 * This script:
 * 1. Imports the test framework
 * 2. Registers all test suites and cases
 * 3. Runs the complete test suite
 * 4. Reports results
 *
 * Usage:
 *   node integration-tests/run-tests.js
 *   npm run test:integration
 */

import { GittyTestFramework } from './framework/test-runner.js';
import { registerConfigResolutionTests } from './test-cases/config-resolution.js';
import { registerValidationTests } from './test-cases/validation.js';
import { registerEdgeCasesTests } from './test-cases/edge-cases.js';

/**
 * Main test execution function
 */
async function runIntegrationTests() {
  console.log('🐥 Gitty Integration Tests');
  console.log('==========================\n');

  // Create test framework instance
  const framework = new GittyTestFramework();

  try {
    // Register all test suites
    console.log('📚 Registering test suites...');

    registerConfigResolutionTests(framework);
    registerValidationTests(framework);
    registerEdgeCasesTests(framework);

    console.log('✅ Test suites registered\n');

    // Run all tests
    const success = await framework.runAllTests();

    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Critical test framework error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test run interrupted by user');
  process.exit(130); // Standard exit code for SIGINT
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test run terminated');
  process.exit(143); // Standard exit code for SIGTERM
});

// Unhandled error protection
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests();
}
