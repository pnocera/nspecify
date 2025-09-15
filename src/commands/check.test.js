import { jest } from '@jest/globals';
import { mockProcess, captureOutput, resetAllMocks } from '../../test/helpers/mocks.js';

// Mock dependencies  
jest.unstable_mockModule('chalk', () => {
  const chainableMock = (prefix) => ({
    green: jest.fn(text => `${prefix}[GREEN]${text}[/GREEN]`),
    yellow: jest.fn(text => `${prefix}[YELLOW]${text}[/YELLOW]`),
    red: jest.fn(text => `${prefix}[RED]${text}[/RED]`),
    blue: jest.fn(text => `${prefix}[BLUE]${text}[/BLUE]`),
    cyan: jest.fn(text => `${prefix}[CYAN]${text}[/CYAN]`),
    gray: jest.fn(text => `${prefix}[GRAY]${text}[/GRAY]`),
    dim: jest.fn(text => `${prefix}[DIM]${text}[/DIM]`),
    bold: jest.fn(text => `${prefix}[BOLD]${text}[/BOLD]`)
  });
  
  return {
    default: {
      green: jest.fn(text => `[GREEN]${text}[/GREEN]`),
      yellow: jest.fn(text => `[YELLOW]${text}[/YELLOW]`),
      red: jest.fn(text => `[RED]${text}[/RED]`),
      blue: jest.fn(text => `[BLUE]${text}[/BLUE]`),
      cyan: jest.fn(text => `[CYAN]${text}[/CYAN]`),
      gray: jest.fn(text => `[GRAY]${text}[/GRAY]`),
      dim: jest.fn(text => `[DIM]${text}[/DIM]`),
      bold: chainableMock('[BOLD]')
    }
  };
});

jest.unstable_mockModule('cli-table3', () => ({
  default: class Table {
    constructor(options) {
      this.options = options;
      this.rows = [];
    }
    
    push(row) {
      this.rows.push(row);
    }
    
    toString() {
      // Simple table representation for testing
      const lines = [];
      this.rows.forEach(row => {
        lines.push(row.join(' | '));
      });
      return lines.join('\n');
    }
  }
}));

jest.unstable_mockModule('../ui/banner.js', () => ({
  showBanner: jest.fn()
}));

jest.unstable_mockModule('../utils/tools.js', () => ({
  checkAllTools: jest.fn()
}));

jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn((cmd) => {
    if (cmd.includes('npm --version')) return '10.2.4\n';
    if (cmd.includes('git --version')) return 'git version 2.45.0\n';
    return '';
  })
}));

// Import after mocking
const { checkCommand } = await import('./check.js');
const { showBanner } = await import('../ui/banner.js');
const { checkAllTools } = await import('../utils/tools.js');

describe('check command', () => {
  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful checks', () => {
    it('should display system check information', async () => {
      const output = captureOutput();

      await checkCommand();

      expect(showBanner).toHaveBeenCalled();
      expect(checkAllTools).toHaveBeenCalled();

      const outputText = output.getOutput();
      
      // Check header
      expect(outputText).toContain('[BOLD]System Requirements Check[/BOLD]');
      
      // Check system info
      expect(outputText).toContain('Platform');
      expect(outputText).toContain('Node.js');
      expect(outputText).toContain('npm');
      expect(outputText).toContain('Git');
    });

    it('should display tool requirements table', async () => {
      const output = captureOutput();

      await checkCommand();

      const outputText = output.getOutput();
      
      // Check table content
      expect(outputText).toContain('Tool');
      expect(outputText).toContain('Required');
      expect(outputText).toContain('Installed');
      expect(outputText).toContain('Version');
    });

    it('should handle verbose mode', async () => {
      const output = captureOutput();

      await checkCommand({ verbose: true });

      const outputText = output.getOutput();
      
      // In verbose mode, should show more details
      expect(outputText).toContain('System Requirements Check');
      expect(outputText).toContain('Platform');
    });
  });

  describe('error handling', () => {
    it('should handle checkAllTools errors gracefully', async () => {
      const output = captureOutput();
      checkAllTools.mockRejectedValue(new Error('Tool check failed'));

      // Should not throw, just log error
      await checkCommand();

      const outputText = output.getOutput();
      expect(outputText).toContain('System Requirements Check');
    });

    it('should handle missing tools gracefully', async () => {
      const output = captureOutput();
      
      await checkCommand();

      // Should complete without errors
      expect(showBanner).toHaveBeenCalled();
    });
  });

  describe('output formatting', () => {
    it('should use colors appropriately', async () => {
      const output = captureOutput();

      await checkCommand();

      const outputText = output.getOutput();
      
      // Should use bold for headers
      expect(outputText).toContain('[BOLD]');
      
      // Should use colors for status
      expect(outputText).toMatch(/\[GREEN\]|\[YELLOW\]|\[RED\]/);
    });

    it('should format table correctly', async () => {
      const output = captureOutput();

      await checkCommand();

      const outputText = output.getOutput();
      
      // Should have table structure
      expect(outputText).toContain('|');
    });
  });
});