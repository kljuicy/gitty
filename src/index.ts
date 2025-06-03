// Main exports for the gitty-committy package
export * from './types';
export {
  getGlobalConfig,
  saveGlobalConfig,
  setDefaultProvider,
  getApiKey,
  getResolvedApiKey,
  saveApiKey,
  getLocalConfig,
  saveLocalConfig,
  linkRepoToPreset,
  resolveProvider,
  resolveConfig,
  getPreset,
  savePreset,
} from './config/manager';
export { generateCommit } from './commands/generate/generate';
export { setApiKey } from './commands/set-key/set-key';
export { setProvider } from './commands/set-provider/set-provider';
export { addRepo } from './commands/add-repo/add-repo';
export {
  generateCommitMessages,
  validateApiKey,
  getAvailableProviders,
  isProviderAvailable,
} from './providers';
export type { ProviderName } from './providers';
export * from './utils/git';
export * from './utils/diff';
export * from './utils/providers';
export * from './ui';
