/**
 * Sanitize error messages to prevent API key exposure
 * @param error - Error object or error message string
 * @param apiKey - Optional API key to redact from the message
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(
  error: Error | string,
  apiKey?: string
): string {
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else {
    message = error;
  }

  if (!apiKey) {
    return message;
  }

  // Escape special regex characters in the API key
  const escapedKey = apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Replace any occurrence of the API key with [REDACTED]
  const sanitized = message.replace(new RegExp(escapedKey, 'gi'), '[REDACTED]');

  return sanitized;
}
