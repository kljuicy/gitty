/**
 * Shared retry strategy for AI providers
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseTemperature: number;
  fallbackTemperature?: number;
}

export async function withRetry<T>(
  operation: (attempt: number, temperature: number) => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts = 3,
    baseTemperature,
    fallbackTemperature = 0.3,
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const temperature =
        attempt > 1
          ? Math.min(fallbackTemperature, baseTemperature)
          : baseTemperature;

      return await operation(attempt, temperature);
    } catch (error) {
      if (attempt === maxAttempts) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to generate commit messages after ${maxAttempts} attempts: ${message}`
        );
      }
    }
  }

  throw new Error('Unexpected error in retry strategy');
}
