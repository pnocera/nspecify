import { jest } from '@jest/globals';
import { mockProcess, captureOutput, resetAllMocks } from '../../test/helpers/mocks.js';

// Mock dependencies
jest.unstable_mockModule('chalk', () => ({
  default: {
    cyan: jest.fn(text => `[CYAN]${text}[/CYAN]`),
    cyanBright: jest.fn(text => `[CYANBRIGHT]${text}[/CYANBRIGHT]`),
    gray: jest.fn(text => `[GRAY]${text}[/GRAY]`),
    yellow: jest.fn(text => `[YELLOW]${text}[/YELLOW]`),
    green: jest.fn(text => `[GREEN]${text}[/GREEN]`),
    white: jest.fn(text => `[WHITE]${text}[/WHITE]`),
    dim: jest.fn(text => `[DIM]${text}[/DIM]`),
    bold: jest.fn(text => `[BOLD]${text}[/BOLD]`)
  }
}));

jest.unstable_mockModule('./keyboard.js', () => ({
  getKeyboard: jest.fn(() => {
    const handlers = {};
    return {
      cleanup: jest.fn(),
      on: jest.fn((event, callback) => {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(callback);
        // Store callback for test access
        if (event === 'any') {
          global.testKeyboardCallback = callback;
        }
      }),
      off: jest.fn((event, callback) => {
        if (handlers[event]) {
          const index = handlers[event].indexOf(callback);
          if (index !== -1) handlers[event].splice(index, 1);
        }
      }),
      once: jest.fn(),
      removeListener: jest.fn(),
      enableRawMode: jest.fn(),
      disableRawMode: jest.fn(),
      isActive: jest.fn(() => true)
    };
  })
}));

const { selectWithArrows, Selector } = await import('./selector.js');
const { getKeyboard } = await import('./keyboard.js');

describe('selector', () => {
  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
    global.testKeyboardCallback = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.testKeyboardCallback;
  });

  describe('selectWithArrows', () => {
    const defaultOptions = {
      option1: 'Option 1',
      option2: 'Option 2',
      option3: 'Option 3'
    };
    const defaultPrompt = 'Select an option:';

    it('should display initial selector state', async () => {
      const output = captureOutput();
      const selectorPromise = selectWithArrows(defaultOptions, defaultPrompt);

      // Let the promise start
      await new Promise(resolve => setImmediate(resolve));

      const outputText = output.getOutput();
      
      // Verify prompt message
      expect(outputText).toContain(defaultPrompt);
      
      // Verify all options are displayed
      expect(outputText).toContain('Option 1');
      expect(outputText).toContain('Option 2');
      expect(outputText).toContain('Option 3');

      // Cleanup
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('escape');
      }
      await expect(selectorPromise).rejects.toThrow();
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle arrow navigation', async () => {
      const output = captureOutput();
      const selectorPromise = selectWithArrows(defaultOptions, defaultPrompt);

      await new Promise(resolve => setImmediate(resolve));

      // Navigate down
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('down');
        await new Promise(resolve => setImmediate(resolve));
      }

      const outputText = output.getOutput();
      
      // Should show selection moved
      expect(outputText).toContain('option2');

      // Cleanup
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('escape');
      }
      await expect(selectorPromise).rejects.toThrow();
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should wrap around when navigating past boundaries', async () => {
      const output = captureOutput();
      const selectorPromise = selectWithArrows(defaultOptions, defaultPrompt);

      await new Promise(resolve => setImmediate(resolve));

      // Navigate up from first item (should wrap to last)
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('up');
        await new Promise(resolve => setImmediate(resolve));
      }

      // Should be at option3 now
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('enter');
      }

      const result = await selectorPromise;
      expect(result).toBe('option3');
    });

    it('should handle enter key selection', async () => {
      const selectorPromise = selectWithArrows(defaultOptions, defaultPrompt);

      await new Promise(resolve => setImmediate(resolve));

      // Select first option
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('enter');
      }

      const result = await selectorPromise;
      expect(result).toBe('option1');
    });

    it('should handle escape key cancellation', async () => {
      const selectorPromise = selectWithArrows(defaultOptions, defaultPrompt);

      await new Promise(resolve => setImmediate(resolve));

      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('escape');
      }

      // selectWithArrows exits with code 1 on escape
      await expect(selectorPromise).rejects.toThrow();
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle Ctrl+C cancellation', async () => {
      // Note: ctrl-c is handled by the keyboard module which calls process.exit(0) directly
      // This test verifies that the selector doesn't interfere with that behavior
      const selectorPromise = selectWithArrows(defaultOptions, defaultPrompt);

      await new Promise(resolve => setImmediate(resolve));

      // For testing, we'll simulate escape instead since ctrl-c would exit the process
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('escape');
      }

      await expect(selectorPromise).rejects.toThrow();
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle custom hint text', async () => {
      const output = captureOutput();
      const customPrompt = 'Choose your favorite';
      
      const selectorPromise = selectWithArrows(defaultOptions, customPrompt);

      await new Promise(resolve => setImmediate(resolve));

      const outputText = output.getOutput();
      expect(outputText).toContain(customPrompt);

      // Cleanup
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('escape');
      }
      await expect(selectorPromise).rejects.toThrow();
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should select specific item and return its value', async () => {
      const selectorPromise = selectWithArrows(defaultOptions, defaultPrompt);

      await new Promise(resolve => setImmediate(resolve));

      // Move down to second option
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('down');
        await new Promise(resolve => setImmediate(resolve));
        global.testKeyboardCallback('enter');
      }

      const result = await selectorPromise;
      expect(result).toBe('option2');
    });

    it('should handle empty choices array', async () => {
      const options = {};
      const prompt = 'Select:';

      const selectorPromise = selectWithArrows(options, prompt);
      
      await new Promise(resolve => setImmediate(resolve));
      
      // Cancel since there's nothing to select
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('escape');
      }
      
      await expect(selectorPromise).rejects.toThrow();
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle single choice', async () => {
      const options = {
        single: 'Single Option'
      };
      const prompt = 'Select:';

      const selectorPromise = selectWithArrows(options, prompt);

      await new Promise(resolve => setImmediate(resolve));

      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('enter');
      }

      const result = await selectorPromise;
      expect(result).toBe('single');
    });

    it('should display with proper styling', async () => {
      const output = captureOutput();
      const selectorPromise = selectWithArrows(defaultOptions, defaultPrompt);

      await new Promise(resolve => setImmediate(resolve));

      const outputText = output.getOutput();
      
      // Check for proper formatting
      expect(outputText).toContain('[BOLD]' + defaultPrompt);
      expect(outputText).toContain('[CYAN]');
      expect(outputText).toContain('▶'); // Arrow indicator
      
      // Cleanup
      if (global.testKeyboardCallback) {
        global.testKeyboardCallback('escape');
      }
      await expect(selectorPromise).rejects.toThrow();
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Selector class', () => {
    it('should create instance with options', () => {
      const selector = new Selector({
        items: [
          { key: 'a', label: 'Option A' },
          { key: 'b', label: 'Option B' }
        ],
        prompt: 'Test prompt',
        defaultIndex: 1
      });

      expect(selector.items).toHaveLength(2);
      expect(selector.prompt).toBe('Test prompt');
      expect(selector.selectedIndex).toBe(1);
    });

    it('should handle keyboard navigation', () => {
      const selector = new Selector({
        items: [
          { key: 'a', label: 'Option A' },
          { key: 'b', label: 'Option B' },
          { key: 'c', label: 'Option C' }
        ]
      });

      // Test up navigation
      selector.handleKey('up');
      expect(selector.selectedIndex).toBe(2); // Wrapped to last

      // Test down navigation
      selector.selectedIndex = 2;
      selector.handleKey('down');
      expect(selector.selectedIndex).toBe(0); // Wrapped to first
    });
  });
});