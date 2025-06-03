/* istanbul ignore file */
/**
 * Type-safe interfaces for external libraries used in tests
 * These are simplified for mocking while staying close to reality
 *
 * Note: These are manually maintained and simplified versions of real library types.
 * They focus on the methods we actually use in tests. If libraries change
 * significantly, integration tests will catch any real compatibility issues.
 */

// 🎯 Simple Chalk interface - just what we need for mocking
export interface IChalk {
  green(text: string): string;
  blue(text: string): string;
  yellow(text: string): string;
  red(text: string): string;
  gray(text: string): string;
  cyan(text: string): string;
  white: {
    bold(text: string): string;
  };
  bold(text: string): string;
  dim(text: string): string;
}

// 🎯 Simple Inquirer interface - just what we need for mocking
export interface IInquirer {
  prompt: (questions: any[]) => Promise<any>;
  Separator: () => any;
}
