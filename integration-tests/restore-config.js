#!/usr/bin/env node

/* eslint-env node */
/* global process, console */

/**
 * Emergency Gitty Config Restoration Script
 *
 * This script helps restore your Gitty configuration if the integration tests
 * were interrupted and didn't properly restore your original config.
 *
 * Usage:
 *   node integration-tests/restore-config.js
 *   node integration-tests/restore-config.js --force
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const homeDir = process.env.HOME || process.env.USERPROFILE;
const configDir = join(homeDir, '.gitty');
const configPath = join(configDir, 'config.json');

console.log('🔧 Gitty Config Emergency Restoration Tool');
console.log('==========================================\n');

// Check if --force flag is provided
const forceRestore = process.argv.includes('--force');

async function checkCurrentConfig() {
  if (!existsSync(configPath)) {
    console.log('ℹ️  No config file found at:', configPath);
    return null;
  }

  try {
    const currentConfig = readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(currentConfig);

    // Check if this looks like test data
    const isTestData =
      parsed.providers?.openai?.apiKey === 'test-key' ||
      parsed.providers?.openai?.apiKey === 'test-openai-key' ||
      parsed.providers?.gemini?.apiKey === 'test-gemini-key' ||
      parsed.default?.prepend === 'GLOBAL-' ||
      parsed.presets?.work?.prepend === 'PRESET-';

    return { content: currentConfig, isTestData, parsed };
  } catch (error) {
    console.error('❌ Error reading current config:', error.message);
    return null;
  }
}

async function restoreDefaultConfig() {
  const defaultConfig = {
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
  };

  try {
    mkdirSync(configDir, { recursive: true });
    writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('✅ Restored default Gitty configuration');
    console.log('📍 Location:', configPath);
    console.log('\n🔑 Next steps:');
    console.log('   1. Run: gitty --set-key --provider openai (or gemini)');
    console.log('   2. Set up your API key');
    console.log('   3. Customize your config as needed');
    return true;
  } catch (error) {
    console.error('❌ Failed to restore default config:', error.message);
    return false;
  }
}

async function promptUser(question) {
  return new Promise(resolve => {
    process.stdout.write(question + ' ');
    process.stdin.once('data', data => {
      resolve(data.toString().trim().toLowerCase());
    });
  });
}

async function main() {
  try {
    const currentConfig = await checkCurrentConfig();

    if (!currentConfig) {
      console.log('🆕 No config found. Creating default configuration...');
      await restoreDefaultConfig();
      return;
    }

    console.log('📋 Current config status:');
    console.log('   Location:', configPath);
    console.log(
      '   Contains test data:',
      currentConfig.isTestData ? '❌ YES' : '✅ NO'
    );

    if (currentConfig.isTestData) {
      console.log(
        '\n🚨 Your config appears to contain test data from interrupted tests!'
      );
      console.log('   This means your original config was likely overwritten.');

      if (!forceRestore) {
        const answer = await promptUser(
          '\n❓ Restore to default config? (y/N):'
        );
        if (answer !== 'y' && answer !== 'yes') {
          console.log(
            'ℹ️  Restoration cancelled. Run with --force to skip this prompt.'
          );
          process.exit(0);
        }
      }

      console.log('\n🔄 Restoring default configuration...');
      const success = await restoreDefaultConfig();

      if (success) {
        console.log(
          '\n💡 Your original settings are lost, but you can reconfigure:'
        );
        console.log(
          '   - API keys: gitty --set-key --provider <openai|gemini>'
        );
        console.log('   - Presets: Edit ~/.gitty/config.json manually');
        console.log('   - Preferences: Use gitty CLI options or config file');
      }
    } else {
      console.log('\n✅ Your config looks normal (no test data detected)');
      console.log("ℹ️  If you're experiencing issues, you can:");
      console.log('   - Run: node integration-tests/restore-config.js --force');
      console.log('   - Or manually edit:', configPath);
    }
  } catch (error) {
    console.error('💥 Emergency restoration failed:', error.message);
    console.error('\n🔧 Manual steps:');
    console.error('   1. Delete:', configPath);
    console.error('   2. Run: gitty --set-key --provider openai');
    console.error('   3. Reconfigure your settings');
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Restoration cancelled by user');
  process.exit(0);
});

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('restore-config.js')) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error.message);
      process.exit(1);
    });
}
