import { jest } from '@jest/globals';
import { mockProcess, resetAllMocks } from '../../test/helpers/mocks.js';

// Mock readline module
jest.unstable_mockModule('readline', () => ({
  default: {
    emitKeypressEvents: jest.fn()
  }
}));

// Mock dependencies
jest.unstable_mockModule('cli-cursor', () => {
  const cursor = {
    hide: jest.fn(),
    show: jest.fn()
  };
  return {
    default: cursor,
    ...cursor
  };
});

// Import after mocking
const { getKeyboard, KeyboardHandler } = await import('./keyboard.js');
const cliCursor = await import('cli-cursor');
const readline = await import('readline');

describe('keyboard', () => {
  let keyboard;

  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
    
    // Reset keyboard instance
    keyboard = null;
  });

  afterEach(() => {
    if (keyboard && keyboard.cleanup) {
      keyboard.cleanup();
    }
    jest.clearAllMocks();
    resetAllMocks();
  });

  describe('getKeyboard', () => {
    it('should return a keyboard instance', () => {
      keyboard = getKeyboard();
      
      expect(keyboard).toBeDefined();
      expect(keyboard).toBeInstanceOf(KeyboardHandler);
    });

    it('should return the same instance on multiple calls', () => {
      const keyboard1 = getKeyboard();
      const keyboard2 = getKeyboard();
      
      expect(keyboard1).toBe(keyboard2);
    });
  });

  describe('KeyboardHandler', () => {
    it('should create a new instance', () => {
      const handler = new KeyboardHandler();
      
      expect(handler).toBeDefined();
      expect(handler.on).toBeDefined();
      expect(handler.emit).toBeDefined();
      expect(handler.cleanup).toBeDefined();
    });

    it('should enable raw mode', () => {
      const handler = new KeyboardHandler();
      
      handler.enableRawMode();
      
      expect(readline.default.emitKeypressEvents).toHaveBeenCalledWith(process.stdin);
      expect(mockProcess.stdin.setRawMode).toHaveBeenCalledWith(true);
      expect(mockProcess.stdin.resume).toHaveBeenCalled();
      // cli-cursor is not used in keyboard.js
      expect(cliCursor.default.hide).not.toHaveBeenCalled();
    });

    it('should disable raw mode', () => {
      const handler = new KeyboardHandler();
      
      handler.enableRawMode();
      handler.disableRawMode();
      
      expect(mockProcess.stdin.pause).toHaveBeenCalled();
      expect(mockProcess.stdin.setRawMode).toHaveBeenCalledWith(false);
      // cli-cursor is not used in keyboard.js
      expect(cliCursor.default.show).not.toHaveBeenCalled();
    });

    it('should handle non-TTY environment', () => {
      mockProcess.stdin.isTTY = false;
      
      const handler = new KeyboardHandler();
      handler.enableRawMode();
      
      // Should skip setRawMode for non-TTY
      expect(mockProcess.stdin.setRawMode).not.toHaveBeenCalled();
      expect(mockProcess.stdin.resume).toHaveBeenCalled();
    });

    it('should normalize keys correctly', () => {
      const handler = new KeyboardHandler();
      
      // Test arrow keys
      expect(handler.normalizeKey('', { name: 'up' })).toBe('up');
      expect(handler.normalizeKey('', { name: 'down' })).toBe('down');
      expect(handler.normalizeKey('', { name: 'left' })).toBe('left');
      expect(handler.normalizeKey('', { name: 'right' })).toBe('right');
      
      // Test enter key
      expect(handler.normalizeKey('', { name: 'return' })).toBe('enter');
      
      // Test escape
      expect(handler.normalizeKey('', { name: 'escape' })).toBe('escape');
      
      // Test Ctrl+C - normalizeKey doesn't handle ctrl+c specially, it exits the process
      // So we test a regular 'c' key
      expect(handler.normalizeKey('c', { name: 'c' })).toBe('c');
      
      // Test space
      expect(handler.normalizeKey('', { name: 'space' })).toBe('space');
      
      // Test regular keys
      expect(handler.normalizeKey('a', { name: 'a' })).toBe('a');
      expect(handler.normalizeKey('1', { name: '1' })).toBe('1');
    });

    it('should emit events through on/emit pattern', () => {
      const handler = new KeyboardHandler();
      const callback = jest.fn();
      
      handler.on('key', callback);
      handler.emit('key', 'test');
      
      expect(callback).toHaveBeenCalledWith('test');
    });

    it('should handle multiple listeners', () => {
      const handler = new KeyboardHandler();
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      handler.on('key', callback1);
      handler.on('key', callback2);
      
      handler.emit('key', 'test');
      
      expect(callback1).toHaveBeenCalledWith('test');
      expect(callback2).toHaveBeenCalledWith('test');
    });

    it('should remove listeners with off', () => {
      const handler = new KeyboardHandler();
      const callback = jest.fn();
      
      handler.on('key', callback);
      handler.emit('key', 'test1');
      expect(callback).toHaveBeenCalledTimes(1);
      
      handler.off('key', callback);
      handler.emit('key', 'test2');
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should handle keypress events', async () => {
      const handler = new KeyboardHandler();
      const keyCallback = jest.fn();
      
      handler.on('enter', keyCallback);
      handler.enableRawMode();
      
      // Get the keypress handler that was registered
      const keypressHandler = mockProcess.stdin.on.mock.calls.find(
        call => call[0] === 'keypress'
      )?.[1];
      
      expect(keypressHandler).toBeDefined();
      
      // Simulate keypress
      keypressHandler('', { name: 'return' }); // 'return' maps to 'enter' in normalizeKey
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(keyCallback).toHaveBeenCalled();
    });

    it('should cleanup properly', () => {
      const handler = new KeyboardHandler();
      
      handler.enableRawMode();
      expect(handler.isRawMode).toBe(true);
      
      handler.cleanup();
      
      expect(mockProcess.stdin.pause).toHaveBeenCalled();
      // setRawMode(false) is only called if stdin.isTTY is true
      if (mockProcess.stdin.isTTY) {
        expect(mockProcess.stdin.setRawMode).toHaveBeenCalledWith(false);
      }
      expect(mockProcess.stdin.removeAllListeners).toHaveBeenCalledWith('keypress');
      // cli-cursor is not used in keyboard.js
      expect(cliCursor.default.show).not.toHaveBeenCalled();
    });

    it('should waitForKey promise', async () => {
      const handler = new KeyboardHandler();
      
      const keyPromise = handler.waitForKey();
      
      // Emit any key - waitForKey listens to 'any' event
      handler.emit('test-key');
      
      const result = await keyPromise;
      expect(result).toBe('test-key');
    });
  });
});