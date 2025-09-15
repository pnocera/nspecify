import { checkAllTools } from '../utils/tools.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';
import os from 'node:os';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import Table from 'cli-table3';

/**
 * Get system information
 * @returns {Object} System information object
 * @returns {string} returns.os - Operating system and architecture
 * @returns {string} returns.node - Node.js version
 * @returns {string} returns.npm - npm version
 * @returns {string} returns.git - Git version
 * @returns {string} returns.shell - Current shell
 * @returns {string} returns.home - Home directory
 * @returns {string} returns.cwd - Current working directory
 */
function getSystemInfo() {
  const platform = os.platform();
  const arch = os.arch();
  const nodeVersion = process.version;
  const npmVersion = getToolVersion('npm --version');
  const gitVersion = getToolVersion('git --version');
  
  return {
    os: `${platform} ${arch}`,
    node: nodeVersion,
    npm: npmVersion,
    git: gitVersion,
    shell: process.env.SHELL || 'Unknown',
    home: os.homedir(),
    cwd: process.cwd()
  };
}

/**
 * Get version of a tool
 * @param {string} command - Command to execute to get version
 * @returns {string} Tool version or 'Not found' if tool is not available
 */
function getToolVersion(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' }).trim();
    return output.split('\n')[0];
  } catch {
    return 'Not found';
  }
}

/**
 * Format check result with appropriate symbol
 * @param {boolean} passed - Whether the check passed
 * @param {string|null} [version=null] - Optional version string to display
 * @returns {string} Formatted result with colored symbol
 */
function formatCheckResult(passed, version = null) {
  if (passed) {
    const symbol = chalk.green('✓');
    return version ? `${symbol} ${chalk.gray(version)}` : symbol;
  }
  return chalk.red('✗');
}

/**
 * Check command - verify system requirements
 * @param {Object} [options={}] - Command options
 * @param {boolean} [options.quiet=false] - Minimal output mode
 * @param {string|null} [options.export=null] - Path to export diagnostic information
 * @returns {Promise<boolean>} True if all checks pass, false otherwise
 */
export async function checkCommand(options = {}) {
  const { quiet = false, export: exportPath = null } = options;
  
  if (!quiet) {
    console.log(chalk.bold.blue('\nnspecify System Check\n'));
  }
  
  try {
    // Get system information
    const sysInfo = getSystemInfo();
    
    // Check all required tools
    const toolsStatus = await checkAllTools();
    
    // Create system info table
    const sysTable = new Table({
      head: [chalk.bold('System'), chalk.bold('Value')],
      style: { head: [], border: [] }
    });
    
    sysTable.push(
      ['Operating System', sysInfo.os],
      ['Node.js', sysInfo.node],
      ['npm', sysInfo.npm],
      ['Git', sysInfo.git],
      ['Shell', sysInfo.shell],
      ['Current Directory', sysInfo.cwd]
    );
    
    console.log(chalk.bold('System Information:'));
    console.log(sysTable.toString());
    
    // Create requirements table
    const reqTable = new Table({
      head: [
        chalk.bold('Requirement'),
        chalk.bold('Status'),
        chalk.bold('Details'),
        chalk.bold('Action')
      ],
      style: { head: [], border: [] },
      colWidths: [20, 10, 30, 40]
    });
    
    // Add tool checks
    const tools = {
      'Git': toolsStatus.git,
      'Claude CLI': toolsStatus.claude
    };
    
    for (const [toolName, status] of Object.entries(tools)) {
      const action = status.installed ? '' : getInstallInstructions(toolName.toLowerCase().replace(' cli', ''));
      reqTable.push([
        toolName,
        formatCheckResult(status.installed),
        status.version || 'Not installed',
        action
      ]);
    }
    
    // Add additional checks
    const writableCheck = await checkWritePermissions();
    reqTable.push([
      'Write Permissions',
      formatCheckResult(writableCheck.passed),
      writableCheck.details,
      writableCheck.action || ''
    ]);
    
    const networkCheck = await checkNetworkAccess();
    reqTable.push([
      'Network Access',
      formatCheckResult(networkCheck.passed),
      networkCheck.details,
      networkCheck.action || ''
    ]);
    
    console.log(chalk.bold('\nRequirements Check:'));
    console.log(reqTable.toString());
    
    // Export diagnostic info if requested
    if (exportPath) {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        system: sysInfo,
        tools: {
          git: toolsStatus.git,
          claude: toolsStatus.claude
        },
        additionalChecks: {
          writePermissions: writableCheck,
          networkAccess: networkCheck
        },
        environment: process.env
      };
      
      await fs.writeFile(
        exportPath,
        JSON.stringify(diagnostics, null, 2),
        'utf8'
      );
      console.log(chalk.gray(`\nDiagnostic information exported to: ${exportPath}`));
    }
    
    // Show overall result
    const allChecks = toolsStatus.allMeetRequirements && 
                      writableCheck.passed && 
                      networkCheck.passed;
    
    if (allChecks) {
      console.log(chalk.green.bold('\n✓ All system requirements met!'));
      console.log(chalk.gray('You can now use nspecify to create spec-driven projects.\n'));
    } else {
      console.log(chalk.red.bold('\n✗ Some requirements are not met'));
      console.log(chalk.yellow('Please address the issues above and try again.\n'));
    }
    
    // Show helpful tips
    if (!quiet && !allChecks) {
      console.log(chalk.bold('Troubleshooting Tips:'));
      console.log(chalk.gray('• Install missing tools using the provided instructions'));
      console.log(chalk.gray('• Ensure you have proper permissions in your working directory'));
      console.log(chalk.gray('• Check your internet connection and firewall settings'));
      console.log(chalk.gray('• Run with --export flag to save diagnostic information\n'));
    }
    
    return allChecks;
  } catch (error) {
    logger.error('System check failed:', error);
    console.error(chalk.red(`\nSystem check error: ${error.message}`));
    return false;
  }
}

/**
 * Get installation instructions for a tool
 * @param {string} tool - Tool name
 * @returns {string} Installation instructions for the tool
 */
function getInstallInstructions(tool) {
  const instructions = {
    git: 'Visit https://git-scm.com/downloads',
    claude: 'Visit https://claude.ai/download or npm install -g @anthropic-ai/claude-cli',
    gh: 'Visit https://cli.github.com/manual/installation',
    jq: os.platform() === 'win32' 
      ? 'winget install jqlang.jq' 
      : 'brew install jq (macOS) or apt install jq (Linux)',
    curl: os.platform() === 'win32'
      ? 'Included with Windows 10+'
      : 'Usually pre-installed'
  };
  
  return instructions[tool] || 'Check tool documentation';
}

/**
 * Check write permissions in current directory
 * @returns {Promise<Object>} Check result object
 * @returns {boolean} returns.passed - Whether the check passed
 * @returns {string} returns.details - Details about the check result
 * @returns {string|null} returns.action - Suggested action if check failed
 */
async function checkWritePermissions() {
  try {
    const testFile = path.join(process.cwd(), '.nspecify-test-' + Date.now());
    await fs.writeFile(testFile, 'test', 'utf8');
    await fs.unlink(testFile);
    
    return {
      passed: true,
      details: 'Can write to current directory',
      action: null
    };
  } catch (error) {
    return {
      passed: false,
      details: `Cannot write: ${error.message}`,
      action: 'Check directory permissions'
    };
  }
}

/**
 * Check network access to GitHub
 * @returns {Promise<Object>} Check result object
 * @returns {boolean} returns.passed - Whether the check passed
 * @returns {string} returns.details - Details about the check result
 * @returns {string|null} returns.action - Suggested action if check failed
 */
async function checkNetworkAccess() {
  try {
    // Use curl to check GitHub API
    execSync('curl -s -o nul -w "%{http_code}" https://api.github.com', {
      stdio: 'ignore',
      timeout: 5000
    });
    
    return {
      passed: true,
      details: 'Can reach GitHub',
      action: null
    };
  } catch (error) {
    return {
      passed: false,
      details: 'Cannot reach GitHub',
      action: 'Check internet connection and firewall'
    };
  }
}

/**
 * Register check command with commander
 * @param {import('commander').Command} program - Commander program instance
 * @returns {void}
 */
export function registerCheckCommand(program) {
  program
    .command('check')
    .description('Check system requirements for nspecify')
    .option('-q, --quiet', 'Minimal output')
    .option('--export <path>', 'Export diagnostic information to file')
    .action(checkCommand);
}