import { describe, it, expect } from 'vitest';
import { sanitizeErrorMessage } from './sanitize';

describe('sanitizeErrorMessage', () => {
  it('should return error message as-is when no API key provided', () => {
    const error = new Error('Something went wrong');
    expect(sanitizeErrorMessage(error)).toBe('Something went wrong');
    expect(sanitizeErrorMessage('Simple string')).toBe('Simple string');
  });

  it('should redact API key from error messages', () => {
    const apiKey = 'sk-1234567890abcdef';
    const error = new Error(`API key ${apiKey} is invalid`);
    const sanitized = sanitizeErrorMessage(error, apiKey);

    expect(sanitized).toBe('API key [REDACTED] is invalid');
    expect(sanitized).not.toContain(apiKey);
  });

  it('should redact API key case-insensitively', () => {
    const apiKey = 'sk-1234567890abcdef';
    const error = new Error(`API key ${apiKey.toUpperCase()} is invalid`);
    const sanitized = sanitizeErrorMessage(error, apiKey);

    expect(sanitized).toBe('API key [REDACTED] is invalid');
    expect(sanitized).not.toContain(apiKey);
  });

  it('should redact multiple occurrences of API key', () => {
    const apiKey = 'sk-1234567890abcdef';
    const error = new Error(
      `API key ${apiKey} is invalid. Please check ${apiKey} again.`
    );
    const sanitized = sanitizeErrorMessage(error, apiKey);

    expect(sanitized).toBe(
      'API key [REDACTED] is invalid. Please check [REDACTED] again.'
    );
    expect(sanitized).not.toContain(apiKey);
  });

  it('should handle API keys with special regex characters', () => {
    const apiKey = 'sk-123.456+789*890?';
    const error = new Error(`API key ${apiKey} is invalid`);
    const sanitized = sanitizeErrorMessage(error, apiKey);

    expect(sanitized).toBe('API key [REDACTED] is invalid');
    expect(sanitized).not.toContain(apiKey);
  });

  it('should handle string error messages', () => {
    const apiKey = 'sk-1234567890abcdef';
    const errorMessage = 'API key sk-1234567890abcdef is invalid';
    const sanitized = sanitizeErrorMessage(errorMessage, apiKey);

    expect(sanitized).toBe('API key [REDACTED] is invalid');
    expect(sanitized).not.toContain(apiKey);
  });

  it('should handle empty error messages', () => {
    const apiKey = 'sk-1234567890abcdef';
    expect(sanitizeErrorMessage('', apiKey)).toBe('');
    expect(sanitizeErrorMessage(new Error(''), apiKey)).toBe('');
  });

  it('should handle errors without API key in message', () => {
    const apiKey = 'sk-1234567890abcdef';
    const error = new Error('Network timeout occurred');
    const sanitized = sanitizeErrorMessage(error, apiKey);

    expect(sanitized).toBe('Network timeout occurred');
  });

  it('should handle partial API key matches', () => {
    const apiKey = 'sk-1234567890abcdef';
    const error = new Error('API key sk-1234567890abcde is invalid');
    const sanitized = sanitizeErrorMessage(error, apiKey);

    // Should not redact partial matches
    expect(sanitized).toBe('API key sk-1234567890abcde is invalid');
  });

  it('should handle Gemini API keys', () => {
    const apiKey = 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz';
    const error = new Error(`Invalid API key: ${apiKey}`);
    const sanitized = sanitizeErrorMessage(error, apiKey);

    expect(sanitized).toBe('Invalid API key: [REDACTED]');
    expect(sanitized).not.toContain(apiKey);
  });
});
