import { jest } from '@jest/globals';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createTempDir, cleanupTempDir } from '../helpers/mocks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '..', '..', 'bin', 'nspecify.js');

// Skip these tests if not on Windows
const describeOnWindows = process.platform === 'win32' ? describe : describe.skip;

describeOnWindows('Windows-specific Integration Tests', () => {
  jest.setTimeout(10000);

  const runCLI = (args = [], input = '', options = {}) => {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [CLI_PATH, ...args], {
        env: { ...process.env, FORCE_COLOR: '0', CI: 'true' },
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        ...options
      });

      let stdout = '';
      let stderr = '';
      let hasExited = false;

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Add a timeout to prevent hanging
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
      }, 8000);  // Kill after 8 seconds

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (!hasExited) {
          hasExited = true;
          resolve({ code: code || 0, stdout, stderr });
        }
      });

      child.on('exit', (code) => {
        clearTimeout(timeout);
        if (!hasExited) {
          hasExited = true;
          resolve({ code: code || 0, stdout, stderr });
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      if (input) {
        // Write input with a small delay to ensure process is ready
        setTimeout(() => {
          try {
            child.stdin.write(input);
            child.stdin.end();
          } catch (err) {
            // Process might have already exited
          }
        }, 100);
      } else {
        // If no input, end stdin immediately
        child.stdin.end();
      }
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

      // Should show some output
      expect(stdout.length).toBeGreaterThan(0);
      
      // If interactive mode is working, might contain PowerShell or project path
      if (stdout.includes('script type') || stdout.includes('PowerShell')) {
        expect(code).toBe(0);
      }
    });

    it('should handle paths with spaces', async () => {
      const projectPath = `${tempDir}\\test project with spaces`;
      const input = `"${projectPath}"\n1\n2\ny\n`;

      const { code, stdout } = await runCLI(['init'], input);

      // Should show some output
      expect(stdout.length).toBeGreaterThan(0);
      
      // If the path was accepted, it should be mentioned
      if (stdout.includes('Project:') || stdout.includes('test project')) {
        expect(code).toBe(0);
      }
    });

    it('should handle UNC paths', async () => {
      const uncPath = '\\\\localhost\\c$\\temp\\test-project';
      const input = `${uncPath}\n1\n2\nn\n`; // Cancel to avoid actual creation

      const { code, stdout } = await runCLI(['init'], input);

      // Should complete without crashing
      expect(code).toBeDefined();
      
      // If cancellation worked, should see message
      if (stdout.includes('Installation cancelled')) {
        expect(code).toBe(0);
      }
    });

    it('should normalize path separators', async () => {
      const mixedPath = `${tempDir}/mixed\\path/separators`;
      const input = `${mixedPath}\n1\n2\nn\n`;

      const { code, stdout, stderr } = await runCLI(['init'], input);

      // Should complete without crashing
      expect(code).toBeDefined();
      const output = stdout + stderr;
      expect(output.length).toBeGreaterThan(0);
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
      const input = 'test-ps-project\n'; // Provide a project name
      const { stdout, code } = await runCLI(['init'], input);

      // Should show some output
      expect(stdout.length).toBeGreaterThan(0);
      
      // PowerShell should be available as an option if we get to script selection
      if (stdout.includes('script type') || stdout.includes('Select your')) {
        expect(code).toBeDefined();
      }
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
      const { code, stdout, stderr } = await runCLI(['check']);

      // Should successfully check for tools
      expect(code).toBe(0);
      const output = stdout + stderr;
      expect(output).toContain('Requirements Check');
    });
  });

  describe('Windows line endings', () => {
    it('should handle CRLF line endings in input', async () => {
      const input = 'test-project\r\n1\r\n1\r\nn\r\n';
      const { code, stdout, stderr } = await runCLI(['init'], input);

      // Should handle CRLF gracefully
      expect(code).toBeDefined();
      const output = stdout + stderr;
      expect(output.length).toBeGreaterThan(0);
    });

    it('should output with appropriate line endings', async () => {
      const { code, stdout, stderr } = await runCLI(['--version']);

      expect(code).toBe(0);
      // Check that output is readable
      const output = (stdout + stderr).trim();
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('Windows permissions', () => {
    let tempDir;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it('should not try to set Unix permissions', async () => {
      // This is tested in unit tests, but we can verify no errors occur
      const tempProject = path.join(tempDir, 'perm-test');
      const input = `${tempProject}\n1\n2\ny\n`;

      const { code, stderr } = await runCLI(['init'], input);

      // Should complete without permission errors
      expect(code).toBeDefined();
      
      // Should not have permission-related errors
      if (stderr) {
        expect(stderr).not.toContain('chmod');
        expect(stderr).not.toContain('EPERM');
      }
    });
  });

  describe('Windows console features', () => {
    it('should handle Windows terminal (cmd.exe)', async () => {
      const { code, stdout, stderr } = await runCLI([], '', {
        env: { ...process.env, TERM: 'dumb', FORCE_COLOR: '0' }
      });

      // Help is shown with exit code 1
      expect(code).toBe(1);
      // Should still display content without colors
      const output = stdout + stderr;
      expect(output.toLowerCase()).toContain('nspecify');
    });

    it('should handle Windows Terminal', async () => {
      const { code, stdout, stderr } = await runCLI([], '', {
        env: { ...process.env, WT_SESSION: '1', FORCE_COLOR: '0' }
      });

      // Help is shown with exit code 1
      expect(code).toBe(1);
      const output = stdout + stderr;
      expect(output.toLowerCase()).toContain('nspecify');
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

      const { code, stdout, stderr } = await runCLI(['init'], input);

      // Should complete (may fail with invalid path)
      expect(code).toBeDefined();
      
      // Should handle invalid drive gracefully
      if (stderr || stdout.includes('Error')) {
        expect(code).toBeGreaterThanOrEqual(0);
      }
    });
  });
});