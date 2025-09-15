import { jest } from '@jest/globals';
import { resetAllMocks } from '../../test/helpers/mocks.js';
import { fixtures } from '../../test/helpers/fixtures.js';

// Mock simple-git
const mockGit = {
  status: jest.fn(),
  init: jest.fn(),
  add: jest.fn(),
  commit: jest.fn(),
  addConfig: jest.fn()
};

const mockSimpleGit = jest.fn(() => mockGit);

jest.unstable_mockModule('simple-git', () => ({
  simpleGit: mockSimpleGit
}));

// Mock fs
jest.unstable_mockModule('fs', () => ({
  existsSync: jest.fn(() => true)
}));

// Mock chalk
jest.unstable_mockModule('chalk', () => ({
  default: {
    green: jest.fn(text => `[GREEN]${text}[/GREEN]`),
    red: jest.fn(text => `[RED]${text}[/RED]`),
    yellow: jest.fn(text => `[YELLOW]${text}[/YELLOW]`),
    gray: jest.fn(text => `[GRAY]${text}[/GRAY]`),
    bold: jest.fn(text => `[BOLD]${text}[/BOLD]`)
  }
}));

const { isGitRepository, initRepository, createInitialCommit, getRepositoryStatus, setupGitRepository, printRepositoryStatus } = await import('./git.js');
const fs = await import('fs');

describe('git', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // Mock console methods to suppress output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    resetAllMocks();
    
    // Reset git mock to default state
    mockGit.status.mockResolvedValue(fixtures.gitStatus.clean);
    mockGit.init.mockResolvedValue({ existing: false });
    mockGit.add.mockResolvedValue();
    mockGit.commit.mockResolvedValue({ commit: 'abc123' });
    mockGit.addConfig.mockResolvedValue();
    fs.existsSync.mockReturnValue(true);
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true for existing git repo', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockResolvedValue(fixtures.gitStatus.clean);

      const result = await isGitRepository('/path/to/repo');

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('\\path\\to\\repo\\.git');
      expect(mockGit.status).toHaveBeenCalled();
    });

    it('should return false for non-git directory', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await isGitRepository('/path/to/non-repo');

      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith('\\path\\to\\non-repo\\.git');
    });

    it('should handle errors gracefully', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockRejectedValue(new Error('Permission denied'));

      const result = await isGitRepository('/path/to/repo');

      expect(result).toBe(false);
    });

    it('should work with Windows paths', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockResolvedValue(fixtures.gitStatus.clean);

      const result = await isGitRepository('C:\\Projects\\my-repo');

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('C:\\Projects\\my-repo\\.git');
    });
  });

  describe('initRepository', () => {
    it('should initialize a new git repository', async () => {
      fs.existsSync.mockReturnValue(false); // Not a repo yet
      mockGit.init.mockResolvedValue();

      const result = await initRepository('/path/to/new-repo');

      expect(result.success).toBe(true);
      expect(result.alreadyExists).toBe(false);
      expect(mockGit.init).toHaveBeenCalledWith(['--initial-branch=main']);
    });

    it('should handle existing repository', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockResolvedValue(fixtures.gitStatus.clean);

      const result = await initRepository('/path/to/existing-repo');

      expect(result.success).toBe(true);
      expect(result.alreadyExists).toBe(true);
    });

    it('should handle initialization errors', async () => {
      fs.existsSync.mockReturnValue(false);
      mockGit.init.mockRejectedValue(new Error('Permission denied'));

      const result = await initRepository('/path/to/repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should work with Windows paths', async () => {
      fs.existsSync.mockReturnValue(false);
      mockGit.init.mockResolvedValue();

      const result = await initRepository('E:\\Projects\\new-repo');

      expect(result.success).toBe(true);
      expect(result.path).toBe('E:\\Projects\\new-repo');
    });

    it('should support custom initial branch', async () => {
      fs.existsSync.mockReturnValue(false);
      mockGit.init.mockResolvedValue();

      const result = await initRepository('/path/to/repo', { initialBranch: 'develop' });

      expect(result.success).toBe(true);
      expect(mockGit.init).toHaveBeenCalledWith(['--initial-branch=develop']);
    });

    it('should support dry run mode', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await initRepository('/path/to/repo', { dryRun: true });

      expect(result.success).toBe(true);
      expect(mockGit.init).not.toHaveBeenCalled();
    });
  });

  describe('createInitialCommit', () => {
    it('should create initial commit', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockResolvedValue({
        ...fixtures.gitStatus.clean,
        not_added: ['README.md', 'src/index.js'],
        isClean: () => false
      });
      mockGit.add.mockResolvedValue();
      mockGit.commit.mockResolvedValue({ commit: 'abc1234567890' });

      const result = await createInitialCommit('/path/to/repo');

      expect(result.success).toBe(true);
      expect(result.commitHash).toBe('abc1234567890');
      expect(result.filesCommitted).toBe(2);
      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith('Initial commit');
    });

    it('should handle no files to commit', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockResolvedValue(fixtures.gitStatus.clean);

      const result = await createInitialCommit('/path/to/repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No files to commit');
    });

    it('should handle not a git repository', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await createInitialCommit('/path/to/repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not a git repository');
    });

    it('should support custom commit message', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockResolvedValue({
        ...fixtures.gitStatus.clean,
        not_added: ['README.md'],
        isClean: () => false
      });
      mockGit.commit.mockResolvedValue({ commit: 'def456' });

      const result = await createInitialCommit('/path/to/repo', { message: 'Custom message' });

      expect(result.success).toBe(true);
      expect(mockGit.commit).toHaveBeenCalledWith('Custom message');
    });

    it('should support custom author', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockResolvedValue({
        ...fixtures.gitStatus.clean,
        not_added: ['README.md'],
        isClean: () => false
      });
      mockGit.commit.mockResolvedValue({ commit: 'ghi789' });

      const author = { name: 'Test User', email: 'test@example.com' };
      const result = await createInitialCommit('/path/to/repo', { author });

      expect(result.success).toBe(true);
      expect(mockGit.addConfig).toHaveBeenCalledWith('user.name', 'Test User');
      expect(mockGit.addConfig).toHaveBeenCalledWith('user.email', 'test@example.com');
    });

    it('should support dry run mode', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockResolvedValue({
        ...fixtures.gitStatus.clean,
        not_added: ['README.md'],
        isClean: () => false
      });

      const result = await createInitialCommit('/path/to/repo', { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.filesCommitted).toBe(1);
      expect(mockGit.add).not.toHaveBeenCalled();
      expect(mockGit.commit).not.toHaveBeenCalled();
    });

    it('should handle commit errors', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockResolvedValue({
        ...fixtures.gitStatus.clean,
        not_added: ['README.md'],
        isClean: () => false
      });
      mockGit.commit.mockRejectedValue(new Error('Commit failed'));

      const result = await createInitialCommit('/path/to/repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Commit failed');
    });
  });

  describe('getRepositoryStatus', () => {
    it('should return repository status', async () => {
      const mockStatus = {
        ...fixtures.gitStatus.clean,
        staged: ['staged.js'],
        isClean: () => true
      };
      mockGit.status.mockResolvedValue(mockStatus);

      const result = await getRepositoryStatus('/path/to/repo');

      expect(result.success).toBe(true);
      expect(result.branch).toBe('main');
      expect(result.isClean).toBe(true);
      expect(result.ahead).toBe(0);
      expect(result.behind).toBe(0);
    });

    it('should return dirty status', async () => {
      const mockStatus = {
        ...fixtures.gitStatus.dirty,
        isClean: () => false
      };
      mockGit.status.mockResolvedValue(mockStatus);

      const result = await getRepositoryStatus('/path/to/repo');

      expect(result.success).toBe(true);
      expect(result.branch).toBe('feature/test');
      expect(result.isClean).toBe(false);
      expect(result.ahead).toBe(2);
      expect(result.modified).toEqual(['src/index.js', 'README.md']);
    });

    it('should handle status errors', async () => {
      mockGit.status.mockRejectedValue(new Error('Not a git repository'));

      const result = await getRepositoryStatus('/path/to/repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not a git repository');
    });
  });

  describe('setupGitRepository', () => {
    it('should setup new repository with initial commit', async () => {
      // Mock for initRepository - starts as not a repo
      fs.existsSync
        .mockReturnValueOnce(false) // First call: not a git repo
        .mockReturnValue(true); // After init: becomes a git repo
      mockGit.init.mockResolvedValue();
      
      // Mock for createInitialCommit - need to mock for the status check
      mockGit.status.mockResolvedValue({
        ...fixtures.gitStatus.clean,
        not_added: ['README.md'],
        isClean: () => false
      });
      mockGit.commit.mockResolvedValue({ commit: 'abc123' });

      const result = await setupGitRepository('/path/to/repo');

      expect(result.success).toBe(true);
      expect(result.initialized).toBe(true);
      expect(result.committed).toBe(true);
      expect(result.commitHash).toBe('abc123');
    });

    it('should handle existing repository', async () => {
      fs.existsSync.mockReturnValue(true);
      mockGit.status.mockResolvedValue(fixtures.gitStatus.clean);

      const result = await setupGitRepository('/path/to/repo');

      expect(result.success).toBe(true);
      expect(result.initialized).toBe(false);
      expect(result.committed).toBe(false);
      expect(result.alreadyExists).toBe(true);
    });

    it('should handle setup without initial commit', async () => {
      fs.existsSync.mockReturnValue(false);
      mockGit.init.mockResolvedValue();

      const result = await setupGitRepository('/path/to/repo', { initialCommit: false });

      expect(result.success).toBe(true);
      expect(result.initialized).toBe(true);
      expect(result.committed).toBe(false);
    });

    it('should handle initialization failure', async () => {
      fs.existsSync.mockReturnValue(false);
      mockGit.init.mockRejectedValue(new Error('Permission denied'));

      const result = await setupGitRepository('/path/to/repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('printRepositoryStatus', () => {
    it('should print successful status', () => {
      const status = {
        success: true,
        branch: 'main',
        isClean: true,
        staged: [],
        modified: [],
        notAdded: []
      };

      // Should not throw
      expect(() => printRepositoryStatus(status)).not.toThrow();
    });

    it('should print dirty status', () => {
      const status = {
        success: true,
        branch: 'feature/test',
        isClean: false,
        staged: ['staged.js'],
        modified: ['modified.js'],
        notAdded: ['untracked.js']
      };

      // Should not throw
      expect(() => printRepositoryStatus(status)).not.toThrow();
    });

    it('should handle error status', () => {
      const status = {
        success: false,
        error: 'Not a git repository'
      };

      // Should not throw
      expect(() => printRepositoryStatus(status)).not.toThrow();
    });
  });
});