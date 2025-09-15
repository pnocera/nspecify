import readline from 'readline';

/**
 * Keyboard input handler for terminal interactions
 * Handles arrow keys, Enter, Escape, and Ctrl+C
 */
export class KeyboardHandler {
  constructor() {
    this.isRawMode = false;
    this.listeners = new Map();
    this.keyBuffer = [];
    this.debounceTimer = null;
    this.debounceDelay = 50; // milliseconds
  }

  /**
   * Enable raw mode for capturing individual keystrokes
   */
  enableRawMode() {
    if (this.isRawMode) return;
    
    // Set up raw mode
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    
    // Add keypress listener
    process.stdin.on('keypress', this.handleKeypress.bind(this));
    
    this.isRawMode = true;
  }

  /**
   * Disable raw mode and restore normal terminal behavior
   */
  disableRawMode() {
    if (!this.isRawMode) return;
    
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.stdin.removeAllListeners('keypress');
    
    this.isRawMode = false;
  }

  /**
   * Handle individual keypress events
   * @param {string} str - Character pressed
   * @param {Object} key - Key object with metadata
   */
  handleKeypress(str, key) {
    // Handle Ctrl+C
    if (key && key.ctrl && key.name === 'c') {
      this.disableRawMode();
      process.exit(0);
    }

    // Add to key buffer for debouncing
    this.keyBuffer.push({ str, key });
    
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Set new timer for debouncing rapid inputs
    this.debounceTimer = setTimeout(() => {
      this.processKeyBuffer();
    }, this.debounceDelay);
  }

  /**
   * Process accumulated keys from buffer
   */
  processKeyBuffer() {
    if (this.keyBuffer.length === 0) return;
    
    // Process only the last key in rapid succession
    const { str, key } = this.keyBuffer[this.keyBuffer.length - 1];
    this.keyBuffer = [];
    
    // Map key to normalized name
    const keyName = this.normalizeKey(str, key);
    
    // Emit to listeners
    this.emit(keyName, { str, key });
  }

  /**
   * Normalize key input to standard names
   * @param {string} str - Character pressed
   * @param {Object} key - Key object
   * @returns {string} Normalized key name
   */
  normalizeKey(str, key) {
    if (!key) {
      return str || 'unknown';
    }

    // Arrow keys
    if (key.name === 'up') return 'up';
    if (key.name === 'down') return 'down';
    if (key.name === 'left') return 'left';
    if (key.name === 'right') return 'right';
    
    // Enter/Return
    if (key.name === 'return') return 'enter';
    
    // Escape
    if (key.name === 'escape') return 'escape';
    
    // Space
    if (key.name === 'space') return 'space';
    
    // Tab
    if (key.name === 'tab') return 'tab';
    
    // Backspace
    if (key.name === 'backspace') return 'backspace';
    
    // Default to the character
    return str || key.name || 'unknown';
  }

  /**
   * Register a listener for a specific key
   * @param {string} keyName - Key to listen for
   * @param {Function} callback - Function to call when key is pressed
   */
  on(keyName, callback) {
    if (!this.listeners.has(keyName)) {
      this.listeners.set(keyName, []);
    }
    this.listeners.get(keyName).push(callback);
  }

  /**
   * Remove a listener for a specific key
   * @param {string} keyName - Key to stop listening for
   * @param {Function} callback - Function to remove
   */
  off(keyName, callback) {
    if (!this.listeners.has(keyName)) return;
    
    const callbacks = this.listeners.get(keyName);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit an event to all listeners
   * @param {string} keyName - Key that was pressed
   * @param {Object} data - Additional data
   */
  emit(keyName, data) {
    // Emit to specific key listeners
    if (this.listeners.has(keyName)) {
      this.listeners.get(keyName).forEach(callback => {
        callback(data);
      });
    }
    
    // Emit to 'any' listeners
    if (this.listeners.has('any')) {
      this.listeners.get('any').forEach(callback => {
        callback(keyName, data);
      });
    }
  }

  /**
   * Wait for a single keypress
   * @returns {Promise<string>} Promise that resolves with the key name
   */
  async waitForKey() {
    return new Promise((resolve) => {
      const handler = (keyName) => {
        this.off('any', handler);
        resolve(keyName);
      };
      this.on('any', handler);
    });
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.disableRawMode();
    this.listeners.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

/**
 * Create a singleton keyboard handler instance
 */
let keyboardInstance = null;

export function getKeyboard() {
  if (!keyboardInstance) {
    keyboardInstance = new KeyboardHandler();
  }
  return keyboardInstance;
}

/**
 * Simple function to get a single keypress (matching Python's get_key)
 * @returns {Promise<string>} Key name
 */
export async function getKey() {
  const keyboard = getKeyboard();
  keyboard.enableRawMode();
  
  try {
    const key = await keyboard.waitForKey();
    return key;
  } finally {
    // Don't disable raw mode here as it might be used by selector
    // Let the selector handle cleanup
  }
}

// Clean up on exit
process.on('exit', () => {
  if (keyboardInstance) {
    keyboardInstance.cleanup();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  if (keyboardInstance) {
    keyboardInstance.cleanup();
  }
  console.error('Uncaught exception:', err);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  if (keyboardInstance) {
    keyboardInstance.cleanup();
  }
  console.error('Unhandled rejection:', err);
  process.exit(1);
});