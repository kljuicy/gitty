import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isInteractiveEnvironment, shouldShowColors } from './environment';

describe('Environment Detection Utilities', () => {
  // Store original values to restore after tests
  let originalStdoutIsTTY: boolean;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Store original values
    originalStdoutIsTTY = process.stdout.isTTY;
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original values
    process.stdout.isTTY = originalStdoutIsTTY;
    process.env = originalEnv;
  });

  describe('isInteractiveEnvironment', () => {
    it('should return false when stdout is not a TTY', () => {
      process.stdout.isTTY = false;
      delete process.env.NODE_ENV;
      delete process.env.CI;

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should return false when NODE_ENV is test', () => {
      process.stdout.isTTY = true;
      process.env.NODE_ENV = 'test';
      delete process.env.CI;

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should return false when CI environment variable is set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      process.env.CI = 'true';

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should return false when CONTINUOUS_INTEGRATION is set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.CONTINUOUS_INTEGRATION = 'true';

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should return false when GITHUB_ACTIONS is set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.GITHUB_ACTIONS = 'true';

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should return false when GITLAB_CI is set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.GITLAB_CI = 'true';

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should return false when JENKINS_URL is set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.JENKINS_URL = 'https://jenkins.example.com';

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should return false when BUILDKITE is set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.BUILDKITE = 'true';

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should return false when CIRCLECI is set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.CIRCLECI = 'true';

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should return false when TRAVIS is set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.TRAVIS = 'true';

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should return true when all conditions for interactive environment are met', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      delete process.env.CONTINUOUS_INTEGRATION;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      delete process.env.JENKINS_URL;
      delete process.env.BUILDKITE;
      delete process.env.CIRCLECI;
      delete process.env.TRAVIS;

      expect(isInteractiveEnvironment()).toBe(true);
    });

    it('should prioritize TTY check over other conditions', () => {
      process.stdout.isTTY = false;
      delete process.env.NODE_ENV; // Not test
      delete process.env.CI; // No CI

      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('should handle multiple CI environment variables set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      process.env.CI = 'true';
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITLAB_CI = 'true';

      expect(isInteractiveEnvironment()).toBe(false);
    });
  });

  describe('shouldShowColors', () => {
    it('should return true when FORCE_COLOR is set', () => {
      process.stdout.isTTY = false; // Even when not interactive
      process.env.NODE_ENV = 'test';
      process.env.CI = 'true';
      process.env.FORCE_COLOR = '1';

      expect(shouldShowColors()).toBe(true);
    });

    it('should return false when NO_COLOR is set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.NO_COLOR = '1';

      expect(shouldShowColors()).toBe(false);
    });

    it('should return false when NODE_DISABLE_COLORS is set', () => {
      process.stdout.isTTY = true;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.NODE_DISABLE_COLORS = '1';

      expect(shouldShowColors()).toBe(false);
    });

    it('should prioritize FORCE_COLOR over NO_COLOR', () => {
      process.stdout.isTTY = false;
      process.env.FORCE_COLOR = '1';
      process.env.NO_COLOR = '1';

      expect(shouldShowColors()).toBe(true);
    });

    it('should prioritize FORCE_COLOR over NODE_DISABLE_COLORS', () => {
      process.stdout.isTTY = false;
      process.env.FORCE_COLOR = '1';
      process.env.NODE_DISABLE_COLORS = '1';

      expect(shouldShowColors()).toBe(true);
    });

    it('should handle edge case with FORCE_COLOR but CI environment', () => {
      process.env.FORCE_COLOR = '1';
      process.env.CI = 'true';
      process.stdout.isTTY = false;

      // FORCE_COLOR should override CI detection
      expect(shouldShowColors()).toBe(true);
    });
  });

  describe('Edge Cases and Environment Combinations', () => {
    it('should handle undefined process.stdout.isTTY', () => {
      // Some environments might not define isTTY
      (process.stdout as any).isTTY = undefined;
      delete process.env.NODE_ENV;
      delete process.env.CI;

      expect(isInteractiveEnvironment()).toBe(false);
    });
  });
});
