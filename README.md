# 🐥 Gitty Committy

> _"Your cute lil AI-powered Git sidekick"_

[![npm version](https://img.shields.io/npm/v/gitty-committy.svg)](https://www.npmjs.com/package/gitty-committy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform Support](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)](https://github.com/your-username/gitty-committy)

---

**Gitty** is a cross-platform CLI tool that helps developers generate clear, consistent, and customizable commit messages using Git diffs and OpenAI's API. Designed to be portable, pluggable, and personality-driven, Gitty streamlines your commit workflow without replacing Git — it's the helpful pal Git never had.

## 🧠 Goals

- 🎯 **Smart Commits**: Use OpenAI to generate quality commit messages from Git diffs
- 🎨 **Personal Style**: Respect each developer's style, language, and workflow
- 🚀 **Easy Setup**: Be easy to install, configure, and use across macOS, Linux, and Windows
- 📋 **Project Presets**: Support multiple presets per project
- 🧸 **Fun Experience**: Feel like a fun, cuddly, professional-grade tool

## 🔧 Tech Stack

| Layer                 | Tool                                             |
| --------------------- | ------------------------------------------------ |
| **Language**          | TypeScript (Node.js)                             |
| **CLI Framework**     | commander or oclif                               |
| **Prompting**         | inquirer or prompts                              |
| **OpenAI API**        | openai npm package                               |
| **Git Integration**   | simple-git or child_process                      |
| **Config Management** | Custom config in `~/.gitty/config.json` or conf  |
| **Packaging**         | npm install -g, pkg (for standalone executables) |
| **Cross-Platform**    | Fully works on Mac, Linux, Windows               |

## 📦 Installation

### Option 1: Global via NPM

```bash
npm install -g gitty-committy
```

### Option 2: Standalone Binary

```bash
pkg . --output gitty
# Output: gitty.exe, gitty (no Node needed)
```

### Option 3: Curl Script

```bash
curl -sSL https://gitty.sh/install.sh | bash
```

## 🚀 Getting Started

### 1. Set your OpenAI API key (one-time setup)

```bash
gitty --set-key
# Prompts for your OpenAI API key and saves it securely
```

### 2. Try it out!

```bash
cd your-git-repo
gitty
# Generates 3 commit message options from your current git diff
```

### 3. Optional: Set up project presets

```bash
# Link this repo to a preset for automatic detection
gitty -P work --add-repo

# Now just use: gitty -p "TICKET-123:"
```

## ⚡ Quick Usage Examples

```bash
# Basic usage - interactive mode
gitty

# SETUP: Navigate to repo and link it to preset (one-time per repo)
cd ~/work/main-app  # Must be inside the git repo!
gitty -P work --add-repo
# Creates: .git/gittyrc.json with {"preset": "work"}

# Now it's completely automatic!
gitty -p "123:"
# Checks .git/gittyrc.json → reads "work" preset → "DEV-123: [message]"

# Set up different repos with different presets
cd ~/personal/blog  # Navigate to personal repo
gitty -P personal --add-repo  # Creates .git/gittyrc.json with {"preset": "personal"}

cd ~/freelance/client-site  # Navigate to freelance repo
gitty -P freelance --add-repo  # Creates .git/gittyrc.json with {"preset": "freelance"}

# Now seamless switching works automatically
cd ~/work/main-app
gitty -p "456:"  # Reads .git/gittyrc.json → uses work preset

cd ~/personal/blog
gitty -p "post:"  # Reads .git/gittyrc.json → uses personal preset

cd ~/freelance/client-site
gitty -p "task-99:"  # Reads .git/gittyrc.json → uses freelance preset
```

## 🧰 Core Features

### ✅ `gitty`

Generate AI commit messages from your Git diff.

- **3 message options** - Choose from multiple AI-generated suggestions
- **Interactive selection** - Select, edit, regenerate, or quit
- **Full customization** - Supports prepend, style, language, and preset

### 🔐 `--set-key`

Securely store your OpenAI API key.

- Prompts for OpenAI API key and stores it securely (default: `~/.gitty/config.json`)
- Falls back to `OPENAI_API_KEY` environment variable
- **Privacy first**: Never sends key anywhere but to OpenAI

### ✏️ `--prepend` | `-p`

Add custom text before AI-generated messages.

```bash
gitty --prepend "DEV-567:"
gitty -p "DEV-567:"  # Short version
# Output: "DEV-567: Fix null pointer exception in user service"

# Works additively with presets
gitty -P work -p "456:"  # If preset has "DEV-", becomes "DEV-456:"
```

### 🎛️ `--preset <name>` | `-P`

Use saved project presets with predefined config values:

- `prepend` - Base prefix text (can be extended with `-p`)
- `style` - Message style preference
- `language` - Output language

```bash
gitty --preset my-company
gitty -P my-company  # Short version

# Extend preset prepend
gitty -P work -p "456:"  # Adds to preset's base prepend
```

### 🔗 `--add-repo`

Link current git repository to specified preset (must be run from repo directory).

```bash
cd ~/work/my-project  # Navigate to your git repo first
gitty -P work --add-repo
# Creates .git/gittyrc.json with {"preset": "work"}

# Now whenever you're in this repo:
gitty -p "456:"  # Reads .git/gittyrc.json → uses work preset automatically
# Self-contained - no global config needed!
```

### 🎨 `--style <style>` | `-s`

Customize the tone and style of commit messages.

**Available options:**

- `concise` - Short and to the point
- `detailed` - Comprehensive descriptions
- `funny` - Add some humor to your commits

```bash
gitty --style detailed
gitty -s detailed  # Short version
```

### 🌐 `--language <lang>` | `-l`

Generate commits in your preferred language.

```bash
gitty --language fr  # French
gitty -l fr          # Short version
gitty -l de          # German
gitty -l it          # Italian
```

### 👀 `--preview` | `-v`

Preview generated messages without committing.

```bash
gitty --preview
gitty -v  # Short version
```

### 🔄 `--regenerate` | `-r`

Generate a fresh set of commit message suggestions.

### 📝 `--edit` | `-e`

Manually edit the selected message before committing.

## 🗂️ Configuration System

### Global Config

**Location**: `~/.gitty/config.json`

```json
{
  "apiKey": "sk-xxx",
  "default": {
    "prepend": "",
    "style": "concise",
    "language": "en"
  },
  "presets": {
    "work": {
      "prepend": "DEV-",
      "style": "detailed",
      "language": "en"
    },
    "freelance": {
      "prepend": "TASK-",
      "style": "concise",
      "language": "en"
    },
    "personal": {
      "prepend": "",
      "style": "funny",
      "language": "en"
    }
  }
}
```

### Local Project Config

Project-specific configuration stored in `.git/gittyrc.json`:

**Example `.git/gittyrc.json`:**

```json
{
  "preset": "work",
  "style": "funny"
}
```

**Config Resolution (hierarchical):**

1. **Start with global preset**: `work` preset from global config
2. **Apply local overrides**: `style: "funny"` overrides preset's style
3. **Result**: Uses work's `prepend` and `language`, but `funny` style

**Fully local config (no preset reference):**

```json
{
  "prepend": "CUSTOM-",
  "style": "detailed",
  "language": "fr"
}
```

- **`preset`**: Optional reference to global preset (inheritance)
- **Local fields**: Override or extend the preset values
- **Location**: `.git/` directory (not tracked by git, personal to each developer)

## 🤖 OpenAI Prompt Template

```
You are an expert software engineer writing Git commit messages.

Given the following git diff, generate 3 high-quality commit messages in the "<style>" tone, in "<language>" language.

The messages should be:
- Clear and relevant to the code changes
- Use present tense
- Avoid references to PRs or developers

Git diff:
<INSERT_DIFF>
```

## 🧸 User Experience

### Interactive Terminal Menu

```
🐥 Gitty Committy reporting for duty!

Here's what I came up with:

  1. DEV-123: Fix null pointer in user avatar
  2. DEV-123: Prevent crash when avatar is missing
  3. DEV-123: Add fallback for missing user image

Pick one:
→ [1] Use this
  [2] Use this
  [3] Use this
  [e] Edit manually
  [r] Regenerate
  [q] Quit
```

## 🔐 Security & Privacy

- 🔒 **Local Storage**: API key stored only locally
- 🚫 **No Tracking**: Global config in `~/.gitty/`, local config in `.git/` (auto-ignored by Git)
- 🕵️ **Zero Telemetry**: No telemetry, ever

## 📋 CLI Reference

| Flag                | Short | Description                                       |
| ------------------- | ----- | ------------------------------------------------- |
| `--set-key`         |       | Save OpenAI API key                               |
| `--add-repo`        |       | Link repo to preset (creates `.git/gittyrc.json`) |
| `--prepend <str>`   | `-p`  | Add text before AI message (extends preset base)  |
| `--preset <name>`   | `-P`  | Load preset from config                           |
| `--style <type>`    | `-s`  | Set style: `concise`, `detailed`, `funny`         |
| `--language <code>` | `-l`  | Output commit message in specified language       |
| `--preview`         | `-v`  | Just show suggestions, don't commit               |
| `--regenerate`      | `-r`  | Ask for new message suggestions                   |
| `--edit`            | `-e`  | Manually edit before committing                   |

## ✅ MVP Checklist

- [ ] Git diff parsing
- [ ] 3 commit message options
- [ ] API key input + local storage
- [ ] Style + prepend + language config
- [ ] Config presets (global + per-project)
- [ ] CLI flags for all overrides
- [ ] Commit selection/editing
- [ ] Packaging for all OSes
- [ ] Auto-detection via preset repos

## ⚙️ Configuration Resolution Order

Gitty merges configuration from multiple sources in this priority order:

1. **CLI flags** (highest priority) - `gitty -s detailed -p "TICKET:"`
2. **`.git/gittyrc.json`** - Local repo overrides
3. **Global preset** - If `preset` field exists in local config
4. **Global defaults** - Fallback values

**Example merge:**

- **Global preset "work"**: `{"prepend": "DEV-", "style": "concise", "language": "en"}`
- **Local `.git/gittyrc.json`**: `{"preset": "work", "style": "funny"}`
- **CLI**: `gitty -p "123:" -l fr`
- **Final result**: `{"prepend": "DEV-123:", "style": "funny", "language": "fr"}`

### 💡 Common Scenarios

**No local config**: Uses global defaults or specified preset

```bash
gitty -P work -p "456:"  # Uses work preset + CLI prepend
```

**Local preset reference**: Inherits from global preset, overrides locally

```bash
# .git/gittyrc.json: {"preset": "work", "style": "funny"}
gitty -p "789:"  # Work preset + funny style + CLI prepend
```

**Fully local config**: No global preset inheritance

```bash
# .git/gittyrc.json: {"prepend": "CUSTOM-", "style": "detailed"}
gitty -p "X:"  # Becomes "CUSTOM-X:" (local prepend + CLI addition)
```

---

<div align="center">

**Made with ❤️ for developers who care about clean commit history**

[Report Bug](https://github.com/your-username/gitty-committy/issues) • [Request Feature](https://github.com/your-username/gitty-committy/issues) • [Documentation](https://gitty.sh/docs)

</div>
