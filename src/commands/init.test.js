import { jest } from '@jest/globals';
import { 
  mockProcess, 
  mockFs, 
  captureOutput, 
  resetAllMocks,
  createMockOra
} from '../../test/helpers/mocks.js';
import path from 'path';

// Mock all dependencies
jest.unstable_mockModule('fs/promises', () => mockFs);
jest.unstable_mockModule('ora', () => ({ default: createMockOra() }));

jest.unstable_mockModule('chalk', () => ({
  default: {
    green: jest.fn(text => `[GREEN]${text}[/GREEN]`),
    yellow: jest.fn(text => `[YELLOW]${text}[/YELLOW]`),
    red: jest.fn(text => `[RED]${text}[/RED]`),
    blue: jest.fn(text => `[BLUE]${text}[/BLUE]`),
    cyan: jest.fn(text => `[CYAN]${text}[/CYAN]`),
    gray: jest.fn(text => `[GRAY]${text}[/GRAY]`),
    dim: jest.fn(text => `[DIM]${text}[/DIM]`),
    bold: jest.fn(text => `[BOLD]${text}[/BOLD]`)
  }
}));

jest.unstable_mockModule('../ui/banner.js', () => ({
  showBanner: jest.fn()
}));

jest.unstable_mockModule('../ui/selector.js', () => ({
  createScriptSelector: jest.fn(() => Promise.resolve('bash'))
}));

jest.unstable_mockModule('../ui/tracker.js', () => ({
  createLiveTracker: jest.fn(() => ({
    start: jest.fn(),
    update: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn()
  }))
}));

jest.unstable_mockModule('../utils/tools.js', () => ({
  checkAllTools: jest.fn()
}));

jest.unstable_mockModule('../utils/git.js', () => ({
  initRepository: jest.fn(() => Promise.resolve(true))
}));

jest.unstable_mockModule('../utils/templates.js', () => ({
  downloadTemplate: jest.fn(() => Promise.resolve('/tmp/template.zip')),
  extractTemplate: jest.fn()
}));

jest.unstable_mockModule('../utils/files.js', () => ({
  createDirectory: jest.fn(),
  fileExists: jest.fn(() => Promise.resolve(false)),
  deleteDirectory: jest.fn()
}));

jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn()
}));

// Import after mocking
const { initCommand } = await import('./init.js');
const { showBanner } = await import('../ui/banner.js');
const { createScriptSelector } = await import('../ui/selector.js');
const { createLiveTracker } = await import('../ui/tracker.js');
const { checkAllTools } = await import('../utils/tools.js');
const { initRepository } = await import('../utils/git.js');
const { downloadTemplate, extractTemplate } = await import('../utils/templates.js');
const { createDirectory, fileExists, deleteDirectory } = await import('../utils/files.js');

describe('init command', () => {
  let mockTracker;

  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
    
    // Setup tracker mock
    mockTracker = {
      start: jest.fn(),
      update: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn()
    };
    createLiveTracker.mockReturnValue(mockTracker);

    // Setup default mock behaviors
    checkAllTools.mockResolvedValue();
    initRepository.mockResolvedValue(true);
    fileExists.mockResolvedValue(false);
    createDirectory.mockResolvedValue();
    downloadTemplate.mockResolvedValue('/tmp/template.zip');
    extractTemplate.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful initialization', () => {
    it('should initialize project with default settings', async () => {
      const output = captureOutput();

      await initCommand('my-project');

      // Check banner was shown
      expect(showBanner).toHaveBeenCalled();

      // Check project directory was created
      expect(createDirectory).toHaveBeenCalledWith(
        expect.stringContaining('my-project')
      );

      // Check git was initialized
      expect(initRepository).toHaveBeenCalledWith(
        expect.stringContaining('my-project')
      );

      // Check templates were downloaded
      expect(downloadTemplate).toHaveBeenCalledWith(
        'bash',
        expect.stringContaining('my-project'),
        { aiTool: 'claude-code' }
      );

      // Check success message
      const outputText = output.getOutput();
      expect(outputText).toContain('[GREEN]');
      expect(outputText).toContain('successfully initialized');
    });

    it('should handle PowerShell on Windows', async () => {
      mockProcess.platform = 'win32';
      createScriptSelector.mockResolvedValue('ps');

      await initCommand('windows-project', { aiTool: 'cursor' });

      expect(downloadTemplate).toHaveBeenCalledWith(
        'ps',
        expect.stringContaining('windows-project'),
        { aiTool: 'cursor' }
      );
    });

    it('should use provided script type', async () => {
      await initCommand('script-project', { script: 'ps' });

      expect(createScriptSelector).not.toHaveBeenCalled();
      expect(downloadTemplate).toHaveBeenCalledWith(
        'ps',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should handle --here flag', async () => {
      await initCommand(null, { here: true });

      expect(createDirectory).not.toHaveBeenCalled();
      expect(downloadTemplate).toHaveBeenCalledWith(
        expect.any(String),
        process.cwd(),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing project name', async () => {
      const output = captureOutput();
      mockProcess.exit.mockImplementation(() => {
        throw new Error('Process exited');
      });

      await expect(initCommand()).rejects.toThrow('Process exited');

      const outputText = output.getOutput();
      expect(outputText).toContain('[RED]');
      expect(outputText).toContain('Please provide a project name');
    });

    it('should handle existing directory', async () => {
      fileExists.mockResolvedValue(true);
      mockProcess.exit.mockImplementation(() => {
        throw new Error('Process exited');
      });

      await expect(initCommand('existing-project')).rejects.toThrow();

      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle git initialization failure', async () => {
      initRepository.mockResolvedValue(false);

      await initCommand('git-fail-project');

      // Should continue despite git failure
      expect(downloadTemplate).toHaveBeenCalled();
    });

    it('should handle template download errors', async () => {
      downloadTemplate.mockRejectedValue(new Error('Download failed'));

      await expect(initCommand('template-fail')).rejects.toThrow('Download failed');
      expect(mockTracker.fail).toHaveBeenCalled();
    });

    it('should cleanup on failure', async () => {
      downloadTemplate.mockRejectedValue(new Error('Network error'));

      await expect(initCommand('cleanup-test')).rejects.toThrow();

      expect(deleteDirectory).toHaveBeenCalledWith(
        expect.stringContaining('cleanup-test')
      );
    });
  });

  describe('script selection', () => {
    it('should prompt for script type if not provided', async () => {
      await initCommand('prompt-project');

      expect(createScriptSelector).toHaveBeenCalled();
    });

    it('should use Windows default on Windows', async () => {
      mockProcess.platform = 'win32';

      await initCommand('windows-default');

      expect(createScriptSelector).toHaveBeenCalledWith('ps');
    });

    it('should use bash default on Unix', async () => {
      mockProcess.platform = 'darwin';

      await initCommand('unix-default');

      expect(createScriptSelector).toHaveBeenCalledWith('sh');
    });

    it('should handle script selection cancellation', async () => {
      createScriptSelector.mockResolvedValue(null);
      mockProcess.exit.mockImplementation(() => {
        throw new Error('Process exited');
      });

      await expect(initCommand('cancelled')).rejects.toThrow();

      expect(downloadTemplate).not.toHaveBeenCalled();
    });
  });

  describe('progress tracking', () => {
    it('should track all initialization steps', async () => {
      await initCommand('tracked-project');

      expect(createLiveTracker).toHaveBeenCalledWith('Initializing project');
      expect(mockTracker.start).toHaveBeenCalled();
      expect(mockTracker.update).toHaveBeenCalled();
      expect(mockTracker.succeed).toHaveBeenCalled();
    });

    it('should skip git step with --no-git', async () => {
      await initCommand('no-git-project', { noGit: true });

      expect(initRepository).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should reject both project name and --here', async () => {
      mockProcess.exit.mockImplementation(() => {
        throw new Error('Process exited');
      });

      await expect(initCommand('project', { here: true })).rejects.toThrow();

      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should validate script type', async () => {
      mockProcess.exit.mockImplementation(() => {
        throw new Error('Process exited');
      });

      await expect(initCommand('project', { script: 'invalid' })).rejects.toThrow();
    });
  });
});