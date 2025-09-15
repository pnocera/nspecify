import which from 'which';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

/**
 * Tool detection utilities for Windows and cross-platform compatibility
 */

/**
 * Check if a command exists in PATH
 * @param {string} command - Command to check
 * @returns {Promise<string|null>} Path to command or null
 */
async function checkCommand(command) {
  try {
    const cmdPath = await which(command);
    return cmdPath;
  } catch (error) {
    return null;
  }
}

/**
 * Get version of a command
 * @param {string} command - Command to check
 * @param {string} versionFlag - Flag to get version (default: --version)
 * @returns {string|null} Version string or null
 */
function getCommandVersion(command, versionFlag = '--version') {
  try {
    const output = execSync(`${command} ${versionFlag}`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'] // Ignore stderr for cleaner output
    });
    return output.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Parse semantic version from string
 * @param {string} versionString - Version string to parse
 * @returns {Object|null} Parsed version or null
 */
function parseVersion(versionString) {
  const match = versionString.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    full: match[0]
  };
}

/**
 * Compare two semantic versions
 * @param {Object} version1 - First version
 * @param {Object} version2 - Second version
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(version1, version2) {
  if (version1.major !== version2.major) {
    return version1.major - version2.major;
  }
  if (version1.minor !== version2.minor) {
    return version1.minor - version2.minor;
  }
  return version1.patch - version2.patch;
}

/**
 * Check for git installation and version
 * @returns {Promise<Object>} Git status
 */
export async function checkGit() {
  const minVersion = { major: 2, minor: 0, patch: 0, full: '2.0.0' };
  const result = {
    installed: false,
    path: null,
    version: null,
    meetsMinimum: false,
    error: null
  };

  try {
    // Check for git in PATH (works for git.exe on Windows)
    const gitPath = await checkCommand('git');
    if (!gitPath) {
      result.error = 'Git not found in PATH';
      return result;
    }

    result.installed = true;
    result.path = gitPath;

    // Get version
    const versionOutput = getCommandVersion('git', '--version');
    if (!versionOutput) {
      result.error = 'Could not determine git version';
      return result;
    }

    const version = parseVersion(versionOutput);
    if (!version) {
      result.error = 'Could not parse git version';
      return result;
    }

    result.version = version;
    result.meetsMinimum = compareVersions(version, minVersion) >= 0;

    if (!result.meetsMinimum) {
      result.error = `Git version ${version.full} is below minimum required version ${minVersion.full}`;
    }

    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Check for Claude CLI installation
 * @returns {Promise<Object>} Claude CLI status
 */
export async function checkClaudeCLI() {
  const result = {
    installed: false,
    path: null,
    version: null,
    error: null
  };

  try {
    // Check for claude in PATH (global installation)
    let claudePath = await checkCommand('claude');
    
    if (!claudePath) {
      // Check local installation paths
      const homeDir = homedir();
      const localPaths = [
        join(homeDir, '.claude', 'local', 'claude.exe'), // Windows
        join(homeDir, '.claude', 'local', 'claude'),     // Unix-like
        join(homeDir, 'AppData', 'Local', 'claude', 'claude.exe'), // Alternative Windows path
      ];

      for (const path of localPaths) {
        if (existsSync(path)) {
          claudePath = path;
          break;
        }
      }
    }

    if (!claudePath) {
      result.error = 'Claude CLI not found. Please install it from https://claude.ai/cli';
      return result;
    }

    result.installed = true;
    result.path = claudePath;

    // Try to get version
    const versionOutput = getCommandVersion(claudePath, '--version');
    if (versionOutput) {
      const version = parseVersion(versionOutput);
      if (version) {
        result.version = version;
      }
    }

    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Generic tool checker
 * @param {string} command - Command to check
 * @param {Object} options - Options for checking
 * @returns {Promise<Object>} Tool status
 */
export async function checkTool(command, options = {}) {
  const {
    minVersion = null,
    versionFlag = '--version',
    installInstructions = `Please install ${command}`,
    localPaths = []
  } = options;

  const result = {
    installed: false,
    path: null,
    version: null,
    meetsMinimum: true,
    error: null
  };

  try {
    // Check in PATH
    let toolPath = await checkCommand(command);
    
    // Check local paths if not found in PATH
    if (!toolPath && localPaths.length > 0) {
      for (const path of localPaths) {
        if (existsSync(path)) {
          toolPath = path;
          break;
        }
      }
    }

    if (!toolPath) {
      result.error = `${command} not found. ${installInstructions}`;
      return result;
    }

    result.installed = true;
    result.path = toolPath;

    // Get version if needed
    if (minVersion || versionFlag) {
      const versionOutput = getCommandVersion(toolPath, versionFlag);
      if (versionOutput) {
        const version = parseVersion(versionOutput);
        if (version) {
          result.version = version;
          
          if (minVersion) {
            result.meetsMinimum = compareVersions(version, minVersion) >= 0;
            if (!result.meetsMinimum) {
              result.error = `${command} version ${version.full} is below minimum required version ${minVersion.full}`;
            }
          }
        }
      }
    }

    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Print tool status
 * @param {string} toolName - Name of the tool
 * @param {Object} status - Tool status object
 */
export function printToolStatus(toolName, status) {
  if (status.installed && !status.error) {
    console.log(chalk.green(`✓ ${toolName} found`));
    if (status.path) {
      console.log(chalk.gray(`  Path: ${status.path}`));
    }
    if (status.version) {
      console.log(chalk.gray(`  Version: ${status.version.full}`));
    }
  } else {
    console.log(chalk.red(`✗ ${toolName} issue`));
    if (status.error) {
      console.log(chalk.yellow(`  ${status.error}`));
    }
    
    // Platform-specific installation instructions
    if (toolName.toLowerCase() === 'git') {
      console.log(chalk.blue('\n  Installation instructions:'));
      console.log(chalk.gray('  - Windows: Download from https://git-scm.com/download/win'));
      console.log(chalk.gray('  - Or use: winget install Git.Git'));
    } else if (toolName.toLowerCase() === 'claude cli') {
      console.log(chalk.blue('\n  Installation instructions:'));
      console.log(chalk.gray('  1. Visit https://claude.ai/cli'));
      console.log(chalk.gray('  2. Download the installer for Windows'));
      console.log(chalk.gray('  3. Run the installer and follow instructions'));
      console.log(chalk.gray('  4. Restart your terminal after installation'));
    }
  }
}

/**
 * Check all required tools
 * @returns {Promise<Object>} Status of all tools
 */
export async function checkAllTools() {
  console.log(chalk.bold('\nChecking required tools...\n'));
  
  const gitStatus = await checkGit();
  printToolStatus('Git', gitStatus);
  
  console.log(); // Empty line
  
  const claudeStatus = await checkClaudeCLI();
  printToolStatus('Claude CLI', claudeStatus);
  
  return {
    git: gitStatus,
    claude: claudeStatus,
    allInstalled: gitStatus.installed && claudeStatus.installed,
    allMeetRequirements: gitStatus.installed && gitStatus.meetsMinimum && claudeStatus.installed
  };
}