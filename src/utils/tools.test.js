import { jest } from '@jest/globals';
import { mockExecSync, mockProcess, resetAllMocks, captureOutput } from '../../test/helpers/mocks.js';

// Mock child_process
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));

// Mock which
jest.unstable_mockModule('which', () => ({
  default: {
    sync: jest.fn((command) => {
      // Mock tool detection
      const tools = {
        git: true,
        node: true,
        npm: true,
        claude: false,
        cursor: false,
        github: false,
        gemini: false
      };
      
      if (tools[command]) {
        return `/usr/bin/${command}`;
      }
      throw new Error('not found');
    })
  }
}));

// Mock chalk
jest.unstable_mockModule('chalk', () => ({
  default: {
    green: jest.fn(text => `[GREEN]${text}[/GREEN]`),
    red: jest.fn(text => `[RED]${text}[/RED]`),
    yellow: jest.fn(text => `[YELLOW]${text}[/YELLOW]`),
    gray: jest.fn(text => `[GRAY]${text}[/GRAY]`),
    dim: jest.fn(text => `[DIM]${text}[/DIM]`)
  }
}));

const { checkAllTools, checkTool, printToolStatus } = await import('./tools.js');
const which = await import('which');

describe('tools', () => {
  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAllTools', () => {
    it('should check all required tools', async () => {
      // Mock version commands
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git --version')) return 'git version 2.45.0';
        if (command.includes('node --version')) return 'v20.11.0';
        if (command.includes('npm --version')) return '10.2.4';
        throw new Error('Command not found');
      });

      await checkAllTools();

      // Should check for git, node, npm
      expect(which.default.sync).toHaveBeenCalledWith('git');
      expect(which.default.sync).toHaveBeenCalledWith('node');
      expect(which.default.sync).toHaveBeenCalledWith('npm');
    });

    it('should handle missing tools gracefully', async () => {
      which.default.sync.mockImplementation(() => {
        throw new Error('not found');
      });

      // Should not throw
      await expect(checkAllTools()).resolves.not.toThrow();
    });

    it('should check for AI tools', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('--version')) return 'version 1.0.0';
        throw new Error('Command not found');
      });

      await checkAllTools();

      // Should check for AI tools
      expect(which.default.sync).toHaveBeenCalledWith('claude');
      expect(which.default.sync).toHaveBeenCalledWith('cursor');
    });
  });

  describe('checkTool', () => {
    it('should check if a tool is installed', async () => {
      which.default.sync.mockReturnValue('/usr/bin/git');
      mockExecSync.mockReturnValue('git version 2.45.0');

      const result = await checkTool('git', { versionFlag: '--version' });

      expect(result.installed).toBe(true);
      expect(result.version).toBe('2.45.0');
    });

    it('should handle missing tool', async () => {
      which.default.sync.mockImplementation(() => {
        throw new Error('not found');
      });

      const result = await checkTool('missing-tool');

      expect(result.installed).toBe(false);
      expect(result.version).toBeUndefined();
    });

    it('should handle version extraction', async () => {
      which.default.sync.mockReturnValue('/usr/bin/node');
      mockExecSync.mockReturnValue('v20.11.0');

      const result = await checkTool('node', {
        versionFlag: '--version',
        versionPattern: /v?(\d+\.\d+\.\d+)/
      });

      expect(result.version).toBe('20.11.0');
    });

    it('should handle version command failure', async () => {
      which.default.sync.mockReturnValue('/usr/bin/tool');
      mockExecSync.mockImplementation(() => {
        throw new Error('Version failed');
      });

      const result = await checkTool('tool', { versionFlag: '--version' });

      expect(result.installed).toBe(true);
      expect(result.version).toBe('Unknown');
    });
  });

  describe('printToolStatus', () => {
    it('should print tool status', () => {
      const output = captureOutput();
      
      printToolStatus('Git', { installed: true, version: '2.45.0' });
      
      const outputText = output.getOutput();
      expect(outputText).toContain('Git');
      expect(outputText).toContain('[GREEN]✓[/GREEN]');
      expect(outputText).toContain('2.45.0');
    });

    it('should handle missing tool', () => {
      const output = captureOutput();
      
      printToolStatus('Node.js', { installed: false });
      
      const outputText = output.getOutput();
      expect(outputText).toContain('Node.js');
      expect(outputText).toContain('[RED]✗[/RED]');
      expect(outputText).toContain('Not installed');
    });

    it('should handle unknown version', () => {
      const output = captureOutput();
      
      printToolStatus('Tool', { installed: true, version: 'Unknown' });
      
      const outputText = output.getOutput();
      expect(outputText).toContain('[GRAY]Unknown[/GRAY]');
    });
  });
});