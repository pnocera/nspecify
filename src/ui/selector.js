import chalk from 'chalk';
import { getKeyboard } from './keyboard.js';
import { THEME } from './banner.js';

/**
 * Interactive arrow-key selector matching Python version's behavior
 */
export class Selector {
  constructor(options = {}) {
    this.items = options.items || [];
    this.prompt = options.prompt || 'Select an option';
    this.defaultIndex = options.defaultIndex || 0;
    this.selectedIndex = this.defaultIndex;
    this.keyboard = getKeyboard();
    this.isActive = false;
    this.result = null;
  }

  /**
   * Clear previous output lines
   * @param {number} lines - Number of lines to clear
   */
  clearLines(lines) {
    process.stdout.write('\x1B[2K'); // Clear current line
    for (let i = 0; i < lines; i++) {
      process.stdout.write('\x1B[1A\x1B[2K'); // Move up and clear
    }
  }

  /**
   * Render the selector UI
   * @param {boolean} clear - Whether to clear previous render
   */
  render(clear = true) {
    const lines = [];
    
    // Add prompt with border
    lines.push(''); // Empty line before
    lines.push(chalk.cyan('┌─ ') + chalk.bold(this.prompt) + chalk.cyan(' ─┐'));
    lines.push(chalk.cyan('│') + ' '.repeat(this.prompt.length + 4) + chalk.cyan('│'));
    
    // Add options
    this.items.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      const arrow = isSelected ? chalk.cyanBright('▶') : ' ';
      const text = isSelected 
        ? chalk.cyanBright(`${item.key}: ${item.label}`)
        : chalk.white(`${item.key}: ${item.label}`);
      
      lines.push(chalk.cyan('│ ') + arrow + '  ' + text + ' '.repeat(Math.max(0, this.prompt.length - text.length - 1)) + chalk.cyan('│'));
    });
    
    // Add bottom border
    lines.push(chalk.cyan('│') + ' '.repeat(this.prompt.length + 4) + chalk.cyan('│'));
    lines.push(chalk.cyan('│ ') + chalk.gray('Use ↑/↓ to navigate, Enter to select, Esc to cancel') + chalk.cyan(' │'));
    lines.push(chalk.cyan('└' + '─'.repeat(this.prompt.length + 4) + '┘'));
    
    // Clear previous render if needed
    if (clear && this.previousLineCount) {
      this.clearLines(this.previousLineCount);
    }
    
    // Output new render
    const output = lines.join('\n');
    process.stdout.write(output);
    
    // Store line count for next clear
    this.previousLineCount = lines.length - 1; // -1 because we don't count the first empty line
  }

  /**
   * Handle keyboard input
   * @param {string} key - Key pressed
   */
  handleKey(key) {
    switch (key) {
      case 'up':
        this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
        this.render();
        break;
        
      case 'down':
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        this.render();
        break;
        
      case 'enter':
        this.result = this.items[this.selectedIndex];
        this.isActive = false;
        break;
        
      case 'escape':
        this.result = null;
        this.isActive = false;
        break;
    }
  }

  /**
   * Run the selector and return the selected item
   * @returns {Promise<Object|null>} Selected item or null if cancelled
   */
  async run() {
    this.isActive = true;
    this.previousLineCount = 0;
    
    // Enable raw mode
    this.keyboard.enableRawMode();
    
    // Initial render
    this.render(false);
    
    // Set up key listeners
    const keyHandler = (key) => this.handleKey(key);
    this.keyboard.on('any', keyHandler);
    
    // Wait for selection
    while (this.isActive) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Clean up
    this.keyboard.off('any', keyHandler);
    this.keyboard.disableRawMode();
    
    // Clear the selector UI
    if (this.previousLineCount) {
      this.clearLines(this.previousLineCount);
    }
    
    // Show result or cancellation
    if (this.result) {
      // Suppress explicit selection print as Python version does
      // The caller will handle displaying the result
    } else {
      console.log(chalk.yellow('\nSelection cancelled'));
    }
    
    return this.result;
  }
}

/**
 * Helper function to create and run a selector (matching Python's select_with_arrows)
 * @param {Object} options - Dictionary of options with keys and descriptions
 * @param {string} promptText - Prompt text
 * @param {string} defaultKey - Default option key
 * @returns {Promise<string>} Selected key
 */
export async function selectWithArrows(options, promptText = 'Select an option', defaultKey = null) {
  // Convert options object to array format
  const items = Object.entries(options).map(([key, label]) => ({ key, label }));
  
  // Find default index
  let defaultIndex = 0;
  if (defaultKey) {
    const index = items.findIndex(item => item.key === defaultKey);
    if (index !== -1) {
      defaultIndex = index;
    }
  }
  
  // Create and run selector
  const selector = new Selector({
    items,
    prompt: promptText,
    defaultIndex
  });
  
  const result = await selector.run();
  
  if (!result) {
    process.exit(1); // Match Python behavior on cancel
  }
  
  return result.key;
}

/**
 * State management for selection
 */
export class SelectionState {
  constructor(items = []) {
    this.items = items;
    this.selectedIndex = 0;
    this.history = [];
  }

  /**
   * Move cursor up
   */
  moveUp() {
    this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
    this.history.push({ action: 'up', index: this.selectedIndex });
  }

  /**
   * Move cursor down
   */
  moveDown() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    this.history.push({ action: 'down', index: this.selectedIndex });
  }

  /**
   * Get current selection
   * @returns {Object} Current item
   */
  getCurrent() {
    return this.items[this.selectedIndex];
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.selectedIndex = 0;
    this.history = [];
  }
}

/**
 * Visual feedback helpers
 */
export const feedback = {
  /**
   * Flash selection feedback
   * @param {string} text - Text to flash
   */
  flash: async (text) => {
    process.stdout.write(chalk.inverse(text));
    await new Promise(resolve => setTimeout(resolve, 100));
    process.stdout.write('\r' + text);
  },
  
  /**
   * Show selection animation
   * @param {string} text - Selected text
   */
  selected: (text) => {
    console.log(chalk.green('✓ ') + chalk.bold(text));
  },
  
  /**
   * Show cancellation
   */
  cancelled: () => {
    console.log(chalk.yellow('✗ Selection cancelled'));
  }
};