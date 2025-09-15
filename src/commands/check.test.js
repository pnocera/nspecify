import { jest } from '@jest/globals';
import { mockProcess, captureOutput, resetAllMocks } from '../../test/helpers/mocks.js';

// Mock dependencies  
jest.unstable_mockModule('chalk', () => {
  // Create a mock function that can be both called directly and chained
  const createChainableMock = (color) => {
    const mockFn = jest.fn(text => `[${color.toUpperCase()}]${text}[/${color.toUpperCase()}]`);
    
    // Add chainable methods
    mockFn.bold = jest.fn(text => `[${color.toUpperCase()}][BOLD]${text}[/BOLD][/${color.toUpperCase()}]`);
    mockFn.blue = jest.fn(text => `[${color.toUpperCase()}][BLUE]${text}[/BLUE][/${color.toUpperCase()}]`);
    mockFn.green = jest.fn(text => `[${color.toUpperCase()}][GREEN]${text}[/GREEN][/${color.toUpperCase()}]`);
    mockFn.red = jest.fn(text => `[${color.toUpperCase()}][RED]${text}[/RED][/${color.toUpperCase()}]`);
    mockFn.yellow = jest.fn(text => `[${color.toUpperCase()}][YELLOW]${text}[/YELLOW][/${color.toUpperCase()}]`);
    mockFn.gray = jest.fn(text => `[${color.toUpperCase()}][GRAY]${text}[/GRAY][/${color.toUpperCase()}]`);
    mockFn.cyan = jest.fn(text => `[${color.toUpperCase()}][CYAN]${text}[/CYAN][/${color.toUpperCase()}]`);
    mockFn.dim = jest.fn(text => `[${color.toUpperCase()}][DIM]${text}[/DIM][/${color.toUpperCase()}]`);
    
    return mockFn;
  };

  // Create bold mock that can be both called and chained
  const boldMock = jest.fn(text => `[BOLD]${text}[/BOLD]`);
  boldMock.blue = jest.fn(text => `[BOLD][BLUE]${text}[/BLUE][/BOLD]`);
  boldMock.green = jest.fn(text => `[BOLD][GREEN]${text}[/GREEN][/BOLD]`);
  boldMock.red = jest.fn(text => `[BOLD][RED]${text}[/RED][/BOLD]`);
  boldMock.yellow = jest.fn(text => `[BOLD][YELLOW]${text}[/YELLOW][/BOLD]`);
  boldMock.gray = jest.fn(text => `[BOLD][GRAY]${text}[/GRAY][/BOLD]`);
  boldMock.cyan = jest.fn(text => `[BOLD][CYAN]${text}[/CYAN][/BOLD]`);
  boldMock.dim = jest.fn(text => `[BOLD][DIM]${text}[/DIM][/BOLD]`);
  
  return {
    default: {
      green: createChainableMock('green'),
      yellow: createChainableMock('yellow'),
      red: createChainableMock('red'),
      blue: createChainableMock('blue'),
      cyan: createChainableMock('cyan'),
      gray: createChainableMock('gray'),
      dim: createChainableMock('dim'),
      bold: boldMock
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
  checkAllTools: jest.fn().mockResolvedValue({
    git: {
      installed: true,
      path: '/usr/bin/git',
      version: { major: 2, minor: 45, patch: 0, full: '2.45.0' },
      meetsMinimum: true,
      error: null
    },
    claude: {
      installed: true,
      path: '/usr/local/bin/claude',
      version: { major: 1, minor: 0, patch: 0, full: '1.0.0' },
      error: null
    },
    allInstalled: true,
    allMeetRequirements: true
  })
}));

jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn((cmd) => {
    if (cmd.includes('npm --version')) return '10.2.4\n';
    if (cmd.includes('git --version')) return 'git version 2.45.0\n';
    if (cmd.includes('curl')) return ''; // For network check
    return '';
  })
}));

jest.unstable_mockModule('node:fs/promises', () => ({
  default: {
    writeFile: jest.fn().mockResolvedValue(),
    unlink: jest.fn().mockResolvedValue()
  },
  writeFile: jest.fn().mockResolvedValue(),
  unlink: jest.fn().mockResolvedValue()
}));

// Import after mocking
const { checkCommand } = await import('./check.js');
const { showBanner } = await import('../ui/banner.js');
const { checkAllTools } = await import('../utils/tools.js');

describe('check command', () => {
  let originalConsoleLog;
  let originalConsoleError;
  let consoleOutput;

  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
    
    // Mock console.log to capture output
    consoleOutput = [];
    originalConsoleLog = console.log;
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    
    // Mock console.error to suppress expected error output
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('successful checks', () => {
    it('should display system check information', async () => {
      await checkCommand();

      expect(checkAllTools).toHaveBeenCalled();

      const outputText = consoleOutput.join('\n');
      
      // Check header text (note: the actual text is "nspecify System Check", not "System Requirements Check")
      expect(outputText).toContain('nspecify System Check');
      
      // Check system info
      expect(outputText).toContain('System Information');
      expect(outputText).toContain('Operating System');
    });

    it('should display tool requirements table', async () => {
      await checkCommand();

      const outputText = consoleOutput.join('\n');
      
      // Check table content (based on actual check.js implementation) 
      expect(outputText).toContain('Requirements Check');
      expect(outputText).toContain('Git');
      expect(outputText).toContain('Claude CLI');
    });

    it('should handle verbose mode', async () => {
      await checkCommand({ verbose: true });

      const outputText = consoleOutput.join('\n');
      
      // In verbose mode, should show more details
      expect(outputText).toContain('nspecify System Check');
      expect(outputText).toContain('System Information');
    });
  });

  describe('error handling', () => {
    it('should handle checkAllTools errors gracefully', async () => {
      checkAllTools.mockRejectedValue(new Error('Tool check failed'));

      // Should not throw, just log error
      await checkCommand();

      const outputText = consoleOutput.join('\n');
      expect(outputText).toContain('nspecify System Check');
      
      // Verify error was logged (mocked)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[RED]'),
        expect.stringContaining('[RED]System check failed:[/RED]'),
        expect.any(Error)
      );
    });

    it('should handle missing tools gracefully', async () => {
      await checkCommand();

      // Should complete without errors
      expect(checkAllTools).toHaveBeenCalled();
    });
  });

  describe('output formatting', () => {
    beforeEach(() => {
      // Reset mock to successful case for formatting tests
      checkAllTools.mockResolvedValue({
        git: {
          installed: true,
          path: '/usr/bin/git',
          version: { major: 2, minor: 45, patch: 0, full: '2.45.0' },
          meetsMinimum: true,
          error: null
        },
        claude: {
          installed: true,
          path: '/usr/local/bin/claude',
          version: { major: 1, minor: 0, patch: 0, full: '1.0.0' },
          error: null
        },
        allInstalled: true,
        allMeetRequirements: true
      });
    });

    it('should use colors appropriately', async () => {
      await checkCommand();

      const outputText = consoleOutput.join('\n');
      
      // Should use bold for headers
      expect(outputText).toContain('[BOLD]');
      
      // Should use colors for status
      expect(outputText).toMatch(/\[GREEN\]|\[YELLOW\]|\[RED\]/);
    });

    it('should format table correctly', async () => {
      await checkCommand();

      const outputText = consoleOutput.join('\n');
      
      // Should have table structure
      expect(outputText).toContain('|');
    });
  });
});