import path from 'node:path';
import fs from 'node:fs/promises';
import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { handleError, ErrorMessages, createError, ErrorTypes } from '../utils/errors.js';
import { checkAllTools } from '../utils/tools.js';
import { initRepository } from '../utils/git.js';
import { createDirectory, fileExists, deleteDirectory } from '../utils/files.js';
import { downloadTemplate, extractTemplate } from '../utils/templates.js';
import { showBanner } from '../ui/banner.js';
import { createScriptSelector } from '../ui/selector.js';
import { createLiveTracker } from '../ui/tracker.js';
import os from 'node:os';
import { execSync } from 'node:child_process';

/**
 * Initialize a new spec-driven project
 * @param {string} projectName - Name of the project to create
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.here=false] - Initialize in current directory
 * @param {string} [options.script=null] - Script type (sh or ps)
 * @param {boolean} [options.noGit=false] - Skip git initialization
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @param {string} [options.aiTool='claude-code'] - AI assistant tool
 * @returns {Promise<void>}
 * @throws {Error} If initialization fails
 */
export async function initCommand(projectName, options = {}) {
  const {
    here = false,
    script = null,
    noGit = false,
    debug = false,
    aiTool = 'claude-code'
  } = options;

  // Enable debug logging if requested
  if (debug) {
    logger.level = 'debug';
  }

  // Show banner
  showBanner();

  // Validate arguments
  if (!here && !projectName) {
    throw createError(
      'Please provide a project name or use --here flag',
      ErrorTypes.INVALID_INPUT,
      { 
        usage: 'nspecify init <project-name> [options]\n       nspecify init --here [options]'
      }
    );
  }

  if (here && projectName) {
    throw createError(
      'Cannot specify both project name and --here flag',
      ErrorTypes.INVALID_INPUT,
      {
        suggestion: 'Use either a project name OR --here, not both'
      }
    );
  }

  // Determine project directory
  const targetDir = here ? process.cwd() : path.resolve(projectName);
  const projectDirName = path.basename(targetDir);

  // Check if directory exists (for non-here mode)
  if (!here && await fileExists(targetDir)) {
    throw createError(
      ErrorMessages.DIRECTORY_EXISTS,
      ErrorTypes.FILE_SYSTEM,
      {
        path: targetDir,
        suggestion: 'Choose a different name or use --here flag for current directory'
      }
    );
  }

  // Check for existing .specify directory in --here mode
  if (here && await fileExists(path.join(targetDir, '.specify'))) {
    throw createError(
      'This directory already has a .specify folder',
      ErrorTypes.FILE_SYSTEM,
      {
        path: path.join(targetDir, '.specify'),
        suggestion: 'Remove it first or choose a different directory'
      }
    );
  }

  logger.info(`Initializing project in: ${targetDir}`);

  // Run system check
  console.log(chalk.blue('\nChecking system requirements...'));
  const toolsStatus = await checkAllTools();

  if (!toolsStatus.allMeetRequirements) {
    throw createError(
      'System requirements not met',
      ErrorTypes.MISSING_DEPENDENCY,
      {
        details: toolsStatus,
        suggestion: 'Run "nspecify check" for detailed information'
      }
    );
  }

  console.log(chalk.green('✓ All requirements met'));

  // Select script type if not specified
  let scriptType = script;
  if (!scriptType) {
    const isWindows = os.platform() === 'win32';
    const defaultType = isWindows ? 'ps' : 'sh';
    
    scriptType = await createScriptSelector(defaultType);
    if (!scriptType) {
      console.log(chalk.yellow('\nInitialization cancelled'));
      process.exit(0);
    }
  }

  // Validate script type
  if (!['sh', 'ps'].includes(scriptType)) {
    throw createError(
      ErrorMessages.INVALID_SCRIPT_TYPE,
      ErrorTypes.INVALID_INPUT,
      {
        provided: scriptType,
        valid: ['sh', 'ps']
      }
    );
  }

  logger.info(`Using script type: ${scriptType}`);

  // Create project directory if needed
  if (!here) {
    try {
      await createDirectory(targetDir);
    } catch (error) {
      error.type = ErrorTypes.FILE_SYSTEM;
      error.context = 'Failed to create project directory';
      throw error;
    }
  }

  // Track initialization progress
  const steps = [
    'Downloading templates',
    'Extracting files',
    'Setting permissions',
    'Initializing git'
  ];

  if (noGit) {
    steps.pop(); // Remove git step
  }

  const tracker = createLiveTracker('Initializing project');
  
  // Add steps to tracker
  steps.forEach(step => {
    tracker.addStep({ description: step });
  });

  let cleanupNeeded = false;

  try {
    // Download templates
    tracker.updateStatus(0, 'running');
    const templatePath = await downloadTemplate(scriptType, targetDir, { aiTool });
    tracker.updateStatus(0, 'done');

    // Extract templates
    tracker.updateStatus(1, 'running');
    await extractTemplate(templatePath, targetDir);
    
    // Clean up downloaded file
    await fs.unlink(templatePath).catch(() => {});
    tracker.updateStatus(1, 'done');

    // Set permissions (non-Windows only)
    tracker.updateStatus(2, 'running');
    if (os.platform() !== 'win32') {
      const scriptsDir = path.join(targetDir, 'scripts');
      const scriptFiles = await fs.readdir(scriptsDir);
      
      for (const file of scriptFiles) {
        if (file.endsWith('.sh')) {
          const scriptPath = path.join(scriptsDir, file);
          await fs.chmod(scriptPath, '755');
          logger.debug(`Set execute permission on: ${file}`);
        }
      }
    }
    tracker.updateStatus(2, 'done');

    // Initialize git if requested
    if (!noGit) {
      tracker.updateStatus(3, 'running');
      const gitInitialized = await initRepository(targetDir);
      
      if (gitInitialized) {
        // Create initial commit
        try {
          execSync('git add .', { cwd: targetDir, stdio: 'ignore' });
          execSync('git commit -m "Initial commit with nspecify templates"', {
            cwd: targetDir,
            stdio: 'ignore'
          });
          logger.debug('Created initial git commit');
        } catch (error) {
          logger.warn('Could not create initial commit:', error.message);
        }
      }
      
      tracker.updateStatus(3, gitInitialized ? 'done' : 'error');
    }

    // Mark for cleanup if we created a directory
    cleanupNeeded = !here;
    
    // Stop the tracker
    tracker.stop();

    // Show completion message
    console.log(chalk.green.bold('\n✓ Project initialized successfully!\n'));

    // Show next steps
    console.log(chalk.bold('Next steps:'));
    
    if (!here) {
      console.log(chalk.gray(`  cd ${projectName}`));
    }

    console.log(chalk.gray('  cat .specify/overview.md     # Read the overview'));
    console.log(chalk.gray('  ./scripts/create-new-feature.sh my-feature  # Start a new feature'));
    
    if (scriptType === 'ps') {
      console.log(chalk.gray('\n  Or use PowerShell scripts:'));
      console.log(chalk.gray('  .\\scripts\\create-new-feature.ps1 my-feature'));
    }

    console.log(chalk.gray('\nRefer to .specify/overview.md for detailed guidance.\n'));

  } catch (error) {
    // Stop the tracker
    tracker.stop();
    
    // Rollback: clean up created directory if needed
    if (cleanupNeeded && !here) {
      const spinner = ora('Cleaning up...').start();
      try {
        await deleteDirectory(targetDir);
        spinner.succeed('Cleanup completed');
      } catch (cleanupError) {
        spinner.fail('Cleanup failed');
        logger.error('Cleanup error:', cleanupError);
      }
    }

    // Use enhanced error handling
    handleError(error, {
      context: 'Project initialization failed',
      showStack: debug
    });
  }
}

/**
 * Register init command with commander
 * @param {import('commander').Command} program - Commander program instance
 * @returns {void}
 */
export function registerInitCommand(program) {
  program
    .command('init [project-name]')
    .description('Initialize a new spec-driven project')
    .option('--here', 'Initialize in current directory')
    .option('--script <type>', 'Script type: sh or ps', /^(sh|ps)$/i)
    .option('--ai-tool <tool>', 'AI assistant tool', 'claude-code')
    .option('--no-git', 'Skip git initialization')
    .option('--debug', 'Enable debug logging')
    .action(initCommand);
}