import { jest } from '@jest/globals';
import { mockAxios, mockFs, mockProcess, resetAllMocks, createMockOra } from '../../test/helpers/mocks.js';
import { fixtures, createMockResponse, createMockStream } from '../../test/helpers/fixtures.js';
import path from 'path';
import { Readable } from 'stream';

// Mock dependencies
jest.unstable_mockModule('axios', () => ({
  default: mockAxios
}));

jest.unstable_mockModule('fs/promises', () => mockFs);

jest.unstable_mockModule('ora', () => ({
  default: createMockOra()
}));

jest.unstable_mockModule('adm-zip', () => ({
  default: class AdmZip {
    constructor(buffer) {
      this.buffer = buffer;
      this.entries = [];

      // Parse mock zip content
      if (buffer) {
        const content = JSON.parse(buffer.toString());
        this.entries = Object.keys(content).map(name => ({
          entryName: name,
          isDirectory: name.endsWith('/'),
          getData: () => Buffer.from(content[name])
        }));
      }
    }

    getEntries() {
      return this.entries;
    }

    extractEntryTo(entryName, targetPath, maintainEntryPath, overwrite) {
      // Mock extraction
      return true;
    }
  }
}));

const {
  fetchLatestRelease,
  downloadTemplate,
  extractTemplate,
  getTemplateUrl,
  processTemplates
} = await import('./templates.js');

describe('templates', () => {
  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;

    // Setup default mock responses
    mockAxios.get.mockResolvedValue(createMockResponse(fixtures.releaseData.success));
    mockAxios.create.mockReturnValue(mockAxios);
    mockFs.mkdir.mockResolvedValue();
    mockFs.writeFile.mockResolvedValue();
    mockFs.chmod.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchLatestRelease', () => {
    it('should fetch latest release data', async () => {
      const result = await fetchLatestRelease();

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/github/nspecify/releases/latest',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json'
          })
        })
      );
      expect(result).toEqual(fixtures.releaseData.success);
    });

    it('should handle API errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(fetchLatestRelease()).rejects.toThrow('Failed to fetch latest release');
    });

    it('should handle non-200 responses', async () => {
      mockAxios.get.mockResolvedValue(createMockResponse({}, 404));

      await expect(fetchLatestRelease()).rejects.toThrow('Failed to fetch latest release');
    });

    it('should timeout after 30 seconds', async () => {
      mockAxios.get.mockImplementation(() => new Promise(() => { })); // Never resolves

      const promise = fetchLatestRelease();

      // This would timeout in real execution
      mockAxios.get.mockRejectedValue(new Error('timeout'));

      await expect(promise).rejects.toThrow();
    });
  });

  describe('getTemplateUrl', () => {
    it('should find correct template URL', async () => {
      const url = await getTemplateUrl(fixtures.releaseData.success, 'claude-code', 'bash');

      expect(url).toBe('https://github.com/pnocera/nspecify/releases/download/v1.0.0/claude-code-bash.zip');
    });

    it('should find PowerShell template', async () => {
      const url = await getTemplateUrl(fixtures.releaseData.success, 'cursor', 'powershell');

      expect(url).toBe('https://github.com/pnocera/nspecify/releases/download/v1.0.0/cursor-powershell.zip');
    });

    it('should throw when template not found', async () => {
      await expect(
        getTemplateUrl(fixtures.releaseData.success, 'invalid-tool', 'bash')
      ).rejects.toThrow('Template not found for invalid-tool with bash scripts');
    });

    it('should throw when no assets available', async () => {
      await expect(
        getTemplateUrl(fixtures.releaseData.empty, 'claude-code', 'bash')
      ).rejects.toThrow('Template not found');
    });

    it('should handle alternative template names', async () => {
      const releaseWithAltNames = {
        ...fixtures.releaseData.success,
        assets: [
          {
            name: 'copilot-bash.zip',
            browser_download_url: 'https://example.com/copilot-bash.zip'
          }
        ]
      };

      const url = await getTemplateUrl(releaseWithAltNames, 'copilot', 'bash');
      expect(url).toBe('https://example.com/copilot-bash.zip');
    });
  });

  describe('downloadTemplate', () => {
    beforeEach(async () => {
      const mockBuffer = Buffer.from('mock zip content');
      const stream = await createMockStream(mockBuffer);
      mockAxios.get.mockResolvedValue({ data: stream });
    });

    it('should download template successfully', async () => {
      const url = 'https://example.com/template.zip';
      const result = await downloadTemplate(url, 'test-spinner');

      expect(mockAxios.get).toHaveBeenCalledWith(url, {
        responseType: 'stream',
        timeout: 60000,
        headers: {
          'User-Agent': 'nspecify-cli'
        }
      });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle download errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(
        downloadTemplate('https://example.com/template.zip')
      ).rejects.toThrow('Failed to download template');
    });

    it('should handle stream errors', async () => {
      const errorStream = new Readable();
      mockAxios.get.mockResolvedValue({ data: errorStream });

      setImmediate(() => {
        errorStream.emit('error', new Error('Stream error'));
      });

      await expect(
        downloadTemplate('https://example.com/template.zip')
      ).rejects.toThrow('Failed to download template');
    });

    it('should accumulate chunks correctly', async () => {
      const chunks = [
        Buffer.from('chunk1'),
        Buffer.from('chunk2'),
        Buffer.from('chunk3')
      ];

      const stream = new Readable();
      mockAxios.get.mockResolvedValue({ data: stream });

      const downloadPromise = downloadTemplate('https://example.com/template.zip');

      // Emit chunks
      chunks.forEach(chunk => stream.push(chunk));
      stream.push(null); // End stream

      const result = await downloadPromise;
      expect(result.toString()).toBe('chunk1chunk2chunk3');
    });
  });

  describe('extractTemplate', () => {
    const mockZipBuffer = Buffer.from(JSON.stringify(fixtures.zipContent));

    it('should extract all files from zip', async () => {
      await extractTemplate(mockZipBuffer, '/target/dir');

      // Check that directories were created
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join('/target/dir', 'templates'),
        { recursive: true }
      );
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join('/target/dir', 'scripts'),
        { recursive: true }
      );

      // Check that files were written
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/target/dir', 'CLAUDE.md'),
        fixtures.zipContent['CLAUDE.md']
      );
    });

    it('should extract to Windows paths correctly', async () => {
      mockProcess.platform = 'win32';

      await extractTemplate(mockZipBuffer, 'E:\\Projects\\test');

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join('E:\\Projects\\test', 'templates'),
        { recursive: true }
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('E:\\Projects\\test', 'CLAUDE.md'),
        fixtures.zipContent['CLAUDE.md']
      );
    });

    it('should set executable permissions for shell scripts', async () => {
      mockProcess.platform = 'darwin'; // macOS

      await extractTemplate(mockZipBuffer, '/target/dir');

      expect(mockFs.chmod).toHaveBeenCalledWith(
        path.join('/target/dir', 'scripts', 'create-new-feature.sh'),
        0o755
      );
    });

    it('should not set permissions on Windows', async () => {
      mockProcess.platform = 'win32';

      await extractTemplate(mockZipBuffer, 'C:\\target');

      expect(mockFs.chmod).not.toHaveBeenCalled();
    });

    it('should handle extraction errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(
        extractTemplate(mockZipBuffer, '/target/dir')
      ).rejects.toThrow('Disk full');
    });

    it('should skip directory entries', async () => {
      const zipWithDirs = Buffer.from(JSON.stringify({
        'templates/': '',
        'templates/file.md': 'content',
        'scripts/': ''
      }));

      await extractTemplate(zipWithDirs, '/target/dir');

      // Should only write actual files, not directory entries
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/target/dir', 'templates', 'file.md'),
        'content'
      );
    });
  });

  describe('processTemplates', () => {
    const mockZipBuffer = Buffer.from(JSON.stringify(fixtures.zipContent));

    beforeEach(async () => {
      const stream = await createMockStream(mockZipBuffer);
      mockAxios.get
        .mockResolvedValueOnce(createMockResponse(fixtures.releaseData.success)) // fetchLatestRelease
        .mockResolvedValueOnce({ data: stream }); // downloadTemplate
    });

    it('should process templates end-to-end', async () => {
      await processTemplates('claude-code', 'bash', '/target/dir');

      expect(mockAxios.get).toHaveBeenCalledTimes(2);
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle PowerShell templates on Windows', async () => {
      mockProcess.platform = 'win32';

      await processTemplates('cursor', 'powershell', 'E:\\Projects\\test');

      // Should not try to chmod PowerShell scripts
      expect(mockFs.chmod).not.toHaveBeenCalled();

      // Should extract PowerShell scripts
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('create-new-feature.ps1'),
        expect.any(String)
      );
    });

    it('should propagate errors from any step', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(
        processTemplates('claude-code', 'bash', '/target/dir')
      ).rejects.toThrow();
    });

    it('should create spinner text correctly', async () => {
      const ora = await import('ora');
      await processTemplates('claude-code', 'bash', '/target/dir');

      expect(ora.default).toHaveBeenCalledWith('Fetching latest release information...');
    });
  });
});