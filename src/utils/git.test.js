import { jest } from '@jest/globals';
import { mockGit, createMockGit, resetAllMocks } from '../../test/helpers/mocks.js';
import { fixtures } from '../../test/helpers/fixtures.js';

// Mock simple-git
jest.unstable_mockModule('simple-git', () => ({
  default: createMockGit()
}));

const { checkGitRepo, initGitRepo, getGitStatus } = await import('./git.js');

describe('git', () => {
  beforeEach(() => {
    resetAllMocks();
    
    // Reset git mock to default state
    mockGit.checkIsRepo.mockResolvedValue(false);
    mockGit.status.mockResolvedValue(fixtures.gitStatus.clean);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkGitRepo', () => {
    it('should return true for existing git repo', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);

      const result = await checkGitRepo('/path/to/repo');

      expect(result).toBe(true);
      expect(mockGit.checkIsRepo).toHaveBeenCalled();
    });

    it('should return false for non-git directory', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false);

      const result = await checkGitRepo('/path/to/non-repo');

      expect(result).toBe(false);
      expect(mockGit.checkIsRepo).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockGit.checkIsRepo.mockRejectedValue(new Error('Permission denied'));

      const result = await checkGitRepo('/path/to/repo');

      expect(result).toBe(false);
    });

    it('should work with Windows paths', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);

      const result = await checkGitRepo('C:\\Projects\\my-repo');

      expect(result).toBe(true);
      expect(mockGit.checkIsRepo).toHaveBeenCalled();
    });
  });

  describe('initGitRepo', () => {
    it('should initialize a new git repository', async () => {
      mockGit.init.mockResolvedValue({ existing: false });

      const result = await initGitRepo('/path/to/new-repo');

      expect(result).toBe(true);
      expect(mockGit.init).toHaveBeenCalled();
    });

    it('should handle existing repository', async () => {
      mockGit.init.mockResolvedValue({ existing: true });

      const result = await initGitRepo('/path/to/existing-repo');

      expect(result).toBe(true);
      expect(mockGit.init).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockGit.init.mockRejectedValue(new Error('Permission denied'));

      const result = await initGitRepo('/path/to/repo');

      expect(result).toBe(false);
    });

    it('should work with Windows paths', async () => {
      mockGit.init.mockResolvedValue({ existing: false });

      const result = await initGitRepo('E:\\Projects\\new-repo');

      expect(result).toBe(true);
      expect(mockGit.init).toHaveBeenCalled();
    });
  });

  describe('getGitStatus', () => {
    it('should return clean status', async () => {
      mockGit.status.mockResolvedValue(fixtures.gitStatus.clean);

      const result = await getGitStatus('/path/to/repo');

      expect(result).toEqual({
        isClean: true,
        branch: 'main',
        modified: [],
        staged: [],
        untracked: [],
        ahead: 0,
        behind: 0
      });
    });

    it('should return dirty status with changes', async () => {
      mockGit.status.mockResolvedValue(fixtures.gitStatus.dirty);

      const result = await getGitStatus('/path/to/repo');

      expect(result).toEqual({
        isClean: false,
        branch: 'feature/test',
        modified: ['src/index.js', 'README.md'],
        staged: ['new-file.js'],
        untracked: ['test.js'],
        ahead: 2,
        behind: 0
      });
    });

    it('should handle status check errors', async () => {
      mockGit.status.mockRejectedValue(new Error('Not a git repository'));

      const result = await getGitStatus('/path/to/repo');

      expect(result).toEqual({
        isClean: true,
        branch: 'unknown',
        modified: [],
        staged: [],
        untracked: [],
        ahead: 0,
        behind: 0
      });
    });

    it('should handle conflicted files', async () => {
      const statusWithConflicts = {
        ...fixtures.gitStatus.dirty,
        conflicted: ['conflict.js', 'merge.js']
      };
      mockGit.status.mockResolvedValue(statusWithConflicts);

      const result = await getGitStatus('/path/to/repo');

      expect(result.isClean).toBe(false);
      expect(result.modified).toContain('conflict.js');
      expect(result.modified).toContain('merge.js');
    });

    it('should handle renamed files', async () => {
      const statusWithRenamed = {
        ...fixtures.gitStatus.clean,
        renamed: [{ from: 'old.js', to: 'new.js' }]
      };
      mockGit.status.mockResolvedValue(statusWithRenamed);

      const result = await getGitStatus('/path/to/repo');

      expect(result.isClean).toBe(false);
      expect(result.staged).toContain('new.js');
    });

    it('should correctly identify staged files', async () => {
      const statusWithStaged = {
        ...fixtures.gitStatus.clean,
        files: [
          { path: 'staged1.js', index: 'A', working_dir: ' ' },
          { path: 'staged2.js', index: 'M', working_dir: ' ' },
          { path: 'modified.js', index: ' ', working_dir: 'M' },
          { path: 'both.js', index: 'M', working_dir: 'M' }
        ],
        created: ['staged1.js'],
        modified: ['staged2.js', 'modified.js', 'both.js']
      };
      mockGit.status.mockResolvedValue(statusWithStaged);

      const result = await getGitStatus('/path/to/repo');

      expect(result.staged).toContain('staged1.js');
      expect(result.staged).toContain('staged2.js');
      expect(result.staged).toContain('both.js');
      expect(result.modified).toContain('modified.js');
      expect(result.modified).toContain('both.js');
    });

    it('should handle detached HEAD state', async () => {
      const detachedStatus = {
        ...fixtures.gitStatus.clean,
        current: 'HEAD',
        detached: true
      };
      mockGit.status.mockResolvedValue(detachedStatus);

      const result = await getGitStatus('/path/to/repo');

      expect(result.branch).toBe('HEAD');
    });

    it('should handle empty repository', async () => {
      const emptyStatus = {
        current: null,
        tracking: null,
        ahead: 0,
        behind: 0,
        modified: [],
        not_added: [],
        deleted: [],
        created: [],
        conflicted: [],
        renamed: [],
        files: []
      };
      mockGit.status.mockResolvedValue(emptyStatus);

      const result = await getGitStatus('/path/to/repo');

      expect(result.branch).toBe('unknown');
      expect(result.isClean).toBe(true);
    });
  });
});