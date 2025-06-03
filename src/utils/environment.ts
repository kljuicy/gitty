/**
 * Environment detection utilities
 */

/**
 * Detect if we're running in an interactive environment
 * Returns false if:
 * - Not running in a TTY (output is piped/redirected)
 * - NODE_ENV is set to 'test'
 * - CI environment is detected
 */
export function isInteractiveEnvironment(): boolean {
  // Check if stdout is a TTY (not piped/redirected)
  if (!process.stdout.isTTY) {
    return false;
  }

  // Check if we're in test environment
  if (process.env['NODE_ENV'] === 'test') {
    return false;
  }

  // Check for common CI environment variables
  const ciEnvVars = [
    'CI',
    'CONTINUOUS_INTEGRATION',
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'JENKINS_URL',
    'BUILDKITE',
    'CIRCLECI',
    'TRAVIS',
  ];

  if (ciEnvVars.some(envVar => process.env[envVar])) {
    return false;
  }

  return true;
}

/**
 * Detect if we should show progress indicators (spinners, progress bars)
 */
export function shouldShowProgress(): boolean {
  return isInteractiveEnvironment();
}

/**
 * Detect if we should show colorized output
 */
export function shouldShowColors(): boolean {
  // Force colors if explicitly requested
  if (process.env['FORCE_COLOR']) {
    return true;
  }

  // No colors if explicitly disabled
  if (process.env['NO_COLOR'] || process.env['NODE_DISABLE_COLORS']) {
    return false;
  }

  // Default to interactive environment detection
  return isInteractiveEnvironment();
}
