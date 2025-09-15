import { jest } from '@jest/globals';
import { mockExecSync, mockProcess, resetAllMocks } from '../../test/helpers/mocks.js';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Mock child_process
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));

// Mock which
const mockWhich = jest.fn();
jest.unstable_mockModule('which', () => ({
  default: mockWhich
}));

// Mock fs
const mockExistsSync = jest.fn();
jest.unstable_mockModule('fs', () => ({
  existsSync: mockExistsSync
}));

// Mock os
const mockHomedir = jest.fn();
jest.unstable_mockModule('os', () => ({
  homedir: mockHomedir
}));

// Mock path
const mockJoin = jest.fn();
jest.unstable_mockModule('path', () => ({
  join: mockJoin
}));

// Mock chalk
jest.unstable_mockModule('chalk', () => ({
  default: {
    green: jest.fn(text => `[GREEN]${text}[/GREEN]`),
    red: jest.fn(text => `[RED]${text}[/RED]`),
    yellow: jest.fn(text => `[YELLOW]${text}[/YELLOW]`),
    gray: jest.fn(text => `[GRAY]${text}[/GRAY]`),
    blue: jest.fn(text => `[BLUE]${text}[/BLUE]`),
    bold: jest.fn(text => `[BOLD]${text}[/BOLD]`)
  }
}));

const { checkGit, checkClaudeCLI, checkTool, printToolStatus, checkAllTools } = await import('./tools.js');

describe('tools', () => {
  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
    mockHomedir.mockReturnValue('/home/user');
    mockExistsSync.mockReturnValue(false);
    mockJoin.mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkGit', () => {
    it('should detect git installation with valid version', async () => {
      mockWhich.mockResolvedValue('/usr/bin/git');
      mockExecSync.mockReturnValue('git version 2.45.0');

      const result = await checkGit();

      expect(result).toEqual({
        installed: true,
        path: '/usr/bin/git',
        version: {
          major: 2,
          minor: 45,
          patch: 0,
          full: '2.45.0'
        },
        meetsMinimum: true,
        error: null
      });
    });

    it('should handle git not found in PATH', async () => {
      mockWhich.mockRejectedValue(new Error('not found'));

      const result = await checkGit();

      expect(result).toEqual({
        installed: false,
        path: null,
        version: null,
        meetsMinimum: false,
        error: 'Git not found in PATH'
      });
    });

    it('should detect when git version is below minimum', async () => {
      mockWhich.mockResolvedValue('/usr/bin/git');
      mockExecSync.mockReturnValue('git version 1.9.5');

      const result = await checkGit();

      expect(result).toEqual({
        installed: true,
        path: '/usr/bin/git',
        version: {
          major: 1,
          minor: 9,
          patch: 5,
          full: '1.9.5'
        },
        meetsMinimum: false,
        error: 'Git version 1.9.5 is below minimum required version 2.0.0'
      });
    });

    it('should handle version command failure', async () => {
      mockWhich.mockResolvedValue('/usr/bin/git');
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await checkGit();

      expect(result).toEqual({
        installed: true,
        path: '/usr/bin/git',
        version: null,
        meetsMinimum: false,
        error: 'Could not determine git version'
      });
    });

    it('should handle unparseable version string', async () => {
      mockWhich.mockResolvedValue('/usr/bin/git');
      mockExecSync.mockReturnValue('git version unknown');

      const result = await checkGit();

      expect(result).toEqual({
        installed: true,
        path: '/usr/bin/git',
        version: null,
        meetsMinimum: false,
        error: 'Could not parse git version'
      });
    });

    it('should handle edge case versions correctly', async () => {
      mockWhich.mockResolvedValue('/usr/bin/git');
      
      // Test exact minimum version
      mockExecSync.mockReturnValue('git version 2.0.0');
      let result = await checkGit();
      expect(result.meetsMinimum).toBe(true);
      
      // Test version with extra text
      mockExecSync.mockReturnValue('git version 2.45.0.windows.1');
      result = await checkGit();
      expect(result.version.full).toBe('2.45.0');
      expect(result.meetsMinimum).toBe(true);
    });

    it('should handle unexpected errors', async () => {
      mockWhich.mockRejectedValue(new Error('Unexpected error'));

      const result = await checkGit();

      expect(result.installed).toBe(false);
      expect(result.error).toBe('Git not found in PATH');
    });
  });

  describe('checkClaudeCLI', () => {
    it('should detect claude in PATH', async () => {
      mockWhich.mockResolvedValue('/usr/bin/claude');
      mockExecSync.mockReturnValue('claude version 1.2.3');

      const result = await checkClaudeCLI();

      expect(result).toEqual({
        installed: true,
        path: '/usr/bin/claude',
        version: {
          major: 1,
          minor: 2,
          patch: 3,
          full: '1.2.3'
        },
        error: null
      });
    });

    it('should check local Windows path when not in PATH', async () => {
      mockWhich.mockRejectedValue(new Error('not found'));
      mockExistsSync.mockImplementation((path) => {
        return path === '/home/user/.claude/local/claude.exe';
      });

      const result = await checkClaudeCLI();

      expect(result).toEqual({
        installed: true,
        path: '/home/user/.claude/local/claude.exe',
        version: null,
        error: null
      });
      
      // Only the first path should be checked since the loop breaks after finding it
      expect(mockExistsSync).toHaveBeenCalledWith('/home/user/.claude/local/claude.exe');
      expect(mockExistsSync).toHaveBeenCalledTimes(1);
    });

    it('should check Unix local path when not in PATH', async () => {
      mockWhich.mockRejectedValue(new Error('not found'));
      mockExistsSync.mockImplementation((path) => {
        return path === '/home/user/.claude/local/claude';
      });

      const result = await checkClaudeCLI();

      expect(result.installed).toBe(true);
      expect(result.path).toBe('/home/user/.claude/local/claude');
    });

    it('should check alternative Windows path', async () => {
      mockWhich.mockRejectedValue(new Error('not found'));
      mockExistsSync.mockImplementation((path) => {
        return path === '/home/user/AppData/Local/claude/claude.exe';
      });

      const result = await checkClaudeCLI();

      expect(result.installed).toBe(true);
      expect(result.path).toBe('/home/user/AppData/Local/claude/claude.exe');
    });

    it('should handle claude not found anywhere', async () => {
      mockWhich.mockRejectedValue(new Error('not found'));
      mockExistsSync.mockReturnValue(false);

      const result = await checkClaudeCLI();

      expect(result).toEqual({
        installed: false,
        path: null,
        version: null,
        error: 'Claude CLI not found. Please install it from https://claude.ai/cli'
      });

      // Should check all local paths when not found
      expect(mockExistsSync).toHaveBeenCalledWith('/home/user/.claude/local/claude.exe');
      expect(mockExistsSync).toHaveBeenCalledWith('/home/user/.claude/local/claude');
      expect(mockExistsSync).toHaveBeenCalledWith('/home/user/AppData/Local/claude/claude.exe');
    });

    it('should handle version check from local path', async () => {
      mockWhich.mockRejectedValue(new Error('not found'));
      mockExistsSync.mockImplementation((path) => {
        return path === '/home/user/.claude/local/claude.exe';
      });
      mockExecSync.mockReturnValue('claude version 1.0.0');

      const result = await checkClaudeCLI();

      expect(result.installed).toBe(true);
      expect(result.version).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        full: '1.0.0'
      });
    });

    it('should handle version command failure gracefully', async () => {
      mockWhich.mockResolvedValue('/usr/bin/claude');
      mockExecSync.mockImplementation(() => {
        throw new Error('Version failed');
      });

      const result = await checkClaudeCLI();

      expect(result).toEqual({
        installed: true,
        path: '/usr/bin/claude',
        version: null,
        error: null
      });
    });

    it('should handle unparseable version', async () => {
      mockWhich.mockResolvedValue('/usr/bin/claude');
      mockExecSync.mockReturnValue('claude unknown version');

      const result = await checkClaudeCLI();

      expect(result.installed).toBe(true);
      expect(result.version).toBe(null);
      expect(result.error).toBe(null);
    });

    it('should handle unexpected errors', async () => {
      mockWhich.mockRejectedValue(new Error('Unexpected error'));
      mockExistsSync.mockReturnValue(false);

      const result = await checkClaudeCLI();

      expect(result.installed).toBe(false);
      expect(result.error).toBe('Claude CLI not found. Please install it from https://claude.ai/cli');
    });
  });

  describe('checkTool', () => {
    it('should check generic tool with version', async () => {
      mockWhich.mockResolvedValue('/usr/bin/node');
      mockExecSync.mockReturnValue('v20.11.0');

      const result = await checkTool('node', {
        minVersion: { major: 18, minor: 0, patch: 0, full: '18.0.0' }
      });

      expect(result).toEqual({
        installed: true,
        path: '/usr/bin/node',
        version: {
          major: 20,
          minor: 11,
          patch: 0,
          full: '20.11.0'
        },
        meetsMinimum: true,
        error: null
      });
    });

    it('should check local paths for tool', async () => {
      mockWhich.mockRejectedValue(new Error('not found'));
      mockExistsSync.mockImplementation((path) => {
        return path === '/custom/path/tool';
      });

      const result = await checkTool('tool', {
        localPaths: ['/custom/path/tool', '/another/path/tool']
      });

      expect(result.installed).toBe(true);
      expect(result.path).toBe('/custom/path/tool');
    });

    it('should handle custom install instructions', async () => {
      mockWhich.mockRejectedValue(new Error('not found'));

      const result = await checkTool('mytool', {
        installInstructions: 'Download from https://example.com'
      });

      expect(result.error).toBe('mytool not found. Download from https://example.com');
    });

    it('should handle no version flag option', async () => {
      mockWhich.mockResolvedValue('/usr/bin/tool');

      const result = await checkTool('tool');

      expect(result).toEqual({
        installed: true,
        path: '/usr/bin/tool',
        version: null,
        meetsMinimum: true,
        error: null
      });
    });
  });

  describe('printToolStatus', () => {
    let consoleLogSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should print successful tool status with version', () => {
      printToolStatus('Git', {
        installed: true,
        path: '/usr/bin/git',
        version: { major: 2, minor: 45, patch: 0, full: '2.45.0' },
        error: null
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('[GREEN]✓ Git found[/GREEN]');
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY]  Path: /usr/bin/git[/GRAY]');
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY]  Version: 2.45.0[/GRAY]');
    });

    it('should print error status with installation instructions for git', () => {
      printToolStatus('Git', {
        installed: false,
        error: 'Git not found in PATH'
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('[RED]✗ Git issue[/RED]');
      expect(consoleLogSpy).toHaveBeenCalledWith('[YELLOW]  Git not found in PATH[/YELLOW]');
      expect(consoleLogSpy).toHaveBeenCalledWith('[BLUE]\n  Installation instructions:[/BLUE]');
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY]  - Windows: Download from https://git-scm.com/download/win[/GRAY]');
    });

    it('should print error status with installation instructions for claude', () => {
      printToolStatus('Claude CLI', {
        installed: false,
        error: 'Claude CLI not found'
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('[RED]✗ Claude CLI issue[/RED]');
      expect(consoleLogSpy).toHaveBeenCalledWith('[YELLOW]  Claude CLI not found[/YELLOW]');
      expect(consoleLogSpy).toHaveBeenCalledWith('[BLUE]\n  Installation instructions:[/BLUE]');
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY]  1. Visit https://claude.ai/cli[/GRAY]');
    });

    it('should handle tool without path or version', () => {
      printToolStatus('Tool', {
        installed: true,
        error: null
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('[GREEN]✓ Tool found[/GREEN]');
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Path:'));
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Version:'));
    });
  });

  describe('checkAllTools', () => {
    let consoleLogSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should check both git and claude CLI', async () => {
      mockWhich.mockImplementation((cmd) => {
        if (cmd === 'git') return Promise.resolve('/usr/bin/git');
        if (cmd === 'claude') return Promise.resolve('/usr/bin/claude');
        return Promise.reject(new Error('not found'));
      });
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('git')) return 'git version 2.45.0';
        if (cmd.includes('claude')) return 'claude version 1.0.0';
        return '';
      });

      const result = await checkAllTools();

      expect(result.allInstalled).toBe(true);
      expect(result.allMeetRequirements).toBe(true);
      expect(result.git.installed).toBe(true);
      expect(result.claude.installed).toBe(true);
    });

    it('should handle missing tools', async () => {
      mockWhich.mockRejectedValue(new Error('not found'));
      mockExistsSync.mockReturnValue(false);

      const result = await checkAllTools();

      expect(result.allInstalled).toBe(false);
      expect(result.allMeetRequirements).toBe(false);
      expect(result.git.installed).toBe(false);
      expect(result.claude.installed).toBe(false);
    });

    it('should handle git version below minimum', async () => {
      mockWhich.mockImplementation((cmd) => {
        if (cmd === 'git') return Promise.resolve('/usr/bin/git');
        if (cmd === 'claude') return Promise.resolve('/usr/bin/claude');
        return Promise.reject(new Error('not found'));
      });
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('git')) return 'git version 1.9.0';
        if (cmd.includes('claude')) return 'claude version 1.0.0';
        return '';
      });

      const result = await checkAllTools();

      expect(result.allInstalled).toBe(true);
      expect(result.allMeetRequirements).toBe(false);
      expect(result.git.meetsMinimum).toBe(false);
    });
  });
});