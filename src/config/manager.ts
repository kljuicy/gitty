import Conf from 'conf';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync, readFileSync } from 'fs';
import type {
  GittyConfig,
  LocalConfig,
  ResolvedConfig,
  CLIOptions,
  AIProvider,
} from '../types/index';
import { GittyConfigSchema, LocalConfigSchema } from '../types/index';
import { getProviderDisplayName } from '../utils/providers';
import { writeJsonFile, readJsonFileWithFriendlyErrors } from '../utils/files';
import { createSpinner } from '../ui/spinner';
import { promptWithGracefulExit } from '../ui/prompts';
import { getGitRoot } from '../utils/git';
import { showInfo, showSuccess, showError, showHint, showWarning } from '../ui';
import { shouldShowProgress } from '../utils/environment';

const configDir = join(homedir(), '.gitty');

try {
  mkdirSync(configDir, { recursive: true });
} catch {
  // Directory exists
}

// Lazy-loaded global config with error handling
let globalConfigInstance: Conf<GittyConfig> | null = null;

/**
 * Initialize global config with proper error handling for malformed JSON
 */
function initializeGlobalConfig(): Conf<GittyConfig> {
  if (globalConfigInstance) {
    return globalConfigInstance;
  }

  const configPath = join(configDir, 'config.json');

  // Validate JSON syntax if config exists using synchronous validation
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      JSON.parse(configContent); // Test if JSON is valid
    } catch (error) {
      if (error instanceof SyntaxError) {
        showError('🚨 Your gitty configuration file has invalid JSON syntax');
        showHint(`Config file location: ${configPath}`);
        showHint(
          'Please fix the JSON syntax or delete the file to reset to defaults'
        );

        // Show helpful line number information
        if (error.message.includes('position')) {
          const match = error.message.match(/position (\d+)/);
          if (match && match[1]) {
            const position = parseInt(match[1]);
            try {
              const content = readFileSync(configPath, 'utf-8');
              const lines = content.split('\n');
              let currentPos = 0;
              let lineNum = 0;

              for (let i = 0; i < lines.length; i++) {
                if (currentPos + (lines[i]?.length || 0) >= position) {
                  lineNum = i + 1;
                  break;
                }
                currentPos += (lines[i]?.length || 0) + 1; // +1 for newline
              }

              if (lineNum > 0) {
                showHint(`Error appears to be around line ${lineNum}`);
              }
            } catch {
              // Ignore if we can't show line number
            }
          }
        }

        // Show specific hints based on content analysis
        try {
          const content = readFileSync(configPath, 'utf-8');

          // Check for common issues with simple regex
          if (content.includes(',}') || content.includes(',]')) {
            showHint(
              'Detected trailing comma - remove the comma before } or ]'
            );
          } else if (/[{,]\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:/.test(content)) {
            showHint(
              'Detected unquoted property names - wrap property names in quotes'
            );
          } else if (/:\s*[a-zA-Z_][a-zA-Z0-9_]*(?:\s*[,}])/.test(content)) {
            showHint('Detected unquoted values - wrap string values in quotes');
          } else if (
            content.split('{').length - 1 >
            content.split('}').length - 1
          ) {
            showHint('Detected unclosed braces - missing closing }');
          } else {
            // Generic help message
            showHint(
              'Common issues: missing quotes, trailing commas, unclosed braces'
            );
          }
        } catch {
          // Fallback to generic message if content analysis fails
          showHint(
            'Common issues: missing quotes, trailing commas, unclosed braces'
          );
        }

        process.exit(1);
      }
      throw error; // Re-throw non-JSON errors
    }
  }

  try {
    globalConfigInstance = new Conf<GittyConfig>({
      projectName: 'gitty',
      cwd: configDir,
      configName: 'config',
      defaults: {
        defaultProvider: 'openai',
        providers: {
          openai: {
            apiKey: '',
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 500,
          },
          gemini: {
            apiKey: '',
            model: 'gemini-1.5-flash',
            temperature: 0.7,
            maxTokens: 2048,
          },
        },
        default: {
          prepend: '',
          style: 'concise',
          language: 'en',
        },
        presets: {},
      },
    });

    return globalConfigInstance;
  } catch (error) {
    // If we reach here after the JSON validation above, it's likely a different error
    console.error('🚨 Failed to initialize gitty configuration');
    console.error(`Config directory: ${configDir}`);
    console.error('Try deleting the config directory to reset to defaults');
    throw error;
  }
}

/**
 * Get global configuration
 */
export function getGlobalConfig(): GittyConfig {
  const config = initializeGlobalConfig();
  return GittyConfigSchema.parse(config.store);
}

/**
 * Save global configuration
 */
export function saveGlobalConfig(config: Partial<GittyConfig>): void {
  const current = getGlobalConfig();
  const merged = { ...current, ...config };
  const globalConfig = initializeGlobalConfig();
  globalConfig.store = GittyConfigSchema.parse(merged);
}

/**
 * Set default AI provider
 */
export function setDefaultProvider(provider: AIProvider): void {
  const config = getGlobalConfig();
  config.defaultProvider = provider;
  saveGlobalConfig(config);
}

/**
 * Get API key for specified provider from config or environment
 */
export function getApiKey(provider?: AIProvider): string {
  const config = getGlobalConfig();
  const targetProvider = provider || config.defaultProvider;
  const providerConfig = config.providers[targetProvider];

  if (providerConfig?.apiKey) return providerConfig.apiKey;

  const envKey =
    targetProvider === 'openai'
      ? process.env['OPENAI_API_KEY']
      : process.env['GEMINI_API_KEY'];

  if (envKey) return envKey;

  throw new Error(
    `No API key found for ${targetProvider}. Run "gitty --set-key --provider ${targetProvider}" or set the appropriate environment variable`
  );
}

/**
 * Get API key with full config resolution (includes preset/local overrides)
 */
export async function getResolvedApiKey(
  provider: AIProvider,
  options: CLIOptions,
  localConfig?: LocalConfig | null
): Promise<string> {
  const globalConfigData = getGlobalConfig();
  // Only call getLocalConfig() if localConfig parameter was not provided at all
  const resolvedLocalConfig =
    localConfig !== undefined ? localConfig : await getLocalConfig();

  let apiKey = globalConfigData.providers[provider]?.apiKey || '';

  const presetName = options.preset || resolvedLocalConfig?.preset;
  if (presetName && globalConfigData.presets[presetName]) {
    const presetApiKey =
      globalConfigData.presets[presetName]!.providers?.[provider]?.apiKey;
    if (presetApiKey) apiKey = presetApiKey;
  }

  const localApiKey = resolvedLocalConfig?.providers?.[provider]?.apiKey;
  if (localApiKey) apiKey = localApiKey;

  if (!apiKey) {
    const envKey =
      provider === 'openai'
        ? process.env['OPENAI_API_KEY']
        : process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'];
    if (envKey) return envKey;
  }

  if (!apiKey) {
    throw new Error(
      `No API key found for ${provider}. Run "gitty --set-key --provider ${provider}" or set the appropriate environment variable`
    );
  }

  return apiKey;
}

/**
 * Save API key for specified provider
 */
export function saveApiKey(apiKey: string, provider?: AIProvider): void {
  const config = getGlobalConfig();
  const targetProvider = provider || config.defaultProvider;

  if (!config.providers[targetProvider]) {
    config.providers[targetProvider] = {} as any;
  }

  config.providers[targetProvider]!.apiKey = apiKey;
  saveGlobalConfig(config);
}

/**
 * Get local repo config from .git/gittyrc.json
 */
export async function getLocalConfig(): Promise<LocalConfig | null> {
  try {
    const gitRoot = await getGitRoot();
    const configPath = join(gitRoot, '.git', 'gittyrc.json');

    // Check if file exists first
    const { fileExists } = await import('../utils/files');
    if (!(await fileExists(configPath))) {
      return null;
    }

    // Read the file content first to detect if it's JSON-like
    const { readTextFile } = await import('../utils/files');
    const content = await readTextFile(configPath);

    // Check for completely non-JSON content (but not empty/whitespace)
    const trimmed = content.trim();
    if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      // Completely non-JSON content with actual content - silent fallback
      return null;
    }

    // For local config: always show warnings but never exit - graceful fallback
    const data = await readJsonFileWithFriendlyErrors<LocalConfig>(configPath, {
      fileDescription: 'local repository configuration',
      allowMissing: true, // Local config is optional
      showHelp: false, // Don't exit - we'll handle errors gracefully with warnings
    });

    if (!data) {
      return null;
    }

    return LocalConfigSchema.parse(data);
  } catch (error) {
    // For local config, show warning but fall back gracefully
    if (
      error instanceof Error &&
      error.message.includes('Failed to read JSON from')
    ) {
      showWarning('Local repository configuration has malformed JSON syntax');
      showWarning('Falling back to global configuration');
      showHint(
        'Please fix the local config or delete .git/gittyrc.json to reset'
      );
    }

    // For any local config error, gracefully fall back to null
    // This allows the system to use global config instead
    return null;
  }
}

/**
 * Save local repo config
 * @param config - Config to save
 */
export async function saveLocalConfig(config: LocalConfig): Promise<void> {
  const gitRoot = await getGitRoot();
  const configPath = join(gitRoot, '.git', 'gittyrc.json');
  const existing = await getLocalConfig();
  const merged = { ...existing, ...config };
  const validated = LocalConfigSchema.parse(merged);
  writeJsonFile(configPath, validated, { pretty: true });
}

/**
 * Link current repo to a preset
 */
export async function linkRepoToPreset(presetName: string): Promise<void> {
  const globalConfigData = getGlobalConfig();
  if (!globalConfigData.presets[presetName]) {
    throw new Error(`Preset "${presetName}" not found in global config`);
  }
  await saveLocalConfig({ preset: presetName });
}

/**
 * Smart provider resolution with local context awareness
 */
export async function resolveProvider(
  options: CLIOptions,
  globalConfigData: GittyConfig,
  localConfig: LocalConfig | null
): Promise<AIProvider> {
  if (options.provider) {
    return options.provider;
  }
  if (localConfig?.defaultProvider) {
    return localConfig.defaultProvider;
  }

  if (localConfig?.providers) {
    const localProviders = Object.keys(localConfig.providers).filter(
      (key): key is AIProvider => key === 'openai' || key === 'gemini'
    );

    if (localProviders.length === 1) {
      showInfo(
        `Auto-detected provider: ${getProviderDisplayName(localProviders[0]!)}`,
        '🎯'
      );
      return localProviders[0]!;
    }

    if (localProviders.length === 2) {
      const { selectedProvider } = await promptWithGracefulExit<{
        selectedProvider: AIProvider;
      }>([
        {
          type: 'list',
          name: 'selectedProvider',
          message: 'Select your default provider for this project:',
          choices: localProviders.map(provider => ({
            name: getProviderDisplayName(provider),
            value: provider,
          })),
        },
      ]);

      const updatedConfig = {
        ...localConfig,
        defaultProvider: selectedProvider,
      };
      await saveLocalConfig(updatedConfig);
      showSuccess(
        `Saved ${getProviderDisplayName(selectedProvider)} as default for this project`
      );
      return selectedProvider;
    }
  }

  const presetName = options.preset || localConfig?.preset;
  if (presetName && globalConfigData.presets[presetName]) {
    const preset = globalConfigData.presets[presetName]!;
    if (preset.defaultProvider) return preset.defaultProvider;
  }

  return globalConfigData.defaultProvider;
}

/**
 * Resolve final configuration from all sources
 */
export async function resolveConfig(
  options: CLIOptions
): Promise<ResolvedConfig> {
  const globalConfigData = getGlobalConfig();
  const localConfig = await getLocalConfig();

  const provider = await resolveProvider(
    options,
    globalConfigData,
    localConfig
  );

  // Validate API key early to fail fast with clean error (before spinner)
  // Pass localConfig to avoid duplicate getLocalConfig() calls
  const apiKey = await getResolvedApiKey(provider, options, localConfig);

  // Only show spinner in interactive environments (not during tests or when output is piped)
  const isInteractive = shouldShowProgress();
  let spinner: any = null;

  if (isInteractive) {
    spinner = await createSpinner();
    spinner.start('Finalizing configuration...');
  }

  // Track if provider was set via CLI (highest priority)
  const isProviderFromCLI = !!options.provider;

  const providerConfig =
    globalConfigData.providers[provider] || globalConfigData.providers.openai;

  let resolved: ResolvedConfig = {
    provider,
    apiKey, // Use the validated API key
    prepend: globalConfigData.default.prepend,
    style: globalConfigData.default.style,
    language: globalConfigData.default.language,
    model: providerConfig.model,
    temperature: providerConfig.temperature,
    maxTokens: providerConfig.maxTokens,
  };

  const presetName = options.preset || localConfig?.preset;
  if (presetName && globalConfigData.presets[presetName]) {
    const preset = globalConfigData.presets[presetName]!;

    // Apply preset non-provider specific overrides
    resolved = {
      ...resolved,
      prepend: preset.prepend,
      style: preset.style,
      language: preset.language,
    };

    // If preset changes the provider, reset to that provider's global defaults
    // BUT only if provider wasn't explicitly set via CLI
    if (
      !isProviderFromCLI &&
      preset.defaultProvider &&
      preset.defaultProvider !== resolved.provider
    ) {
      resolved.provider = preset.defaultProvider;
      const newProviderConfig =
        globalConfigData.providers[preset.defaultProvider] ||
        globalConfigData.providers.openai;
      resolved.model = newProviderConfig.model;
      resolved.temperature = newProviderConfig.temperature;
      resolved.maxTokens = newProviderConfig.maxTokens;
    }

    // Apply preset provider-specific overrides for the final provider
    if (preset.providers) {
      const presetProviderConfig = preset.providers[resolved.provider];
      if (presetProviderConfig) {
        resolved.model = presetProviderConfig.model || resolved.model;
        resolved.temperature =
          presetProviderConfig.temperature ?? resolved.temperature;
        resolved.maxTokens =
          presetProviderConfig.maxTokens ?? resolved.maxTokens;
      }
    }
  }

  if (localConfig) {
    if (localConfig.prepend !== undefined)
      resolved.prepend = localConfig.prepend;
    if (localConfig.style) resolved.style = localConfig.style;
    if (localConfig.language) resolved.language = localConfig.language;

    // If local config changes the provider, reset to that provider's global defaults
    // BUT only if provider wasn't explicitly set via CLI
    if (
      !isProviderFromCLI &&
      localConfig.defaultProvider &&
      localConfig.defaultProvider !== resolved.provider
    ) {
      resolved.provider = localConfig.defaultProvider;
      const newProviderConfig =
        globalConfigData.providers[localConfig.defaultProvider] ||
        globalConfigData.providers.openai;
      resolved.model = newProviderConfig.model;
      resolved.temperature = newProviderConfig.temperature;
      resolved.maxTokens = newProviderConfig.maxTokens;
    }

    // Apply local provider-specific overrides for the final provider
    if (localConfig.providers) {
      const localProviderConfig = localConfig.providers[resolved.provider];
      if (localProviderConfig) {
        resolved.model = localProviderConfig.model || resolved.model;
        resolved.temperature =
          localProviderConfig.temperature ?? resolved.temperature;
        resolved.maxTokens =
          localProviderConfig.maxTokens ?? resolved.maxTokens;
      }
    }
  }

  if (options.style) resolved.style = options.style;
  if (options.language) resolved.language = options.language;
  if (options.model) resolved.model = options.model;
  if (options.temperature !== undefined)
    resolved.temperature = options.temperature;
  if (options.maxTokens !== undefined) resolved.maxTokens = options.maxTokens;

  if (options.prepend !== undefined) {
    if (options.forcePrepend) {
      // Force prepend: completely replace the resolved prepend
      resolved.prepend = options.prepend;
    } else {
      // Normal prepend: append to the resolved prepend (original behavior)
      resolved.prepend = (resolved.prepend || '') + options.prepend;
    }
  }

  if (spinner) {
    spinner.succeed('Configuration finalized');
  }
  return resolved;
}

/**
 * Get or create a preset
 */
export function getPreset(
  name: string
): GittyConfig['presets'][string] | undefined {
  return getGlobalConfig().presets[name];
}

/**
 * Save a preset
 */
export function savePreset(
  name: string,
  preset: GittyConfig['presets'][string]
): void {
  const config = getGlobalConfig();
  config.presets[name] = preset;
  saveGlobalConfig(config);
}
