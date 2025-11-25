# 🐥 Gitty

> _"That commit? mid. Let Gitty fix it."_

[![npm version](https://img.shields.io/npm/v/@kljuicy/gitty.svg)](https://www.npmjs.com/package/@kljuicy/gitty)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform Support](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)](https://gitlab.com/kljuicy/gitty)

---

> 🐥 **Gitty says:** "Let's make that message not suck."

**Gitty** is your snarky, AI-powered CLI bestie that helps you write commit messages that don't make your team cringe. Highly tested, cross-platform, and full of personality — it's the helpful pal Git never had. Because one does not simply "update code".

**🤖 Choose Your AI Vibe:**

- **OpenAI** (GPT-4o-mini, GPT-4o, GPT-3.5-turbo)
- **Google Gemini** (Gemini 2.5 Flash, Gemini 1.5 Flash, Gemini 1.5 Pro, Gemini 3.0 Pro)

## ✨ Why Gitty?

> 🐥 **Gitty says:** "Let me tell you why we're gonna be besties!"

Ever stared at your Git diff wondering how to explain your 3 AM coding spree? That's where I come in! I'm not just another Git tool – I'm your commit message hype person, powered by AI but with actual personality.

### What Makes Me Special?

**🎯 Smart Commits That Don't Suck**  
I turn your chaotic diffs into poetry. No more "updated stuff" commits – we're better than that! I analyze your changes and craft messages that actually make sense.

**🎨 Your Style, Your Rules**  
Like your commits short and sweet? Or detailed enough to write a novel? I adapt to your style. Keep your commit game as unique as your playlist, just... you know, readable.

**🚀 Zero Hassle Setup**  
Because life's complicated enough already. Quick install, easy config, and you're ready to commit like a pro. Works everywhere – macOS, Linux, Windows, your grandma's computer (probably).

**📋 Different Vibes for Different Projects**  
Work mode? Personal project? Each needs its own flavor. My presets let you switch between professional and fun faster than you can say "git commit".

**🤖 AI Provider? Your Choice!**  
Switch between OpenAI and Gemini like a DJ switching tracks. Use what works best for you, when you want it. No commitment issues here!

**🧪 Rock-Solid Reliability**  
More test coverage than your code (probably). I take my job seriously, even if I don't take myself seriously.

**🧸 Making Git Fun Again**  
Because Git doesn't have to be boring. I bring personality to your terminal, one commit at a time.

## 🔧 Tech Stack

| Layer                 | The Good Stuff                          |
| --------------------- | --------------------------------------- |
| **Language**          | TypeScript (Node.js)                    |
| **CLI Framework**     | commander                               |
| **Prompting**         | inquirer                                |
| **AI Providers**      | OpenAI API, Google Generative AI        |
| **Git Integration**   | simple-git                              |
| **Config Management** | Custom config in `~/.gitty/config.json` |
| **Packaging**         | npm install -g                          |
| **Cross-Platform**    | Runs everywhere (like your anxiety)     |

## 📦 Installation

> 🐥 **Gitty says:** "Let's get you set up, bestie!"

### Requirements

- Node.js 22+ (Current LTS - v22.16.0)
- Git installed and ready to party
- API key for at least one AI provider (OpenAI or Gemini)

#### Windows Users

> 🐥 **Gitty says:** "Windows users, I gotchu!"

- Git for Windows (includes Git Bash): https://git-scm.com/download/win
- Or use Windows Subsystem for Linux (WSL)
- Works in Command Prompt, PowerShell, and Git Bash

### Install via NPM (Recommended)

```bash
npm install -g @kljuicy/gitty  # Let's gooo! 🚀
```

## 🔑 AI Provider Setup

> 🐥 **Gitty says:** "Pick your AI bestie (or use both, I don't judge)"

Gitty supports both OpenAI and Google Gemini. You can use either or both providers.

### Option 1: OpenAI Setup

1. [Sign up or log in to OpenAI](https://platform.openai.com)
2. Add a payment method ([Billing Settings](https://platform.openai.com/settings/organization/billing/overview))
3. [Create an API key](https://platform.openai.com/api-keys) (starts with `sk-`)
4. Set up your key in Gitty:
   ```bash
   gitty --set-key --provider openai
   # or
   export OPENAI_API_KEY="sk-proj-your-key-here"
   ```

### Option 2: Google Gemini Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API key"
3. Copy your API key
4. Set up your key in Gitty:
   ```bash
   gitty --set-key --provider gemini
   # or
   export GEMINI_API_KEY="your-gemini-key-here"
   ```

### Set Default Provider

```bash
gitty --set-provider  # Choose your vibe
```

**Security Best Practices:**

> 🐥 **Gitty says:** "Keep those keys safe, fam!"

- Never share your API keys (treat them like passwords)
- Keys are stored locally in `~/.gitty/config.json` (never in Git repos)
- Set spending limits in provider dashboards
- Monitor usage in provider dashboards
- No telemetry, no tracking, keys only sent to chosen provider

## 💰 Cost & Model Vibes

> 🐥 **Gitty says:** "Let me help you pick the perfect AI bestie for your wallet!"

### ✨ Pick Your Perfect Match

| Vibe Check        | AI Bestie                    | Why Though?                                    |
| ----------------- | ---------------------------- | ---------------------------------------------- |
| 💼 Daily Grind    | `gpt-4o-mini`                | Fast & cheap, like your favorite instant ramen |
| 🚨 Critical Stuff | `gpt-4o` or `gemini-3.0-pro` | When you need that pixel-perfect commit        |
| 🆓 Free Spirit    | `gemini-2.5-flash`           | No cost, just vibes (default for Gemini)       |

### 💸 The Money Talk

> 🐥 **Gitty says:** "Cheaper than your coffee addiction, I promise!"

#### 🍜 Daily Commits (gpt-4o-mini)

Perfect for: "Just ship it" energy

- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- Per Commit\*: ~$0.0003 (that's like, nothing)

#### 🎯 Critical Commits

When you need that extra _chef's kiss_

**OpenAI (gpt-4o)**

- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens
- Per Commit\*: ~$0.004

**Gemini 1.5 Pro**

- Input: $1.25 per 1M tokens
- Output: $5.00 per 1M tokens
- Per Commit\*: ~$0.002

**Gemini 3.0 Pro** (Latest & Most Powerful)

- Input: $2.00-$4.00 per 1M tokens
- Output: $12.00-$18.00 per 1M tokens
- Per Commit\*: ~$0.004-$0.009
- ⚠️ More expensive, but most capable

#### 🆓 Budget Bestie (gemini-2.5-flash) (Default for Gemini)

For the "I'm not paying for commits" crowd

- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- Per Commit\*: ~$0.0001 (basically free)
- ✅ Latest stable Flash model - fast & affordable

\*_Based on average diff of 1000 tokens + 500 token response_

### 🎯 Pro Tips for the Penny-Pinchers

> 🐥 **Gitty says:** "Let me help you save those coins!"

- 💡 Use `gpt-4o-mini` for your daily commits
- 🚀 Save the fancy models for the big feature releases
- 🌟 Try Gemini Flash when you're feeling frugal
- 📝 Lower `maxTokens` if you like it short and sweet
- 🎨 Use presets to auto-pick the right model for each project
- 🌡️ Lower temperature for shorter messages: `gitty -t 0.3`

Remember: You can switch models on the fly with `-m` flag:

```bash
# Everyday commits
gitty -m gpt-4o-mini

# That big refactor you're proud of
gitty -m gpt-4o

# Latest & greatest (but more expensive)
gitty -m gemini-3.0-pro --provider gemini

# When the budget is tight (default for Gemini)
gitty -m gemini-2.5-flash --provider gemini
```

## 🚀 Getting Started

> 🐥 **Gitty says:** "Let's get this party started!"

1. Install and set up your preferred AI provider:

   ```bash
   # Quick setup with OpenAI
   gitty --set-key --provider openai

   # Or use Gemini (free tier available)
   gitty --set-key --provider gemini
   gitty --set-provider  # Set as default
   ```

2. Try it out in your git repo:

   ```bash
   cd your-git-repo
   gitty
   # Generates 3 commit message options from your current git diff
   ```

3. (Optional) Set up project presets:
   ```bash
   gitty -P work --add-repo
   # Links this repo to the 'work' preset for automatic detection
   ```

See the [CLI Reference](#cli-reference) below for all available flags and options.

## ⚙️ Configuration & Presets

> 🐥 **Gitty says:** "Make me work how you work"

Gitty uses a layered configuration system:

1. **CLI flags** (highest priority)
2. **Local repo config**: `.git/gittyrc.json` (per-repo overrides)
3. **Global presets**: `~/.gitty/config.json` (named presets)
4. **Global defaults**

**Example global config (`~/.gitty/config.json`):**

```json
{
  "defaultProvider": "openai",
  "providers": {
    "openai": {
      "apiKey": "sk-personal-key",
      "model": "gpt-4o-mini",
      "temperature": 0.7,
      "maxTokens": 500
    },
    "gemini": {
      "apiKey": "personal-gemini-key",
      "model": "gemini-2.5-flash",
      "temperature": 0.7,
      "maxTokens": 2048
    }
  },
  "default": {
    "prepend": "",
    "style": "concise",
    "language": "en"
  },
  "presets": {
    "work": {
      "prepend": "DEV-",
      "style": "detailed",
      "language": "en",
      "defaultProvider": "gemini",
      "providers": {
        "openai": {
          "apiKey": "sk-work-billing-key",
          "temperature": 0.5,
          "model": "gpt-4o-mini"
        },
        "gemini": {
          "apiKey": "work-gemini-key",
          "temperature": 0.5,
          "model": "gemini-2.5-flash"
        }
      }
    }
  }
}
```

**Example local config (`.git/gittyrc.json` in your project's root folder):**

```json
{
  "preset": "work",
  // Local overrides:
  "style": "funny",
  "defaultProvider": "openai",
  "providers": {
    "openai": {
      "apiKey": "sk-project-specific-key",
      "model": "gpt-4o"
    }
  }
}
```

- If `preset` is set, local config inherits from the named global preset.
- Any field in local config overrides the preset/global value.
- You can also use a fully local config with no preset reference.

**Config resolution order:** CLI flags > local config > preset > global defaults.

### 🏷️ Prepend Behavior

Prepend text appears before your AI-generated commit message. Gitty supports two prepend modes:

#### Append Mode (Default)

- CLI prepend **adds to** the resolved prepend from config hierarchy
- Useful for adding ticket numbers or short tags

```bash
# Preset has: prepend: "PROJ-"
gitty -P work -p "123"        # Result: "PROJ-123 <AI message>"
gitty -P work -p "URGENT-"    # Result: "PROJ-URGENT- <AI message>"
```

#### Force Mode

- CLI prepend **replaces** the entire resolved prepend
- Useful for hotfixes, special commits, or temporary overrides

```bash
# Preset has: prepend: "PROJ-"
gitty -P work -p "HOTFIX-" -f # Result: "HOTFIX- <AI message>"
gitty -P work -p "" -f        # Result: "<AI message>" (no prepend)
```

**Examples:**

```bash
# Normal workflow: append ticket numbers
gitty -P work -p "456"        # "PROJ-456 fix: update user validation"

# Emergency situation: completely override
gitty -P work -p "URGENT-" -f # "URGENT- fix: critical security issue"

# One-off commit: remove prepend entirely
gitty -P work -p "" -f        # "refactor: clean up helper functions"
```

### ✨ **API Key Override Hierarchy**

API keys are resolved in this priority order:

1. **Local config** → `.git/gittyrc.json` provider API key (highest priority)
2. **Preset config** → Global preset provider API key
3. **Global config** → Global provider API key
4. **Environment variables** → `OPENAI_API_KEY`, `GEMINI_API_KEY` (fallback)

**Example scenarios:**

- **Personal projects**: Use personal API keys from global config
- **Work projects**: Override with company billing keys in work preset
- **Specific project**: Override with project-specific key in local config
- **Team collaboration**: Each developer has their own local API key override

## ⚡ Usage Examples

> 🐥 **Gitty says:** "Watch and learn, bestie!"

```bash
# Basic usage - let's keep it simple
gitty

# Switch up the AI vibe
gitty --provider gemini  # Try Gemini's fresh takes
gitty --provider openai  # Classic OpenAI energy

# Link to your work preset (because profesh)
gitty -P work --add-repo

# Add your ticket number (management loves this)
gitty -P work -p "123"

# URGENT? I got you
gitty -P work -p "HOTFIX-" -f

# Feeling fancy? Try different models
gitty -m gpt-4o-mini -t 0.3
gitty -m gemini-3.0-pro --provider gemini  # Latest & powerful
gitty -m gemini-1.5-pro --provider gemini  # Good balance
gitty -m gemini-2.5-flash --provider gemini # Budget-friendly (default)

# Mamma mia! Generate in Italian 🤌
gitty -l it

# Mix and match like a pro
gitty --provider gemini -m gemini-2.5-flash
gitty --provider openai -m gpt-4o
```

## 🧰 Core Features

> 🐥 **Gitty says:** "Everything you need, nothing you don't"

- **AI commit message generation** from your Git diff
- **Multiple AI providers** (OpenAI and Google Gemini)
- **Multiple message options** with interactive selection
- **Customizable style, language, and prepend**
- **Project presets** for different workflows
- **Secure API key storage**
- **Provider-specific optimizations**
- **Comprehensive test coverage** with excellent branch coverage
- **No telemetry, no tracking**

## 📋 CLI Reference

> 🐥 **Gitty says:** "All the commands you'll ever need (and then some)"

### Commands (One-Time Setup)

| Command                       | Description                               |
| ----------------------------- | ----------------------------------------- |
| `--set-key --provider <name>` | Save API key for provider (openai/gemini) |
| `--set-provider`              | Choose your default AI provider           |
| `--add-repo -P <preset>`      | Link current repo to a preset             |

### Generation Options (Daily Usage)

| Flag                | Short | Description                                        |
| ------------------- | ----- | -------------------------------------------------- |
| `--preset <name>`   | `-P`  | Use a specific preset configuration                |
| `--provider <name>` |       | Override provider (openai/gemini)                  |
| `--prepend <str>`   | `-p`  | Add prefix to commit message                       |
| `--force-prepend`   | `-f`  | Replace entire prefix instead of appending         |
| `--style <type>`    | `-s`  | Set style: `concise`, `detailed`, `funny`          |
| `--language <code>` | `-l`  | Language for commit message (2-letter code)        |
| `--model <model>`   | `-m`  | Override AI model (provider-specific)              |
| `--temperature <t>` | `-t`  | AI creativity (0-2, default: 0.7)                  |
| `--max-tokens <n>`  |       | Response length limit (default varies by provider) |

### Execution Options

| Flag        | Short | Description                         |
| ----------- | ----- | ----------------------------------- |
| `--preview` | `-v`  | Show suggestions without committing |

### 🔗 Flag Dependencies & Combinations

Some flags require others to work properly:

| Primary Flag      | Required Dependency | Example                             |
| ----------------- | ------------------- | ----------------------------------- |
| `--set-key`       | `--provider`        | `gitty --set-key --provider openai` |
| `--force-prepend` | `--prepend`         | `gitty -p "HOTFIX-" -f`             |
| `--add-repo`      | `--preset`          | `gitty --add-repo -P work`          |

### 📝 Common Usage Patterns

```bash
# Setup commands (one-time)
gitty --set-key --provider openai          # Configure OpenAI API key
gitty --set-key --provider gemini          # Configure Gemini API key
gitty --set-provider                       # Set default provider interactively
gitty --add-repo -P work                   # Link current repo to 'work' preset

# Daily usage (generation)
gitty                                      # Generate commit with defaults
gitty -P work                              # Use work preset
gitty -p "PROJ-123"                        # Add prefix (appends to preset)
gitty -p "HOTFIX-" -f                      # Force replace entire prepend
gitty --provider gemini -m gemini-3.0-pro # Override provider & model (latest)
gitty -l it -s detailed                   # Italian detailed commits
gitty -t 0.3 --max-tokens 200              # Lower creativity, shorter messages

# Execution control
gitty -v                                   # Preview only, don't commit
gitty -P work -p "123" -v                  # Preview with work preset + ticket
```

**Provider-specific models:**

- **OpenAI**: `gpt-4o-mini` (default), `gpt-4o`, `gpt-3.5-turbo`
- **Gemini**: `gemini-2.5-flash` (default), `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-3.0-pro`

## 🧸 User Experience

> 🐥 **Gitty says:** "Making Git fun since... well, just now!"

Interactive terminal menu with diff preview, message selection, and editing options. Because commit messages should spark joy. ✨

## License

> 🐥 **Gitty says:** "Free as in freedom (and beer)!"

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🦊 Real Talk: GitLab is Home

> 🐥 **Gitty says:** "Let me spill some tea about where the magic happens!"

**The Truth:** All the real development, CI/CD pipelines, issues, and actual work happens on [GitLab](https://gitlab.com/kljuicy/gitty). That's where I live, breathe, and get my commits together.

**GitHub?** Oh, that's just our cool kid mirror so we can hang with the popular crowd. You know how it is – gotta be where the people are! 😎

**Want to contribute?** Head over to [GitLab](https://gitlab.com/kljuicy/gitty) where the real party is. Issues, MRs, discussions – it's all there. GitHub is just for the gram, baby! 📸

---

<div align="center">

**Cute commits. Clean history.**

[Report Bug](https://gitlab.com/kljuicy/gitty/-/issues) • [Request Feature](https://gitlab.com/kljuicy/gitty/-/issues) • [Documentation](https://gitlab.com/kljuicy/gitty#readme)

_Vibecoded with ❤️ for devs who care about clean commit history_

</div>
