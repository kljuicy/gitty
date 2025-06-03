import type { AIProvider, CommitStyle } from './ai-provider';
import type { GenerateCommitOptions, CommitMessage } from './commit-message';
import type { GittyConfigSchema, LocalConfigSchema } from './schemas';

export type GittyConfig = typeof GittyConfigSchema._type;
export type LocalConfig = typeof LocalConfigSchema._type;

export interface ResolvedConfig {
  provider: AIProvider;
  apiKey: string;
  prepend: string;
  style: CommitStyle;
  language: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AIProviderClient {
  generateCommitMessages(
    options: GenerateCommitOptions
  ): Promise<CommitMessage[]>;
  validateApiKey(): Promise<boolean>;
}
