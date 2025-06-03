import type { AIProvider, CommitStyle } from './ai-provider';

export interface CLIOptions {
  setKey?: boolean;
  addRepo?: boolean;
  prepend?: string;
  forcePrepend?: boolean;
  preset?: string;
  style?: CommitStyle;
  language?: string;
  preview?: boolean;
  provider?: AIProvider;
  setProvider?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
