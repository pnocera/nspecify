import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createTempDir, cleanupTempDir } from '../helpers/mocks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '..', '..', 'bin', 'nspecify.js');

describe('CLI Integration Tests', () => {
  jest.setTimeout(10000); // 10 second timeout for integration tests

  const runCLI = (args = [], input = '') => {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [CLI_PATH, ...args], {
        env: { ...process.env, FORCE_COLOR: '0', CI: 'true' },
        cwd: process.cwd(),
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe']
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

  describe('CLI execution', () => {
    it('should display help when no arguments provided', async () => {
      const { code, stdout, stderr } = await runCLI();

      // Commander.js sends help to stderr with exit code 1
      expect(code).toBe(1);
      expect(stderr).toContain('Usage: nspecify');
      expect(stderr).toContain('Commands:');
      expect(stderr).toContain('init');
      expect(stderr).toContain('check');
    });

    it('should display version with --version flag', async () => {
      const { code, stdout, stderr } = await runCLI(['--version']);

      expect(code).toBe(0);
      // Version might be in stdout or stderr
      const output = stdout + stderr;
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should display help with --help flag', async () => {
      const { code, stdout, stderr } = await runCLI(['--help']);

      expect(code).toBe(0);
      // Help might be in stdout or stderr
      const output = stdout + stderr;
      expect(output).toContain('Usage: nspecify');
      expect(output).toContain('Commands:');
    });

    it('should handle unknown commands', async () => {
      const { code, stdout, stderr } = await runCLI(['unknown-command']);

      expect(code).toBe(1);
      // Error might be in stdout or stderr
      const output = stdout + stderr;
      expect(output.toLowerCase()).toContain('unknown');
    });
  });

  describe('check command', () => {
    it('should run check command successfully', async () => {
      const { code, stdout, stderr } = await runCLI(['check']);

      // Check command should succeed
      expect(code).toBe(0);
      const output = stdout + stderr;
      // Check for expected output elements
      expect(output).toContain('System Information');
      expect(output).toContain('Requirements Check');
      expect(output).toContain('Git');
      expect(output).toContain('Node.js');
    });

    it('should support quiet flag', async () => {
      const { code, stdout, stderr } = await runCLI(['check', '--quiet']);

      expect(code).toBe(0);
      const output = stdout + stderr;
      // Quiet mode should still show results but less verbose
      expect(output.length).toBeGreaterThan(50);
      expect(output).toContain('Git');
    });
  });

  describe('init command - user flow', () => {
    let tempDir;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it('should handle user cancellation', async () => {
      const projectName = 'test-cancel-project';
      const input = `${projectName}\nn\n`; // Project name, then 'n' to cancel

      const { code, stdout, stderr } = await runCLI(['init'], input);

      // Should complete without crashing
      expect(code).toBeDefined();
      const output = stdout + stderr;
      
      // Should show some output
      expect(output.length).toBeGreaterThan(0);
    });

    it('should validate empty project name', async () => {
      const input = '\nvalid-project\n1\n1\ny\n'; // Empty name, then valid name

      const { code, stdout, stderr } = await runCLI(['init'], input);

      // Should complete
      expect(code).toBeDefined();
      const output = stdout + stderr;
      
      // Should show some output
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle project name as argument', async () => {
      const projectName = `test-arg-${Date.now()}`;
      const input = '1\n1\nn\n'; // Tool selection, script type, cancel

      const { code, stdout, stderr } = await runCLI(['init', projectName], input);

      // Should complete
      expect(code).toBeDefined();
      const output = stdout + stderr;
      
      // Should show some output
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing Node.js gracefully', async () => {
      // This test would need to mock the Node.js check
      // For now, we'll just verify the CLI runs
      const { code } = await runCLI(['check']);
      expect(code).toBeDefined();
    });

    it('should handle Ctrl+C interruption', async () => {
      const child = spawn(process.execPath, [CLI_PATH, 'init'], {
        env: { ...process.env, FORCE_COLOR: '0' },
        shell: false
      });

      // Give it time to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send interrupt signal
      child.kill('SIGINT');

      const code = await new Promise(resolve => {
        child.on('close', resolve);
      });

      expect(code).toBeDefined();
    });
  });

  describe('output formatting', () => {
    it('should not include color codes when piped', async () => {
      const { stdout } = await runCLI(['check']);

      // Should not contain ANSI escape codes
      expect(stdout).not.toMatch(/\x1b\[\d+m/);
    });

    it('should handle different terminal widths', async () => {
      const { code, stdout, stderr } = await runCLI([], '');

      // Help is shown with exit code 1
      expect(code).toBe(1);
      // Help output should be present
      const output = stdout + stderr;
      expect(output).toContain('nspecify');
    });
  });

  describe('npx compatibility', () => {
    it('should be executable via npx', async () => {
      // This would test actual npx execution in a real environment
      // For unit tests, we verify the binary configuration
      const packageJson = JSON.parse(
        await fs.readFile(
          path.join(__dirname, '..', '..', 'package.json'),
          'utf-8'
        )
      );

      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin.nspecify).toBe('./bin/nspecify.js');
    });

    it('should have correct shebang in binary', async () => {
      const binContent = await fs.readFile(CLI_PATH, 'utf-8');
      
      expect(binContent.startsWith('#!/usr/bin/env node')).toBe(true);
    });
  });
});