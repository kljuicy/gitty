// Dark mode toggle
const darkModeToggle = document.getElementById('dark-mode-toggle');
const html = document.documentElement;

// Check for saved theme or default to light
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  html.classList.toggle('dark', savedTheme === 'dark');
} else {
  // Check system preference
  html.classList.toggle(
    'dark',
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

darkModeToggle.addEventListener('click', () => {
  html.classList.toggle('dark');
  localStorage.setItem(
    'theme',
    html.classList.contains('dark') ? 'dark' : 'light'
  );
});

// Interactive CLI Demo
class GittyDemo {
  constructor() {
    this.terminalDemo = document.getElementById('terminal-demo');
    this.demoRestart = document.getElementById('demo-restart');
    this.currentStep = 0;
    this.isWaitingForInput = false;
    this.regenerationCount = 0;
    this.currentInput = null; // Store reference to current input
    this.demoState = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      style: 'concise',
      selectedCommit: null,
    };

    this.init();
    this.setupIntersectionObserver();
  }

  setupIntersectionObserver() {
    // Focus input when demo section comes into view
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && this.currentInput) {
            this.currentInput.focus();
          }
        });
      },
      { threshold: 0.5 }
    );

    const demoSection = document.getElementById('demo');
    if (demoSection) {
      observer.observe(demoSection);
    }
  }

  init() {
    this.terminalDemo.classList.add('demo-terminal');
    this.demoRestart.addEventListener('click', () => this.restart());
    this.start();
  }

  restart() {
    this.currentStep = 0;
    this.isWaitingForInput = false;
    this.regenerationCount = 0;
    this.demoState.selectedCommit = null;
    this.terminalDemo.innerHTML = '';
    this.start();
  }

  async start() {
    await this.addLine('command', '$ gitty', 800);
    await this.addLine('output', '', 200);
    await this.addLine('output', ' 🐥 Gitty', 100);
    await this.addLine(
      'output',
      '    Your cute lil AI-powered Git sidekick',
      100
    );
    await this.addLine('output', '', 300);

    await this.showChanges();
    await this.askToGenerate();
  }

  async showChanges() {
    await this.addLine('section', '📋 Changes to be committed', 500);
    await this.addLine(
      'output',
      '──────────────────────────────────────────────────',
      100
    );
    await this.addLine('output', '', 100);
    await this.addLine(
      'output',
      'Stats: 15 additions(+), 3 deletions(-), 2 file(s) changed',
      200
    );
    await this.addLine('output', '', 100);
    await this.addLine('output', 'Files:', 100);
    await this.addLine('output', '  • src/components/UserProfile.tsx', 150);
    await this.addLine('output', '  • src/utils/validation.ts', 150);
    await this.addLine('output', '', 300);
  }

  async askToGenerate() {
    const promptLine = await this.addLine(
      'prompt',
      '? Generate commit message for these changes? (Y/n)',
      300
    );

    // Add highlighting to make it clear this is interactive
    promptLine.classList.add('demo-prompt-highlight');
    promptLine.style.cursor = 'pointer';

    // Make the prompt clickable for Y response
    promptLine.addEventListener('click', () => {
      if (this.isWaitingForInput) {
        this.handleGenerateChoice('y');
        this.isWaitingForInput = false;
        // Remove the highlighting once clicked
        promptLine.classList.remove('demo-prompt-highlight');
      }
    });

    this.isWaitingForInput = true;
    this.createTextInput(input => {
      this.isWaitingForInput = false;
      // Remove the highlighting once input is given
      promptLine.classList.remove('demo-prompt-highlight');
      this.handleGenerateChoice(input);
    });
  }

  async handleGenerateChoice(input) {
    const response = input.toLowerCase().trim();
    await this.addLine('input', input, 200);

    if (response === 'n' || response === 'no') {
      await this.addLine('output', '', 200);
      await this.addLine('output', '❌ Operation cancelled', 300);
      await this.addLine('output', '', 500);
      return;
    }

    await this.addLine('output', '', 200);
    await this.showAIConfig();
    await this.generateMessages();
  }

  async showAIConfig() {
    await this.addLine('section', '🤖 AI Configuration', 300);
    await this.addLine('config', 'Provider     : OpenAI', 150);
    await this.addLine('config', 'Model        : gpt-4o-mini', 150);
    await this.addLine('config', 'Temperature  : 0.7', 150);
    await this.addLine('config', 'Style        : concise', 150);
    await this.delay(800);
  }

  async generateMessages() {
    await this.addLine('output', '', 300);

    // Animated loading
    const loadingLine = document.createElement('div');
    loadingLine.className = 'text-gitty-mint flex items-center';

    const spinner = document.createElement('span');
    spinner.className = 'spinner mr-2';
    spinner.textContent = '⠋';

    const loadingText = document.createElement('span');
    loadingText.textContent = 'Generating commit messages...';

    loadingLine.appendChild(spinner);
    loadingLine.appendChild(loadingText);
    this.terminalDemo.appendChild(loadingLine);
    this.scrollToBottom();

    // Animate spinner
    const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let spinnerIndex = 0;
    const spinnerInterval = setInterval(() => {
      spinner.textContent = spinnerChars[spinnerIndex];
      spinnerIndex = (spinnerIndex + 1) % spinnerChars.length;
    }, 100);

    await this.delay(2500);
    clearInterval(spinnerInterval);

    loadingLine.innerHTML =
      '<span class="text-green-400">✓ Messages generated successfully!</span>';

    await this.delay(300);
    await this.showCommitChoices();
  }

  getCommitChoices() {
    const baseChoices = [
      {
        confidence: 92,
        message: 'feat: add email validation to user profile form',
      },
      {
        confidence: 88,
        message: 'feat: implement user profile validation with email check',
      },
      {
        confidence: 85,
        message: 'add: user profile form validation and email verification',
      },
    ];

    const funnyChoices = [
      [
        {
          confidence: 94,
          message: 'feat: make emails behave or else 😤',
        },
        {
          confidence: 89,
          message:
            'fix: stop users from typing "email@example.com" unironically',
        },
        {
          confidence: 87,
          message:
            'feat: email validation because apparently we need to babysit inputs',
        },
      ],
      [
        {
          confidence: 91,
          message: 'feat: teach the form some manners with email validation',
        },
        {
          confidence: 86,
          message: 'refactor: added email validation (yes, AGAIN) 🙄',
        },
        {
          confidence: 83,
          message: 'feat: email police reporting for duty 👮‍♀️',
        },
      ],
    ];

    if (this.regenerationCount === 0) {
      return baseChoices;
    } else if (this.regenerationCount <= 2) {
      return funnyChoices[this.regenerationCount - 1];
    } else {
      // For subsequent regenerations, mix it up
      return [
        {
          confidence: 88,
          message: 'feat: validation vibes only ✨',
        },
        {
          confidence: 92,
          message: 'fix: made emails less chaotic',
        },
        {
          confidence: 85,
          message: 'feat: email validation (the remix) 🎵',
        },
      ];
    }
  }

  async showCommitChoices() {
    await this.addLine('output', '', 200);
    await this.addLine('prompt', '? Select a commit message:', 300);

    const choices = this.getCommitChoices();

    choices.forEach((choice, index) => {
      const choiceElement = document.createElement('div');
      choiceElement.className =
        'demo-choice text-gray-300 ml-4 flex items-center';

      const indexSpan = document.createElement('span');
      indexSpan.className = 'text-gitty-mint mr-3 font-bold';
      indexSpan.textContent = `${index + 1})`;

      const confidenceBar = document.createElement('div');
      confidenceBar.className = 'confidence-bar';

      const confidenceFill = document.createElement('div');
      confidenceFill.className = `confidence-fill ${choice.confidence >= 90 ? 'confidence-high' : choice.confidence >= 85 ? 'confidence-medium' : 'confidence-low'}`;
      confidenceFill.style.width = '0%';

      confidenceBar.appendChild(confidenceFill);

      const messageSpan = document.createElement('span');
      messageSpan.textContent = `[${choice.confidence}%] ${choice.message}`;

      choiceElement.appendChild(indexSpan);
      choiceElement.appendChild(confidenceBar);
      choiceElement.appendChild(messageSpan);

      choiceElement.addEventListener('click', () =>
        this.selectCommit(index, choice)
      );

      this.terminalDemo.appendChild(choiceElement);

      // Animate confidence bar
      setTimeout(
        () => {
          confidenceFill.style.width = `${choice.confidence}%`;
        },
        100 + index * 200
      );
    });

    await this.delay(800);
    await this.addLine(
      'separator',
      '────────────────────────────────────────',
      100
    );

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'ml-4 space-y-2';

    const editBtn = this.createButton('✏️ Edit selected message', '', () =>
      this.editMessage()
    );
    const regenBtn = this.createButton('🔄 Generate new suggestions', '', () =>
      this.regenerateMessages()
    );
    const cancelBtn = this.createButton('❌ Cancel commit', '', () =>
      this.cancelCommit()
    );

    optionsContainer.appendChild(editBtn);
    optionsContainer.appendChild(regenBtn);
    optionsContainer.appendChild(cancelBtn);

    this.terminalDemo.appendChild(optionsContainer);
    this.scrollToBottom();
  }

  async selectCommit(index, choice) {
    this.demoState.selectedCommit = choice;
    this.disableAllInteractive();

    // Highlight selected choice
    const choices = this.terminalDemo.querySelectorAll('.demo-choice');
    choices.forEach((el, i) => {
      if (i === index) {
        el.classList.add('selected');
        el.innerHTML = `❯ ${el.innerHTML}`;
      } else {
        el.classList.add('disabled');
      }
    });

    await this.delay(500);
    await this.confirmCommit();
  }

  async confirmCommit() {
    await this.addLine('output', '', 300);
    await this.addLine('section', '📝 Final commit message', 200);
    await this.addLine('commit', this.demoState.selectedCommit.message, 300);
    await this.addLine('output', '', 200);

    await this.addLine(
      'prompt',
      '? Create commit with this message? (Y/n)',
      300
    );

    this.createTextInput(input => this.handleCommitConfirmation(input));
  }

  async handleCommitConfirmation(input) {
    await this.addLine('input', input, 200);
    const response = input.toLowerCase().trim();

    if (response === 'n' || response === 'no') {
      await this.showCommitChoices();
      return;
    }

    await this.createCommit();
  }

  async createCommit() {
    await this.addLine('output', '', 200);
    await this.addLine('success', '🎉 Commit created successfully!', 300);
    await this.addLine('output', '', 100);
    await this.addLine('section', '📝 Committed with message', 200);
    await this.addLine('commit', this.demoState.selectedCommit.message, 300);
    await this.addLine('output', '', 500);
  }

  async editMessage() {
    this.disableAllInteractive();
    await this.addLine('output', '', 200);
    await this.addLine('section', '✏️ Edit commit message', 200);
    await this.addLine('prompt', 'Enter your commit message:', 200);

    this.createTextInput(input => {
      if (input.trim()) {
        this.demoState.selectedCommit = {
          message: input.trim(),
          confidence: 100,
        };
        this.confirmCommit();
      } else {
        this.addLine('output', '❌ Empty message. Please try again.', 300);
        this.editMessage();
      }
    }, this.demoState.selectedCommit?.message || '');
  }

  async regenerateMessages() {
    this.disableAllInteractive();
    this.regenerationCount++;

    // Remove existing choices and options
    const existingChoices = this.terminalDemo.querySelectorAll(
      '.demo-choice, .ml-4.space-y-2, .text-gray-600.ml-4'
    );
    existingChoices.forEach(el => el.remove());

    await this.addLine('output', '', 200);
    await this.generateMessages();
  }

  async cancelCommit() {
    this.disableAllInteractive();
    await this.addLine('output', '', 200);
    await this.addLine('output', '❌ Operation cancelled', 300);
  }

  createButton(text, variant, onClick) {
    const button = document.createElement('button');
    button.className = `demo-button ${variant}`;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }

  createTextInput(onSubmit, defaultValue = '') {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'ml-4 mt-2 flex items-center space-x-2';

    const promptSpan = document.createElement('span');
    promptSpan.className = 'text-gitty-terminal';
    promptSpan.textContent = '> ';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'demo-input flex-1';
    input.value = defaultValue;
    input.style.background = 'transparent';
    input.style.border = 'none';
    input.style.outline = 'none';
    input.style.color = '#00f5d4';

    // Store reference to current input
    this.currentInput = input;

    inputContainer.appendChild(promptSpan);
    inputContainer.appendChild(input);

    this.terminalDemo.appendChild(inputContainer);

    // Ensure the input is visible with a small delay
    setTimeout(() => {
      this.scrollToBottom();
      // Focus will be handled by intersection observer
    }, 50);

    const handleSubmit = () => {
      if (input.value.trim() || defaultValue) {
        input.disabled = true;
        input.style.opacity = '0.7';
        this.currentInput = null; // Clear reference when input is done
        onSubmit(input.value || defaultValue);
      }
    };

    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    });
  }

  async addLine(type, text, delay = 0) {
    if (delay) await this.delay(delay);

    const line = document.createElement('div');
    line.className = 'slide-in';

    switch (type) {
      case 'command':
        line.className += ' text-gitty-terminal';
        break;
      case 'output':
        line.className += ' text-gray-300';
        break;
      case 'section':
        line.className += ' text-gitty-mint font-semibold';
        break;
      case 'config':
        line.className += ' text-blue-400 ml-4';
        break;
      case 'prompt':
        line.className += ' text-yellow-400';
        break;
      case 'input':
        line.className += ' text-gitty-terminal ml-2';
        text = '> ' + text;
        break;
      case 'success':
        line.className += ' text-green-400';
        break;
      case 'commit':
        line.className += ' text-gitty-yellow font-semibold';
        break;
      case 'separator':
        line.className += ' text-gray-600 ml-4';
        break;
    }

    line.textContent = text;
    this.terminalDemo.appendChild(line);
    this.scrollToBottom();

    return line;
  }

  disableAllInteractive() {
    const interactive = this.terminalDemo.querySelectorAll(
      '.demo-choice, .demo-button, .demo-input'
    );
    interactive.forEach(el => {
      el.classList.add('disabled');
      el.style.pointerEvents = 'none';
    });
  }

  scrollToBottom() {
    this.terminalDemo.scrollTop = this.terminalDemo.scrollHeight;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize demo when page loads
document.addEventListener('DOMContentLoaded', () => {
  new GittyDemo();
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });
});
