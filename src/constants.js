import { platform, homedir, tmpdir } from 'os';
import { join } from 'path';

// Script types
const SCRIPT_TYPES = {
  sh: 'POSIX Shell',
  ps: 'PowerShell',
};

// AI Assistant configurations
const AI_ASSISTANTS = {
  'claude-code': {
    name: 'Claude Code',
    url: 'https://claude.ai/code',
    requirements: [
      'Claude Code CLI installed',
      'Active Claude subscription',
    ],
  },
  'gemini-cli': {
    name: 'Gemini CLI',
    url: 'https://gemini.google.com',
    requirements: [
      'Gemini CLI installed',
      'Google Cloud authentication',
    ],
  },
  'github-copilot': {
    name: 'GitHub Copilot',
    url: 'https://github.com/features/copilot',
    requirements: [
      'GitHub Copilot subscription',
      'VS Code or compatible IDE',
    ],
  },
  'cursor': {
    name: 'Cursor',
    url: 'https://cursor.sh',
    requirements: [
      'Cursor IDE installed',
      'Active Cursor subscription',
    ],
  },
};

// File paths and patterns
const PATHS = {
  templatesDir: 'templates',
  scriptsDir: 'scripts',
  defaultSpecDir: 'specs',
  claudeMdFile: 'CLAUDE.md',
  readmeFile: 'README.md',
};

// GitHub release information
const GITHUB = {
  owner: 'github',
  repo: 'nspecify',
  releasesUrl: 'https://api.github.com/repos/github/nspecify/releases',
};

// ASCII banner
const ASCII_BANNER = `
   ███╗   ██╗███████╗██████╗ ███████╗ ██████╗██╗███████╗██╗   ██╗
   ████╗  ██║██╔════╝██╔══██╗██╔════╝██╔════╝██║██╔════╝╚██╗ ██╔╝
   ██╔██╗ ██║███████╗██████╔╝█████╗  ██║     ██║█████╗   ╚████╔╝ 
   ██║╚██╗██║╚════██║██╔═══╝ ██╔══╝  ██║     ██║██╔══╝    ╚██╔╝  
   ██║ ╚████║███████║██║     ███████╗╚██████╗██║██║        ██║   
   ╚═╝  ╚═══╝╚══════╝╚═╝     ╚══════╝ ╚═════╝╚═╝╚═╝        ╚═╝   
`;

// UI symbols
const SYMBOLS = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  arrow: '→',
  bullet: '•',
};

// Colors configuration (using chalk color names)
const COLORS = {
  primary: 'cyan',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',
  muted: 'gray',
};

// Environment detection
const ENVIRONMENT = {
  isWindows: platform() === 'win32',
  isMac: platform() === 'darwin',
  isLinux: platform() === 'linux',
  defaultShell: platform() === 'win32' ? 'ps' : 'sh',
  homeDir: homedir(),
  tempDir: tmpdir(),
};

// Default values
const DEFAULTS = {
  retryCount: 3,
  downloadTimeout: 30000, // 30 seconds
  chunkSize: 1024 * 1024, // 1MB for downloads
  maxFileSize: 50 * 1024 * 1024, // 50MB max download
};

// Regular expressions
const PATTERNS = {
  projectName: /^[a-zA-Z][a-zA-Z0-9-_]*$/,
  version: /^\d+\.\d+\.\d+$/,
  url: /^https?:\/\/.+/,
};

// Error messages
const ERRORS = {
  invalidProjectName: 'Project name must start with a letter and contain only letters, numbers, hyphens, and underscores',
  nodeVersion: 'nspecify requires Node.js version 20.0.0 or higher',
  gitNotFound: 'Git is not installed. Please install Git and try again',
  networkError: 'Network error occurred. Please check your internet connection',
  downloadFailed: 'Failed to download templates. Please try again',
  extractFailed: 'Failed to extract templates. The download may be corrupted',
  permissionDenied: 'Permission denied. Try running with elevated privileges',
  directoryExists: 'Directory already exists. Please choose a different name or remove the existing directory',
};

export {
  SCRIPT_TYPES,
  AI_ASSISTANTS,
  PATHS,
  GITHUB,
  ASCII_BANNER,
  SYMBOLS,
  COLORS,
  ENVIRONMENT,
  DEFAULTS,
  PATTERNS,
  ERRORS,
};