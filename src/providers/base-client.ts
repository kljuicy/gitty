import type { CommitMessage } from '../types';
import { truncateDiff } from '../utils/diff';

/**
 * Base AI Functions Interface
 * Defines the core functions needed for AI commit message generation
 */
export interface BaseAIFunctions {
  formatMessage(message: string, prepend?: string): string;
  buildSystemPrompt(style: string, language: string, prepend?: string): string;
  buildUserPrompt(diff: string, maxLength: number): string;
  parseResponse(content: string, prepend?: string): CommitMessage[];
}

/**
 * Factory function that creates the default implementation of base AI functions
 */
export function createBaseAIFunctions(): BaseAIFunctions {
  return {
    formatMessage,
    buildSystemPrompt,
    buildUserPrompt,
    parseResponse,
  };
}

/**
 * Singleton instance for performance - reuse across all calls
 */
export const baseAIFunctions = createBaseAIFunctions();

/**
 * Core message formatting utilities
 */
function formatMessage(message: string, prepend?: string): string {
  const capitalized = capitalizeMessage(message);
  return prepend ? `${prepend}: ${capitalized}` : capitalized;
}

function capitalizeMessage(message: string): string {
  if (!message) return message;
  const result = message.charAt(0).toUpperCase() + message.slice(1);
  return result.replace(
    /: ([a-z])/g,
    (_, letter) => `: ${letter.toUpperCase()}`
  );
}

/**
 * Build system prompt for AI models with optional prepend handling
 */
function buildSystemPrompt(
  style: string,
  language: string,
  prepend?: string
): string {
  const stylePrompts = {
    concise:
      'You write clear, concise commit messages that are straight to the point.',
    detailed:
      'You write detailed commit messages that explain what changed and why.',
    funny:
      'You write humorous but informative commit messages with wit and personality.',
  };

  const conventionalCommitInstruction = prepend
    ? 'Do not include prefixes like feat:, fix:, docs: in your messages since a custom prefix will be added.'
    : 'Follow conventional commit format when appropriate (feat:, fix:, docs:, etc).';

  return `You are a helpful assistant that generates git commit messages.
${stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.concise}
Generate commit messages in ${language}.
${conventionalCommitInstruction}`;
}

/**
 * Build user prompt with truncated diff
 */
function buildUserPrompt(diff: string, maxLength: number): string {
  const truncatedDiff = truncateDiff(diff, maxLength);
  return `Based on this git diff, generate 3 different commit message options:

${truncatedDiff}

Return ONLY a JSON array with exactly this structure:
[
  {"message": "first commit message here", "confidence": 0.9},
  {"message": "second commit message here", "confidence": 0.8},
  {"message": "third commit message here", "confidence": 0.7}
]

Important: Return ONLY the JSON array, no other text, no explanations, no markdown.`;
}

/**
 * Parse AI response content into commit messages
 */
function parseResponse(content: string, prepend?: string): CommitMessage[] {
  const cleanContent = stripMarkdown(content);

  try {
    const parsed = JSON.parse(cleanContent);
    const messages = extractMessages(parsed);
    return validateMessages(messages, prepend);
  } catch {
    const fallbackMessages = extractFromPlainText(cleanContent);
    return fallbackMessages.length > 0
      ? fallbackMessages.map((msg, i) => ({
          message: formatMessage(msg, prepend),
          confidence: 0.9 - i * 0.1,
        }))
      : [
          {
            message: formatMessage('Update code and documentation', prepend),
            confidence: 0.5,
          },
        ];
  }
}

function stripMarkdown(content: string): string {
  let clean = content.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
  }
  return clean;
}

function extractMessages(parsed: any): any[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const messages =
      parsed.messages || parsed.commits || parsed.suggestions || [];
    if (Array.isArray(messages) && messages.length > 0) return messages;
    if (parsed.message) return [parsed];
    return messages;
  }
  return [];
}

function validateMessages(messages: any[], prepend?: string): CommitMessage[] {
  return messages
    .filter((m: any) => m && m.message && typeof m.message === 'string')
    .map((m: any) => ({
      message: formatMessage(m.message, prepend),
      confidence: typeof m.confidence === 'number' ? m.confidence : 0.5,
    }))
    .slice(0, 3);
}

function extractFromPlainText(text: string): string[] {
  const messages: string[] = [];
  const numberedRegex = /^\s*\d+[.)]\s*(.+)$/gm;
  let match;

  while ((match = numberedRegex.exec(text)) !== null && messages.length < 3) {
    if (match[1]) {
      const clean = match[1]
        .trim()
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');
      messages.push(clean);
    }
  }

  if (messages.length === 0) {
    const bulletRegex = /^\s*[-•*]\s*(.+)$/gm;
    while ((match = bulletRegex.exec(text)) !== null && messages.length < 3) {
      if (match[1]) {
        const clean = match[1]
          .trim()
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1');
        messages.push(clean);
      }
    }
  }

  return messages;
}
