import { ensureGitRepository, getRepositoryInfo } from '../../utils/git';
import { getGlobalConfig, linkRepoToPreset } from '../../config/manager';
import { createSpinner } from '../../ui/spinner';
import {
  showSection,
  showConfigLine,
  showHint,
  showSuccess,
  showError,
} from '../../ui/ui';
import { shouldShowProgress } from '../../utils/environment';

export async function addRepo(presetName: string): Promise<void> {
  const spinner = shouldShowProgress() ? await createSpinner() : null;
  if (spinner) {
    spinner.start('Setting up repository...');
  }

  try {
    await ensureGitRepository();
    const globalConfig = getGlobalConfig();
    const preset = globalConfig.presets[presetName];

    if (!preset) {
      if (spinner) {
        spinner.fail(`Preset "${presetName}" not found`);
      } else {
        showError(`Preset "${presetName}" not found`);
      }
      showHint('Create presets in ~/.gitty/config.json');
      return;
    }

    const repoInfo = await getRepositoryInfo();
    await linkRepoToPreset(presetName);

    if (spinner) {
      spinner.succeed('Repository linked to preset successfully!');
    } else {
      showSuccess('Repository linked to preset successfully!');
    }

    showSection('Repository Configuration', '📁');
    showConfigLine('Branch', repoInfo.branch);
    showConfigLine('Remote', repoInfo.remoteUrl || 'none');
    showConfigLine('Linked preset', presetName);

    showSection('Preset Details', '🎯');
    showConfigLine('Default Provider', preset.defaultProvider || 'default');

    if (preset.prepend) {
      showConfigLine('Prepend', preset.prepend);
    }
    if (preset.style) {
      showConfigLine('Style', preset.style);
    }
    if (preset.language) {
      showConfigLine('Language', preset.language);
    }

    showSection("You're all set! Just use:", '✨');
    console.log('  gitty -p "123"           # Add ticket prefix');
    console.log('  gitty                    # Use preset defaults');
  } catch (_error) {
    // Error message already shown by ensureGitRepository() or other functions
    return;
  }
}
