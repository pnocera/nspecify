import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock file system operations
export const mockFs = {
  access: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
  rmdir: jest.fn(),
  copyFile: jest.fn(),
  chmod: jest.fn()
};

// Mock child_process
export const mockExec = jest.fn();
export const mockExecSync = jest.fn();
export const mockSpawn = jest.fn();

// Mock process
export const mockProcess = {
  stdout: {
    write: jest.fn(),
    columns: 80
  },
  stderr: {
    write: jest.fn()
  },
  stdin: {
    isTTY: true,
    setRawMode: jest.fn(),
    resume: jest.fn(),
    pause: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn()
  },
  exit: jest.fn(),
  cwd: jest.fn(() => 'E:\\Projects\\test'),
  platform: 'win32',
  env: {
    ...process.env,
    TERM: 'xterm-256color'
  }
};

// Mock axios
export const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => mockAxios)
};

// Mock simple-git
export const mockGit = {
  init: jest.fn().mockReturnThis(),
  checkIsRepo: jest.fn(),
  branch: jest.fn(),
  checkout: jest.fn().mockReturnThis(),
  add: jest.fn().mockReturnThis(),
  commit: jest.fn().mockReturnThis(),
  status: jest.fn(),
  log: jest.fn(),
  remote: jest.fn(),
  push: jest.fn().mockReturnThis(),
  pull: jest.fn().mockReturnThis()
};

export const createMockGit = () => {
  const git = jest.fn(() => mockGit);
  git.simpleGit = jest.fn(() => mockGit);
  return git;
};

// Mock ora spinner - create a function that returns proper chainable mocks
export const createMockSpinner = () => {
  const spinner = {
    start: jest.fn(),
    succeed: jest.fn(), 
    fail: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    stop: jest.fn(),
    text: ''
  };
  
  // Make all methods return the spinner for chaining
  spinner.start.mockReturnValue(spinner);
  spinner.succeed.mockReturnValue(spinner);
  spinner.fail.mockReturnValue(spinner);
  spinner.info.mockReturnValue(spinner);
  spinner.warn.mockReturnValue(spinner);
  spinner.stop.mockReturnValue(spinner);
  
  return spinner;
};

export const mockSpinner = createMockSpinner();

export const createMockOra = () => jest.fn(() => createMockSpinner());

// Mock readline
export const mockReadline = {
  createInterface: jest.fn(() => ({
    question: jest.fn((query, callback) => callback('test-input')),
    close: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
};

// Reset all mocks
export const resetAllMocks = () => {
  Object.values(mockFs).forEach(fn => fn.mockReset());
  mockExec.mockReset();
  mockExecSync.mockReset();
  mockSpawn.mockReset();
  Object.values(mockAxios).forEach(fn => typeof fn.mockReset === 'function' && fn.mockReset());
  Object.values(mockGit).forEach(fn => typeof fn.mockReset === 'function' && fn.mockReset());
  Object.values(mockSpinner).forEach(fn => typeof fn.mockReset === 'function' && fn.mockReset());
  mockProcess.stdout.write.mockReset();
  mockProcess.stderr.write.mockReset();
  mockProcess.exit.mockReset();
  mockProcess.cwd.mockReset();
};

// Test utilities
export const captureOutput = () => {
  const output = [];
  
  // Capture process.stdout.write
  mockProcess.stdout.write.mockImplementation((text) => {
    output.push(text);
  });
  
  // Also capture console.log
  const originalConsoleLog = console.log;
  console.log = jest.fn((...args) => {
    const text = args.map(arg => typeof arg === 'string' ? arg : String(arg)).join(' ');
    output.push(text + '\n');
  });
  
  return {
    getOutput: () => output.join(''),
    getLines: () => output.join('').split('\n').filter(Boolean),
    restore: () => {
      console.log = originalConsoleLog;
    }
  };
};

// Create temp directory for tests
export const createTempDir = async () => {
  const tempDir = path.join(__dirname, '..', 'temp', Date.now().toString());
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
};

// Clean up temp directory
export const cleanupTempDir = async (tempDir) => {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
};