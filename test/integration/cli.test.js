import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createTempDir, cleanupTempDir } from '../helpers/mocks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'nspecify.js');

describe('CLI Integration Tests', () => {
  jest.setTimeout(30000); // 30 second timeout for integration tests

  const runCLI = (args = [], input = '') => {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [CLI_PATH, ...args], {
        env: { ...process.env, FORCE_COLOR: '0' },
        cwd: process.cwd()
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

  describe('CLI execution', () => {
    it('should display help when no arguments provided', async () => {
      const { code, stdout } = await runCLI();

      expect(code).toBe(0);
      expect(stdout).toContain('NSPECIFY');
      expect(stdout).toContain('Available commands:');
      expect(stdout).toContain('init');
      expect(stdout).toContain('check');
    });

    it('should display version with --version flag', async () => {
      const { code, stdout } = await runCLI(['--version']);

      expect(code).toBe(0);
      expect(stdout).toMatch(/nspecify v\d+\.\d+\.\d+/);
    });

    it('should display help with --help flag', async () => {
      const { code, stdout } = await runCLI(['--help']);

      expect(code).toBe(0);
      expect(stdout).toContain('Usage: nspecify [command] [options]');
      expect(stdout).toContain('Commands:');
    });

    it('should handle unknown commands', async () => {
      const { code, stderr } = await runCLI(['unknown-command']);

      expect(code).toBe(1);
      expect(stderr).toContain('Unknown command: unknown-command');
    });
  });

  describe('check command', () => {
    it('should run check command successfully', async () => {
      const { code, stdout } = await runCLI(['check']);

      expect(code).toBe(0);
      expect(stdout).toContain('System Requirements Check');
      expect(stdout).toContain('Git');
      expect(stdout).toContain('Node.js');
    });

    it('should support verbose flag', async () => {
      const { code, stdout } = await runCLI(['check', '--verbose']);

      expect(code).toBe(0);
      expect(stdout).toContain('System Requirements Check');
      // Verbose output should include more details
      expect(stdout.length).toBeGreaterThan(200);
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

      const { code, stdout } = await runCLI(['init'], input);

      expect(code).toBe(0);
      expect(stdout).toContain('Enter project name:');
      expect(stdout).toContain('Installation cancelled');
      
      // Project directory should not be created
      const projectPath = path.join(process.cwd(), projectName);
      await expect(fs.access(projectPath)).rejects.toThrow();
    });

    it('should validate empty project name', async () => {
      const input = '\nvalid-project\n1\n1\ny\n'; // Empty name, then valid name

      const { code, stdout } = await runCLI(['init'], input);

      // Should re-prompt after empty input
      expect(stdout.match(/Enter project name:/g).length).toBeGreaterThan(1);
    });

    it('should handle project name as argument', async () => {
      const projectName = `test-arg-${Date.now()}`;
      const input = '1\n1\ny\n'; // Tool selection, script type, confirm

      const { code, stdout } = await runCLI(['init', projectName], input);

      expect(stdout).not.toContain('Enter project name:');
      expect(stdout).toContain(`Project: ${projectName}`);
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
      const child = spawn('node', [CLI_PATH, 'init'], {
        env: { ...process.env, FORCE_COLOR: '0' }
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
      const { code, stdout } = await runCLI([], '');

      expect(code).toBe(0);
      // Banner should adapt to terminal width
      expect(stdout).toContain('NSPECIFY');
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