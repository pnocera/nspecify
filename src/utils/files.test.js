import { jest } from '@jest/globals';
import { mockFs, mockProcess, resetAllMocks } from '../../test/helpers/mocks.js';
import path from 'path';

// Mock fs/promises
jest.unstable_mockModule('fs/promises', () => mockFs);

const { 
  ensureDirectory, 
  fileExists, 
  copyFile,
  removeDirectory,
  writeJsonFile,
  readJsonFile
} = await import('./files.js');

describe('files', () => {
  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
    
    // Setup default mock behaviors
    mockFs.access.mockResolvedValue();
    mockFs.mkdir.mockResolvedValue();
    mockFs.writeFile.mockResolvedValue();
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.copyFile.mockResolvedValue();
    mockFs.rmdir.mockResolvedValue();
    mockFs.unlink.mockResolvedValue();
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await ensureDirectory('/path/to/dir');

      expect(mockFs.mkdir).toHaveBeenCalledWith('/path/to/dir', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      mockFs.access.mockResolvedValue();

      await ensureDirectory('/path/to/existing');

      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('should handle Windows paths', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await ensureDirectory('C:\\Projects\\test');

      expect(mockFs.mkdir).toHaveBeenCalledWith('C:\\Projects\\test', { recursive: true });
    });

    it('should handle mkdir errors', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(ensureDirectory('/restricted/dir')).rejects.toThrow('Permission denied');
    });

    it('should create nested directories', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await ensureDirectory('/path/to/deeply/nested/dir');

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        '/path/to/deeply/nested/dir',
        { recursive: true }
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
    it('should copy file successfully', async () => {
      await copyFile('/source/file.txt', '/dest/file.txt');

      expect(mockFs.copyFile).toHaveBeenCalledWith(
        '/source/file.txt',
        '/dest/file.txt'
      );
    });

    it('should ensure destination directory exists', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await copyFile('/source/file.txt', '/new/dest/file.txt');

      expect(mockFs.mkdir).toHaveBeenCalledWith('/new/dest', { recursive: true });
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        '/source/file.txt',
        '/new/dest/file.txt'
      );
    });

    it('should handle copy errors', async () => {
      mockFs.copyFile.mockRejectedValue(new Error('Source not found'));

      await expect(
        copyFile('/missing/file.txt', '/dest/file.txt')
      ).rejects.toThrow('Source not found');
    });

    it('should work with Windows paths', async () => {
      await copyFile('C:\\source\\file.txt', 'D:\\dest\\file.txt');

      expect(mockFs.copyFile).toHaveBeenCalledWith(
        'C:\\source\\file.txt',
        'D:\\dest\\file.txt'
      );
    });

    it('should handle cross-drive copies on Windows', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await copyFile('C:\\source\\file.txt', 'E:\\Projects\\dest\\file.txt');

      expect(mockFs.mkdir).toHaveBeenCalledWith('E:\\Projects\\dest', { recursive: true });
      expect(mockFs.copyFile).toHaveBeenCalled();
    });
  });

  describe('removeDirectory', () => {
    it('should remove empty directory', async () => {
      mockFs.readdir.mockResolvedValue([]);

      await removeDirectory('/empty/dir');

      expect(mockFs.rmdir).toHaveBeenCalledWith('/empty/dir');
    });

    it('should remove directory with files', async () => {
      mockFs.readdir.mockResolvedValue(['file1.txt', 'file2.txt']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false });

      await removeDirectory('/dir/with/files');

      expect(mockFs.unlink).toHaveBeenCalledWith(path.join('/dir/with/files', 'file1.txt'));
      expect(mockFs.unlink).toHaveBeenCalledWith(path.join('/dir/with/files', 'file2.txt'));
      expect(mockFs.rmdir).toHaveBeenCalledWith('/dir/with/files');
    });

    it('should recursively remove subdirectories', async () => {
      // First call returns subdirectory
      mockFs.readdir
        .mockResolvedValueOnce(['subdir'])
        .mockResolvedValueOnce([]); // subdir is empty
      
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });

      await removeDirectory('/parent');

      expect(mockFs.readdir).toHaveBeenCalledTimes(2);
      expect(mockFs.rmdir).toHaveBeenCalledWith(path.join('/parent', 'subdir'));
      expect(mockFs.rmdir).toHaveBeenCalledWith('/parent');
    });

    it('should handle removal errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      // Should not throw, just return
      await expect(removeDirectory('/missing')).resolves.toBeUndefined();
    });

    it('should handle Windows paths', async () => {
      mockFs.readdir.mockResolvedValue(['file.txt']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false });

      await removeDirectory('E:\\Projects\\temp');

      expect(mockFs.unlink).toHaveBeenCalledWith('E:\\Projects\\temp\\file.txt');
      expect(mockFs.rmdir).toHaveBeenCalledWith('E:\\Projects\\temp');
    });
  });

  describe('writeJsonFile', () => {
    it('should write JSON file with proper formatting', async () => {
      const data = { name: 'test', version: '1.0.0' };
      
      await writeJsonFile('/path/to/file.json', data);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/path/to/file.json',
        JSON.stringify(data, null, 2)
      );
    });

    it('should ensure directory exists before writing', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      
      await writeJsonFile('/new/path/config.json', { test: true });

      expect(mockFs.mkdir).toHaveBeenCalledWith('/new/path', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle circular references', async () => {
      const data = { name: 'test' };
      data.circular = data; // Create circular reference

      await expect(
        writeJsonFile('/path/to/file.json', data)
      ).rejects.toThrow();
    });

    it('should write empty objects', async () => {
      await writeJsonFile('/path/to/empty.json', {});

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/path/to/empty.json',
        '{}'
      );
    });

    it('should handle Windows paths', async () => {
      await writeJsonFile('C:\\config\\settings.json', { debug: true });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'C:\\config\\settings.json',
        expect.any(String)
      );
    });
  });

  describe('readJsonFile', () => {
    it('should read and parse JSON file', async () => {
      const data = { name: 'test', version: '1.0.0' };
      mockFs.readFile.mockResolvedValue(JSON.stringify(data));

      const result = await readJsonFile('/path/to/file.json');

      expect(result).toEqual(data);
      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/file.json', 'utf-8');
    });

    it('should return null for non-existent file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await readJsonFile('/missing/file.json');

      expect(result).toBeNull();
    });

    it('should throw for invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('{ invalid json');

      await expect(readJsonFile('/path/to/invalid.json')).rejects.toThrow();
    });

    it('should handle empty files', async () => {
      mockFs.readFile.mockResolvedValue('');

      await expect(readJsonFile('/path/to/empty.json')).rejects.toThrow();
    });

    it('should read Windows path files', async () => {
      mockFs.readFile.mockResolvedValue('{"windows": true}');

      const result = await readJsonFile('E:\\config\\app.json');

      expect(result).toEqual({ windows: true });
      expect(mockFs.readFile).toHaveBeenCalledWith('E:\\config\\app.json', 'utf-8');
    });

    it('should handle UTF-8 BOM', async () => {
      const bomData = '\ufeff{"test": true}';
      mockFs.readFile.mockResolvedValue(bomData);

      const result = await readJsonFile('/path/to/bom.json');

      expect(result).toEqual({ test: true });
    });
  });
});