/**
 * Utility modules export
 */

// Tool detection utilities
export {
  checkGit,
  checkClaudeCLI,
  checkTool,
  checkAllTools,
  printToolStatus
} from './tools.js';

// Git operations utilities
export {
  isGitRepository,
  initRepository,
  createInitialCommit,
  getRepositoryStatus,
  setupGitRepository,
  printRepositoryStatus
} from './git.js';

// File operations utilities
export {
  normalizePath,
  safePath,
  ensureDirectory,
  copyFile,
  writeFileAtomic,
  readFileSafe,
  scanDirectory,
  replacePlaceholders,
  isBinaryFile,
  setFilePermissions,
  makeExecutable,
  getFileInfo
} from './files.js';

// Logger utility
export { logger } from './logger.js';

// Template processing utilities
export {
  detectShellType,
  parseFrontmatter,
  replaceVariables,
  transformTemplatePath,
  loadTemplate,
  processTemplate,
  copyTemplateDirectory,
  getScriptCommand,
  createScriptWrapper,
  validateTemplateStructure
} from './templates.js';