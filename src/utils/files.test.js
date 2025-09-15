import { jest } from '@jest/globals';
import { mockFs, mockProcess, resetAllMocks } from '../../test/helpers/mocks.js';
import path from 'path';

// Mock fs module
const mockFsSync = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  copyFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  renameSync: jest.fn(),
  unlinkSync: jest.fn(),
  rmSync: jest.fn(),
  promises: mockFs
};

// Mock fs/promises
jest.unstable_mockModule('fs/promises', () => mockFs);

// Mock fs sync functions
jest.unstable_mockModule('fs', () => mockFsSync);

const { 
  ensureDirectory, 
  fileExists, 
  copyFile,
  deleteDirectory,
  writeFileAtomic,
  readFileSafe,
  createDirectory
} = await import('./files.js');

describe('files', () => {
  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
    
    // Reset sync mocks (skip promises which is not a jest mock)
    Object.entries(mockFsSync).forEach(([key, mock]) => {
      if (key !== 'promises' && typeof mock.mockReset === 'function') {
        mock.mockReset();
      }
    });
    
    // Setup default mock behaviors for async functions
    mockFs.access.mockResolvedValue();
    mockFs.mkdir.mockResolvedValue();
    mockFs.writeFile.mockResolvedValue();
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.copyFile.mockResolvedValue();
    mockFs.rmdir.mockResolvedValue();
    mockFs.unlink.mockResolvedValue();
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });

    // Setup default mock behaviors for sync functions
    mockFsSync.existsSync.mockReturnValue(true);
    mockFsSync.mkdirSync.mockImplementation(() => {});
    mockFsSync.readFileSync.mockReturnValue('test content');
    mockFsSync.writeFileSync.mockImplementation(() => {});
    mockFsSync.copyFileSync.mockImplementation(() => {});
    mockFsSync.readdirSync.mockReturnValue([]);
    mockFsSync.statSync.mockReturnValue({ isDirectory: () => false });
    mockFsSync.renameSync.mockImplementation(() => {});
    mockFsSync.unlinkSync.mockImplementation(() => {});
    mockFsSync.rmSync.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', () => {
      mockFsSync.existsSync.mockReturnValue(false);

      const result = ensureDirectory('/path/to/dir');

      expect(result).toBe(true);
      expect(mockFsSync.existsSync).toHaveBeenCalledWith('/path/to/dir');
      expect(mockFsSync.mkdirSync).toHaveBeenCalledWith('/path/to/dir', { recursive: true, mode: 0o755 });
    });

    it('should not create directory if it already exists', () => {
      mockFsSync.existsSync.mockReturnValue(true);

      const result = ensureDirectory('/path/to/existing');

      expect(result).toBe(true);
      expect(mockFsSync.existsSync).toHaveBeenCalledWith('/path/to/existing');
      expect(mockFsSync.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle Windows paths', () => {
      mockFsSync.existsSync.mockReturnValue(false);

      const result = ensureDirectory('C:\\Projects\\test');

      expect(result).toBe(true);
      expect(mockFsSync.mkdirSync).toHaveBeenCalledWith('C:\\Projects\\test', { recursive: true, mode: 0o755 });
    });

    it('should handle mkdir errors and return false', () => {
      mockFsSync.existsSync.mockReturnValue(false);
      mockFsSync.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = ensureDirectory('/restricted/dir');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should create nested directories', () => {
      mockFsSync.existsSync.mockReturnValue(false);

      const result = ensureDirectory('/path/to/deeply/nested/dir');

      expect(result).toBe(true);
      expect(mockFsSync.mkdirSync).toHaveBeenCalledWith(
        '/path/to/deeply/nested/dir',
        { recursive: true, mode: 0o755 }
      );
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      mockFs.access.mockResolvedValue();

      const exists = await fileExists('/path/to/file.txt');

      expect(exists).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should return false for non-existing file', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const exists = await fileExists('/path/to/missing.txt');

      expect(exists).toBe(false);
    });

    it('should handle other errors as false', async () => {
      mockFs.access.mockRejectedValue(new Error('Permission denied'));

      const exists = await fileExists('/restricted/file.txt');

      expect(exists).toBe(false);
    });

    it('should work with Windows paths', async () => {
      mockFs.access.mockResolvedValue();

      const exists = await fileExists('E:\\Projects\\file.txt');

      expect(exists).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('E:\\Projects\\file.txt');
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', () => {
      mockFsSync.existsSync
        .mockReturnValueOnce(true)  // source exists
        .mockReturnValueOnce(false); // destination doesn't exist

      const result = copyFile('/source/file.txt', '/dest/file.txt');

      expect(result.success).toBe(true);
      expect(mockFsSync.copyFileSync).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
    });

    it('should handle source not found', () => {
      mockFsSync.existsSync.mockReturnValue(false);

      const result = copyFile('/missing/file.txt', '/dest/file.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source file not found');
    });

    it('should work with Windows paths', () => {
      mockFsSync.existsSync
        .mockReturnValueOnce(true)  // source exists
        .mockReturnValueOnce(false); // destination doesn't exist

      const result = copyFile('C:\\source\\file.txt', 'D:\\dest\\file.txt');

      expect(result.success).toBe(true);
      expect(mockFsSync.copyFileSync).toHaveBeenCalledWith('C:\\source\\file.txt', 'D:\\dest\\file.txt');
    });

    it('should handle backup when destination exists', () => {
      mockFsSync.existsSync
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(true); // destination exists

      const result = copyFile('/source/file.txt', '/dest/file.txt', { backup: true });

      expect(result.success).toBe(true);
      expect(result.backed_up).toBe(true);
      expect(mockFsSync.copyFileSync).toHaveBeenCalledWith('/dest/file.txt', '/dest/file.txt.backup');
      expect(mockFsSync.copyFileSync).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
    });

    it('should fail when ensureDirectory fails', () => {
      mockFsSync.existsSync
        .mockReturnValueOnce(true)  // source exists
        .mockReturnValueOnce(false) // destination doesn't exist
        .mockReturnValueOnce(false); // destination dir doesn't exist
      mockFsSync.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = copyFile('/source/file.txt', '/dest/file.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create destination directory');
      
      consoleSpy.mockRestore();
    });
  });

  describe('deleteDirectory', () => {
    it('should delete directory using sync method', () => {
      mockFsSync.existsSync.mockReturnValue(true);

      deleteDirectory('/test/dir');

      expect(mockFsSync.existsSync).toHaveBeenCalledWith('/test/dir');
      expect(mockFsSync.rmSync).toHaveBeenCalledWith('/test/dir', { recursive: true, force: true });
    });

    it('should not call rmSync if directory does not exist', () => {
      mockFsSync.existsSync.mockReturnValue(false);

      deleteDirectory('/missing/dir');

      expect(mockFsSync.existsSync).toHaveBeenCalledWith('/missing/dir');
      expect(mockFsSync.rmSync).not.toHaveBeenCalled();
    });
  });

  describe('createDirectory', () => {
    it('should create directory recursively', async () => {
      await createDirectory('/new/path/dir');

      expect(mockFs.mkdir).toHaveBeenCalledWith('/new/path/dir', { recursive: true });
    });

    it('should handle mkdir errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(createDirectory('/restricted/dir')).rejects.toThrow('Permission denied');
    });
  });

  describe('writeFileAtomic', () => {
    it('should write file atomically with sync methods', () => {
      mockFsSync.existsSync
        .mockReturnValueOnce(false) // directory exists check (for ensureDirectory)
        .mockReturnValueOnce(false) // file doesn't exist for backup
        .mockReturnValueOnce(false); // file doesn't exist before rename

      const result = writeFileAtomic('/path/to/file.txt', 'test content');

      expect(result.success).toBe(true);
      expect(mockFsSync.writeFileSync).toHaveBeenCalledWith('/path/to/file.txt.tmp', 'test content', { encoding: 'utf8' });
      expect(mockFsSync.renameSync).toHaveBeenCalledWith('/path/to/file.txt.tmp', '/path/to/file.txt');
    });

    it('should backup existing file when requested', () => {
      mockFsSync.existsSync
        .mockReturnValueOnce(true)  // directory exists (for ensureDirectory)
        .mockReturnValueOnce(true)  // file exists for backup
        .mockReturnValueOnce(true); // file exists before rename

      const result = writeFileAtomic('/path/to/file.txt', 'new content', { backup: true });

      expect(result.success).toBe(true);
      expect(result.backed_up).toBe(true);
      expect(mockFsSync.copyFileSync).toHaveBeenCalledWith('/path/to/file.txt', '/path/to/file.txt.backup');
    });

    it('should handle directory creation failure', () => {
      mockFsSync.existsSync.mockReturnValue(false);
      mockFsSync.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = writeFileAtomic('/path/to/file.txt', 'test content');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create directory');
      
      consoleSpy.mockRestore();
    });
  });

  describe('readFileSafe', () => {
    it('should read file successfully with sync methods', () => {
      mockFsSync.existsSync.mockReturnValue(true);
      mockFsSync.readFileSync.mockReturnValue('test content');

      const result = readFileSafe('/path/to/file.txt');

      expect(result.success).toBe(true);
      expect(result.content).toBe('test content');
      expect(result.error).toBeNull();
      expect(mockFsSync.existsSync).toHaveBeenCalledWith('/path/to/file.txt');
      expect(mockFsSync.readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf8');
    });

    it('should return error for non-existent file', () => {
      mockFsSync.existsSync.mockReturnValue(false);

      const result = readFileSafe('/missing/file.txt');

      expect(result.success).toBe(false);
      expect(result.content).toBeNull();
      expect(result.error).toContain('File not found');
    });

    it('should handle read errors', () => {
      mockFsSync.existsSync.mockReturnValue(true);
      mockFsSync.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = readFileSafe('/restricted/file.txt');

      expect(result.success).toBe(false);
      expect(result.content).toBeNull();
      expect(result.error).toBe('Permission denied');
    });

    it('should support custom encoding', () => {
      mockFsSync.existsSync.mockReturnValue(true);
      mockFsSync.readFileSync.mockReturnValue('binary content');

      const result = readFileSafe('/path/to/file.bin', { encoding: 'binary' });

      expect(result.success).toBe(true);
      expect(mockFsSync.readFileSync).toHaveBeenCalledWith('/path/to/file.bin', 'binary');
    });
  });
});