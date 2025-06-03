/* istanbul ignore file */
import { vi, beforeEach, afterEach, expect } from 'vitest';

/**
 * Console testing utilities
 */

/**
 * Standard console spy setup
 */
export const setupConsoleSpy = () => {
  const spies = {
    consoleLogSpy: null as any,
    consoleErrorSpy: null as any,
    consoleWarnSpy: null as any,
    processExitSpy: null as any,
  };

  beforeEach(() => {
    spies.consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    spies.consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    spies.consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    spies.processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  return spies;
};

/**
 * Helper to expect console output with emojis and formatting
 */
export const expectConsoleOutput = {
  section: (spy: any, title: string) => {
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(title));
  },

  success: (spy: any, message: string) => {
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('✅'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(message));
  },

  error: (spy: any, message: string) => {
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('❌'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(message));
  },

  suggestion: (spy: any, command: string) => {
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('💡'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(command));
  },
};

/**
 * Helper to test SIGINT handling
 */
export const testSigintHandling = {
  expectGracefulExit: (consoleLogSpy: any, processExitSpy: any) => {
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Oh! OK - See you soon! 🐥')
    );
    expect(processExitSpy).toHaveBeenCalledWith(0);
  },

  expectNoGracefulExit: (consoleLogSpy: any, processExitSpy: any) => {
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Oh! OK - See you soon! 🐥')
    );
    expect(processExitSpy).not.toHaveBeenCalled();
  },
};
