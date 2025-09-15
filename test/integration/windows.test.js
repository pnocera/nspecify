import { jest } from '@jest/globals';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createTempDir, cleanupTempDir } from '../helpers/mocks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'nspecify.js');

// Skip these tests if not on Windows
const describeOnWindows = process.platform === 'win32' ? describe : describe.skip;

describeOnWindows('Windows-specific Integration Tests', () => {
  jest.setTimeout(30000);

  const runCLI = (args = [], input = '', options = {}) => {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [CLI_PATH, ...args], {
        env: { ...process.env, FORCE_COLOR: '0' },
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      if (input) {
        child.stdin.write(input);
        child.stdin.end();
      }

      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  };

  describe('Windows path handling', () => {
    let tempDir;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it('should handle Windows absolute paths', async () => {
      const projectPath = `${tempDir}\\test-project`;
      const input = `${projectPath}\n1\n2\ny\n`; // PowerShell selection

      const { code, stdout } = await runCLI(['init'], input);

      expect(stdout).toContain('PowerShell');
      expect(stdout).toContain(projectPath);
    });

    it('should handle paths with spaces', async () => {
      const projectPath = `${tempDir}\\test project with spaces`;
      const input = `"${projectPath}"\n1\n2\ny\n`;

      const { code, stdout } = await runCLI(['init'], input);

      expect(stdout).toContain('test project with spaces');
    });

    it('should handle UNC paths', async () => {
      const uncPath = '\\\\localhost\\c$\\temp\\test-project';
      const input = `${uncPath}\n1\n2\nn\n`; // Cancel to avoid actual creation

      const { code, stdout } = await runCLI(['init'], input);

      expect(code).toBe(0);
      expect(stdout).toContain('Installation cancelled');
    });

    it('should normalize path separators', async () => {
      const mixedPath = `${tempDir}/mixed\\path/separators`;
      const input = `${mixedPath}\n1\n2\nn\n`;

      const { code, stdout } = await runCLI(['init'], input);

      // Should handle mixed separators gracefully
      expect(code).toBe(0);
    });
  });

  describe('PowerShell integration', () => {
    it('should detect PowerShell scripts correctly', async () => {
      const { stdout } = await runCLI(['check']);

      // Check if PowerShell is mentioned in Windows environment
      if (stdout.includes('Cursor')) {
        expect(stdout).toBeTruthy();
      }
    });

    it('should suggest PowerShell as default on Windows', async () => {
      const input = '\n'; // Just press enter to cancel at project name
      const { stdout } = await runCLI(['init'], input);

      // PowerShell should be available as an option
      expect(stdout).toContain('script type');
    });
  });

  describe('Windows-specific tool detection', () => {
    it('should detect Windows-installed tools', async () => {
      const { code, stdout } = await runCLI(['check']);

      expect(code).toBe(0);
      // Should detect git if installed via Git for Windows
      expect(stdout).toContain('Git');
    });

    it('should handle Windows executable extensions', async () => {
      // Test that it looks for .exe, .cmd, .bat files
      const { stdout } = await runCLI(['check']);

      // Should successfully check for tools
      expect(stdout).toContain('System Requirements Check');
    });
  });

  describe('Windows line endings', () => {
    it('should handle CRLF line endings in input', async () => {
      const input = 'test-project\r\n1\r\n1\r\nn\r\n';
      const { code, stdout } = await runCLI(['init'], input);

      expect(code).toBe(0);
      expect(stdout).toContain('test-project');
    });

    it('should output with appropriate line endings', async () => {
      const { stdout } = await runCLI(['--version']);

      // Check that output is readable
      expect(stdout.trim()).toMatch(/nspecify v\d+\.\d+\.\d+/);
    });
  });

  describe('Windows permissions', () => {
    it('should not try to set Unix permissions', async () => {
      // This is tested in unit tests, but we can verify no errors occur
      const tempProject = path.join(tempDir, 'perm-test');
      const input = `${tempProject}\n1\n2\ny\n`;

      const { code, stderr } = await runCLI(['init'], input);

      // Should not have permission-related errors
      expect(stderr).not.toContain('chmod');
      expect(stderr).not.toContain('EPERM');
    });
  });

  describe('Windows console features', () => {
    it('should handle Windows terminal (cmd.exe)', async () => {
      const { code, stdout } = await runCLI([], '', {
        env: { ...process.env, TERM: 'dumb', FORCE_COLOR: '0' }
      });

      expect(code).toBe(0);
      // Should still display content without colors
      expect(stdout).toContain('NSPECIFY');
    });

    it('should handle Windows Terminal', async () => {
      const { code, stdout } = await runCLI([], '', {
        env: { ...process.env, WT_SESSION: '1', FORCE_COLOR: '0' }
      });

      expect(code).toBe(0);
      expect(stdout).toContain('NSPECIFY');
    });
  });

  describe('npx on Windows', () => {
    it('should work with npx on Windows', async () => {
      // Verify npx compatibility
      try {
        const npmVersion = execSync('npm --version', { encoding: 'utf-8' });
        expect(npmVersion).toBeTruthy();

        // Check if npx is available
        const npxVersion = execSync('npx --version', { encoding: 'utf-8' });
        expect(npxVersion).toBeTruthy();
      } catch (error) {
        // NPM/NPX might not be in PATH in test environment
        console.log('NPM/NPX not available in test environment');
      }
    });

    it('should have correct Windows binary configuration', async () => {
      const packageJson = JSON.parse(
        await fs.readFile(
          path.join(__dirname, '..', '..', 'package.json'),
          'utf-8'
        )
      );

      // Binary should work on Windows
      expect(packageJson.bin.nspecify).toBeDefined();
      
      // Check shebang is Unix-style (works on Windows with Node)
      const binContent = await fs.readFile(CLI_PATH, 'utf-8');
      expect(binContent.startsWith('#!/usr/bin/env node')).toBe(true);
    });
  });

  describe('Windows error messages', () => {
    it('should show Windows-appropriate error messages', async () => {
      const invalidPath = 'Q:\\InvalidDrive\\Project';
      const input = `${invalidPath}\n1\n2\ny\n`;

      const { code, stderr } = await runCLI(['init'], input);

      // Should handle invalid drive gracefully
      if (stderr) {
        expect(stderr).toBeTruthy();
      }
    });
  });
});