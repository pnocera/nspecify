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
// jest.unstable_mockModule('fs/promises', () => mockFs); // Replaced with node:fs/promises mock
jest.unstable_mockModule('ora', () => ({ default: createMockOra() }));

jest.unstable_mockModule('chalk', () => {
  // Create a simple mock that supports chaining
  const mockStyle = (text) => text || '';
  
  const createStyle = () => {
    const style = Object.assign(
      jest.fn((text) => text || ''),
      {
        green: Object.assign(jest.fn((text) => text || ''), {
          bold: jest.fn((text) => text || '')
        }),
        yellow: Object.assign(jest.fn((text) => text || ''), {
          bold: jest.fn((text) => text || '')
        }),
        red: Object.assign(jest.fn((text) => text || ''), {
          bold: jest.fn((text) => text || '')
        }),
        blue: Object.assign(jest.fn((text) => text || ''), {
          bold: jest.fn((text) => text || '')
        }),
        cyan: Object.assign(jest.fn((text) => text || ''), {
          bold: jest.fn((text) => text || '')
        }),
        gray: Object.assign(jest.fn((text) => text || ''), {
          bold: jest.fn((text) => text || '')
        }),
        dim: Object.assign(jest.fn((text) => text || ''), {
          bold: jest.fn((text) => text || '')
        }),
        bold: jest.fn((text) => text || '')
      }
    );
    return style;
  };
  
  return {
    default: createStyle()
  };
});

jest.unstable_mockModule('../ui/banner.js', () => ({
  showBanner: jest.fn()
}));

jest.unstable_mockModule('../ui/selector.js', () => ({
  createScriptSelector: jest.fn(() => Promise.resolve('bash'))
}));

jest.unstable_mockModule('../ui/tracker.js', () => ({
  createLiveTracker: jest.fn(() => ({
    addStep: jest.fn(),
    updateStatus: jest.fn(),
    stop: jest.fn(),
    tracker: {
      addStep: jest.fn(),
      start: jest.fn(),
      update: jest.fn(),
      complete: jest.fn(),
      error: jest.fn(),
      skip: jest.fn()
    },
    updater: {
      start: jest.fn(),
      stop: jest.fn(),
      queue: jest.fn(),
      processQueue: jest.fn(),
      finish: jest.fn()
    }
  }))
}));

jest.unstable_mockModule('../utils/tools.js', () => ({
  checkAllTools: jest.fn(() => Promise.resolve({
    git: {
      installed: true,
      path: '/usr/bin/git',
      version: { major: 2, minor: 30, patch: 0, full: '2.30.0' },
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
  }))
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

jest.unstable_mockModule('node:child_process', () => ({
  execSync: jest.fn(() => 'mocked git output')
}));

jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn(() => 'mocked git output')
}));

jest.unstable_mockModule('../utils/errors.js', () => ({
  handleError: jest.fn(),
  ErrorMessages: {
    DIRECTORY_EXISTS: 'Directory already exists',
    INVALID_SCRIPT_TYPE: 'Invalid script type. Choose either "posix" for shell scripts or "powershell" for Windows.'
  },
  createError: jest.fn((message, type, context) => {
    const error = new Error(message);
    error.type = type;
    error.context = context;
    return error;
  }),
  ErrorTypes: {
    INVALID_INPUT: 'INVALID_INPUT',
    FILE_SYSTEM: 'FILE_SYSTEM',
    MISSING_DEPENDENCY: 'MISSING_DEPENDENCY'
  }
}));

jest.unstable_mockModule('node:fs/promises', () => ({
  default: {
    unlink: jest.fn(() => Promise.resolve()),
    readdir: jest.fn(() => Promise.resolve(['script.sh'])),
    chmod: jest.fn(() => Promise.resolve())
  },
  unlink: jest.fn(() => Promise.resolve()),
  readdir: jest.fn(() => Promise.resolve(['script.sh'])),
  chmod: jest.fn(() => Promise.resolve())
}));

jest.unstable_mockModule('node:os', () => ({
  default: {
    platform: jest.fn(() => mockProcess.platform)
  },
  platform: jest.fn(() => mockProcess.platform)
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
const { createError, ErrorTypes } = await import('../utils/errors.js');
const { execSync } = await import('child_process');

describe('init command', () => {
  let mockTracker;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // Mock console methods to suppress output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    resetAllMocks();
    global.process = mockProcess;
    // Ensure process.cwd() returns a valid string
    mockProcess.cwd.mockReturnValue('E:\\Projects\\test');
    // Reset platform to default
    mockProcess.platform = 'win32';
    
    // Setup tracker mock
    mockTracker = {
      addStep: jest.fn(),
      updateStatus: jest.fn(),
      stop: jest.fn(),
      tracker: {
        addStep: jest.fn(),
        start: jest.fn(),
        update: jest.fn(),
        complete: jest.fn(),
        error: jest.fn(),
        skip: jest.fn()
      },
      updater: {
        start: jest.fn(),
        stop: jest.fn(),
        queue: jest.fn(),
        processQueue: jest.fn(),
        finish: jest.fn()
      }
    };
    createLiveTracker.mockReturnValue(mockTracker);

    // Setup default mock behaviors
    checkAllTools.mockResolvedValue({
      git: {
        installed: true,
        path: '/usr/bin/git',
        version: { major: 2, minor: 30, patch: 0, full: '2.30.0' },
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
    initRepository.mockResolvedValue(true);
    fileExists.mockResolvedValue(false);
    createDirectory.mockResolvedValue();
    downloadTemplate.mockResolvedValue('/tmp/template.zip');
    extractTemplate.mockResolvedValue();
    execSync.mockReturnValue('success');
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('successful initialization', () => {
    it('should initialize project with default settings', async () => {
      const output = captureOutput();
      
      try {
        // Ensure the script selector returns a valid script type
        createScriptSelector.mockResolvedValue('sh');

        // Make sure all async operations resolve
        downloadTemplate.mockResolvedValue('/tmp/template.zip');
        extractTemplate.mockResolvedValue();
        initRepository.mockResolvedValue(true);

        try {
          await initCommand('my-project');
        } catch (error) {
          output.restore();
          // Use the original console.log for debugging (if needed)
          // consoleLogSpy.mockRestore();
          // console.log('Error in initCommand:', error.message, error.stack);
          // consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
          throw error;
        }

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
          'sh',
          expect.stringContaining('my-project'),
          { aiTool: 'claude-code' }
        );

        // Check that the process completed and captured the expected logs
        const outputText = output.getOutput();
        
        // Verify the function ran through the initialization process
        expect(outputText).toContain('Initializing project in:');
        expect(outputText).toContain('Checking system requirements');
        expect(outputText).toContain('All requirements met');
        expect(outputText).toContain('Using script type: sh');
      } finally {
        output.restore();
      }
    });

    it('should handle PowerShell on Windows', async () => {
      mockProcess.platform = 'win32';
      // Don't call selector when aiTool is provided, just set the script type directly
      await initCommand('windows-project', { aiTool: 'cursor', script: 'ps' });

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
      await expect(initCommand()).rejects.toThrow('Please provide a project name or use --here flag');
    });

    it('should handle existing directory', async () => {
      fileExists.mockResolvedValue(true);

      await expect(initCommand('existing-project')).rejects.toThrow('Directory already exists');
    });

    it('should handle git initialization failure', async () => {
      initRepository.mockResolvedValue(false);

      await initCommand('git-fail-project');

      // Should continue despite git failure
      expect(downloadTemplate).toHaveBeenCalled();
    });

    it('should handle template download errors', async () => {
      createScriptSelector.mockResolvedValue('sh');
      
      // Clear the default mock and set up the rejection
      downloadTemplate.mockClear();
      downloadTemplate.mockRejectedValue(new Error('Download failed'));

      await expect(initCommand('template-fail')).rejects.toThrow('Download failed');
      expect(mockTracker.stop).toHaveBeenCalled();
    });

    it('should cleanup on failure', async () => {
      createScriptSelector.mockResolvedValue('sh');
      
      // Clear the default mock and set up the rejection
      downloadTemplate.mockClear();
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
      createScriptSelector.mockResolvedValue('ps');

      await initCommand('windows-default');

      expect(createScriptSelector).toHaveBeenCalledWith('ps');
    });

    it('should use bash default on Unix', async () => {
      mockProcess.platform = 'darwin';
      createScriptSelector.mockResolvedValue('sh');

      await initCommand('unix-default');

      expect(createScriptSelector).toHaveBeenCalledWith('sh');
    });

    it('should handle script selection cancellation', async () => {
      createScriptSelector.mockResolvedValue(null);
      mockProcess.exit.mockImplementation(() => {
        throw new Error('Process exited');
      });

      await expect(initCommand('cancelled')).rejects.toThrow('Process exited');

      expect(downloadTemplate).not.toHaveBeenCalled();
    });
  });

  describe('progress tracking', () => {
    it('should track all initialization steps', async () => {
      createScriptSelector.mockResolvedValue('sh');
      
      await initCommand('tracked-project');

      expect(createLiveTracker).toHaveBeenCalledWith('Initializing project');
      expect(mockTracker.updateStatus).toHaveBeenCalled();
      expect(mockTracker.stop).toHaveBeenCalled();
    });

    it('should skip git step with --no-git', async () => {
      createScriptSelector.mockResolvedValue('sh');
      
      await initCommand('no-git-project', { noGit: true });

      expect(initRepository).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should reject both project name and --here', async () => {
      await expect(initCommand('project', { here: true })).rejects.toThrow('Cannot specify both project name and --here flag');
    });

    it('should validate script type', async () => {
      await expect(initCommand('project', { script: 'invalid' })).rejects.toThrow('Invalid script type');
    });
  });
});