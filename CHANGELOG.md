# @kljuicy/gitty

## 1.0.1

### Patch Changes

- !8 - GITTY#TECH: General after release cleanup

## 1.0.0

### Major Changes

- !6 - # 🎉 Initial Release of Gitty (#1 #2 #4)  
  Your cute lil AI-powered Git sidekick is here!

  ## Features

  - 🤖 **AI-powered commit messages** using OpenAI GPT models
  - 🎯 **Smart suggestions** with confidence scores
  - 🎨 **Multiple styles**: concise, detailed, or funny
  - 🌍 **Multi-language support**
  - 📋 **Project presets** for consistent formatting
  - 🔧 **Configurable** OpenAI settings (model, temperature, tokens)
  - 🚀 **Fast & interactive** terminal UI
  - 💾 **Local config** per repository
  - 🔄 **Retry mechanism** for robust AI responses
  - 🎭 **Interactive prepend** for ticket numbers

  ## Getting Started

  ```bash
  npm install -g gitty-committy
  gitty --set-key
  gitty
  ```

  Perfect for developers who care about clean commit history!

### Patch Changes

- !6 - GITTY-003 ci: restructure pipeline stages and add release preparation (#1 #2 #4)
- !6 - 🚀 Major UX & Testing Infrastructure Overhaul (#1 #2 #4)  
  **🧪 Test Suite Transformation:**

  - Expanded from basic tests to comprehensive 107-test suite (100% passing)
  - Added extensive CLI validation testing with smart error suggestions
  - Implemented interactive flows testing with SIGINT handling
  - Enhanced configuration management testing across all scenarios
  - Added menu system and user flow validation

  **✨ CLI Validation & UX Improvements:**

  - Smart parameter validation with educational error messages
  - Intelligent typo suggestions (gpt→openai, google→gemini, brief→concise)
  - Early validation prevents expensive API calls on user mistakes
  - Helpful error messages with emojis, colors, and actionable examples
  - Temperature validation with creativity guidance (0-2 range)
  - Max tokens validation with reasonable limits

  **🛡️ Enhanced Error Handling:**

  - Context-aware error recovery messages
  - Graceful SIGINT handling across all interactive flows
  - Improved git integration error scenarios
  - Better API error handling with user guidance

  **📊 CI/CD & Coverage Integration:**

  - Added comprehensive coverage collection to GitLab pipeline
  - Integrated Cobertura coverage reports for badge automation
  - Fixed coverage regex pattern for accurate percentage extraction
  - 30-day coverage artifact retention with HTML reports

  **🧹 Technical Cleanup:**

  - Eliminated code duplication and improved maintainability
  - Improved UI organization with better separation of concerns
  - Backward-compatible refactoring for modern development patterns

  This update transforms Gitty from a basic tool into a polished, user-friendly CLI with comprehensive testing, smart validation, and excellent error handling.

- !6 - GITTY#4: Fixed integration tests to work reliably again. Resolved EPIPE errors in test framework, centralized test strings for maintainability, and aligned test expectations with actual application behavior. All 41 integration tests now pass consistently. (#1 #2 #4)
