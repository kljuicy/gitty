/* istanbul ignore file */
import { vi } from 'vitest';

/**
 * Mock factories for external dependencies
 * Focus: Prevent real external calls during testing
 */

/**
 * OpenAI client mock for dependency injection - prevents real API calls
 */
export const createOpenAIClientMock = (): any => ({
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                { message: 'feat: add new feature', confidence: 0.9 },
                { message: 'update: improve functionality', confidence: 0.8 },
                { message: 'refactor: clean up code', confidence: 0.7 },
              ]),
            },
          },
        ],
      }),
    },
  },
  models: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
});

/**
 * OpenAI client mock that throws errors for testing error paths
 */
export const createOpenAIClientErrorMock = (): any => ({
  chat: {
    completions: {
      create: vi.fn().mockRejectedValue(new Error('API Error')),
    },
  },
  models: {
    list: vi.fn().mockRejectedValue(new Error('Unauthorized')),
  },
});

/**
 * Gemini client mock for dependency injection - prevents real API calls
 */
export const createGeminiClientMock = (): any => ({
  getGenerativeModel: vi.fn().mockReturnValue({
    generateContent: vi.fn().mockResolvedValue({
      response: {
        text: vi.fn().mockReturnValue(
          JSON.stringify([
            { message: 'feat: implement new feature', confidence: 0.9 },
            { message: 'update: enhance performance', confidence: 0.8 },
            { message: 'fix: resolve issue', confidence: 0.7 },
          ])
        ),
      },
    }),
  }),
});

/**
 * Gemini client mock that throws errors for testing error paths
 */
export const createGeminiClientErrorMock = (): any => ({
  getGenerativeModel: vi.fn().mockReturnValue({
    generateContent: vi.fn().mockRejectedValue(new Error('API Error')),
  }),
});

/**
 * Git client mock for dependency injection - prevents real git operations
 */
export const createGitClientMock = () => ({
  checkIsRepo: vi.fn().mockResolvedValue(true),
  status: vi.fn().mockResolvedValue({
    isClean: vi.fn().mockReturnValue(false),
    staged: ['file1.ts'],
    created: ['file2.ts'],
    modified: ['file3.ts'],
    renamed: [{ from: 'old.ts', to: 'new.ts' }],
    conflicted: [],
    current: 'main',
  }),
  diff: vi.fn().mockResolvedValue('mock diff content'),
  add: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  log: vi.fn().mockResolvedValue({
    latest: { message: 'latest commit' },
    total: 1,
  }),
  reset: vi.fn().mockResolvedValue(undefined),
  revparse: vi.fn().mockResolvedValue('/fake/git/root'),
  getRemotes: vi
    .fn()
    .mockResolvedValue([
      { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git' } },
    ]),
  branchLocal: vi.fn().mockResolvedValue({ current: 'main' }),
});
