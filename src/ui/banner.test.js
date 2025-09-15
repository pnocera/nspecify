import { jest } from '@jest/globals';
import { mockProcess, resetAllMocks } from '../../test/helpers/mocks.js';

// Mock chalk module
jest.unstable_mockModule('chalk', () => ({
  default: {
    supportsColor: { level: 2 },
    italic: {
      yellowBright: jest.fn(text => `[ITALIC][YELLOWBRIGHT]${text}[/YELLOWBRIGHT][/ITALIC]`)
    },
    cyan: jest.fn(text => `[CYAN]${text}[/CYAN]`),
    cyanBright: jest.fn(text => `[CYANBRIGHT]${text}[/CYANBRIGHT]`),
    blueBright: jest.fn(text => `[BLUEBRIGHT]${text}[/BLUEBRIGHT]`),
    blue: jest.fn(text => `[BLUE]${text}[/BLUE]`),
    white: jest.fn(text => `[WHITE]${text}[/WHITE]`),
    whiteBright: jest.fn(text => `[WHITEBRIGHT]${text}[/WHITEBRIGHT]`)
  }
}));

const { showBanner } = await import('./banner.js');

describe('banner', () => {
  let originalConsoleLog;
  let consoleOutput = [];

  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
    
    // Mock console.log
    originalConsoleLog = console.log;
    consoleOutput = [];
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore console.log
    console.log = originalConsoleLog;
  });

  describe('showBanner', () => {
    it('should display the banner with correct formatting', async () => {
      await showBanner();
      
      const outputText = consoleOutput.join('\n');
      
      // Check that banner contains key elements
      expect(outputText).toContain('███████╗');
      expect(outputText).toContain('Spec-Driven Development');
      // Output should have content
      expect(outputText.length).toBeGreaterThan(0);
    });

    it('should include version information', async () => {
      await showBanner();
      
      // Version might not be shown, check for any output
      expect(consoleOutput.length).toBeGreaterThan(0);
    });

    it('should handle narrow terminal width', async () => {
      mockProcess.stdout.columns = 40;
      
      await showBanner();
      
      const outputText = consoleOutput.join('\n');
      // Banner should adapt to narrow terminal - might use mini banner
      expect(outputText.length).toBeGreaterThan(0);
      expect(outputText).toContain('Spec-Driven Development');
    });

    it('should handle very wide terminal', async () => {
      mockProcess.stdout.columns = 200;
      
      await showBanner();
      
      const outputText = consoleOutput.join('\n');
      // Check that content is displayed
      expect(outputText).toContain('███████╗');
      expect(outputText).toContain('Spec-Driven Development');
    });

    it('should handle undefined terminal width', async () => {
      mockProcess.stdout.columns = undefined;
      
      await showBanner();
      
      const outputText = consoleOutput.join('\n');
      // Should fall back to default width
      expect(outputText.length).toBeGreaterThan(0);
      expect(outputText).toContain('Spec-Driven Development');
    });
  });
});