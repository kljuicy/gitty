import type { CommitStyle } from './ai-provider';

export interface CommitMessage {
  message: string;
  confidence: number;
}

export interface GenerateCommitOptions {
  diff: string;
  style: CommitStyle;
  language: string;
  prepend: string;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
}
