import { simpleGit } from 'simple-git';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

/**
 * Git operations utilities for Windows and cross-platform compatibility
 */

/**
 * Create a configured simple-git instance
 * @param {string} baseDir - Base directory for git operations
 * @returns {Object} Configured simple-git instance
 */
function createGit(baseDir = process.cwd()) {
  return simpleGit({
    baseDir,
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: true,
    config: [
      // Handle Windows line endings
      'core.autocrlf=true'
    ]
  });
}

/**
 * Check if a directory is a git repository
 * @param {string} path - Directory path to check
 * @returns {Promise<boolean>} True if git repository
 */
export async function isGitRepository(path) {
  try {
    const gitDir = join(path, '.git');
    if (!existsSync(gitDir)) {
      return false;
    }
    
    const git = createGit(path);
    await git.status();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize a new git repository
 * @param {string} path - Directory path to initialize
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} Result of initialization
 */
export async function initRepository(path, options = {}) {
  const {
    initialBranch = 'main',
    dryRun = false
  } = options;
  
  const result = {
    success: false,
    alreadyExists: false,
    error: null,
    path
  };

  try {
    // Check if already a repository
    if (await isGitRepository(path)) {
      result.alreadyExists = true;
      result.success = true;
      return result;
    }

    if (dryRun) {
      console.log(chalk.gray(`[DRY RUN] Would initialize git repository in: ${path}`));
      result.success = true;
      return result;
    }

    const git = createGit(path);
    
    // Initialize with main as default branch
    await git.init(['--initial-branch=' + initialBranch]);
    
    result.success = true;
    console.log(chalk.green(`✓ Initialized git repository in: ${path}`));
    
    return result;
  } catch (error) {
    result.error = error.message;
    console.error(chalk.red(`✗ Failed to initialize repository: ${error.message}`));
    return result;
  }
}

/**
 * Create initial commit
 * @param {string} path - Repository path
 * @param {Object} options - Commit options
 * @returns {Promise<Object>} Result of commit
 */
export async function createInitialCommit(path, options = {}) {
  const {
    message = 'Initial commit',
    dryRun = false,
    author = null
  } = options;
  
  const result = {
    success: false,
    commitHash: null,
    error: null,
    filesCommitted: 0
  };

  try {
    const git = createGit(path);
    
    // Check if repository exists
    if (!await isGitRepository(path)) {
      result.error = 'Not a git repository';
      return result;
    }

    // Check current status
    const status = await git.status();
    
    // Count files to commit
    const filesToCommit = [
      ...status.not_added,
      ...status.created,
      ...status.modified,
      ...status.deleted,
      ...status.renamed
    ];
    
    if (filesToCommit.length === 0) {
      result.error = 'No files to commit';
      return result;
    }

    if (dryRun) {
      console.log(chalk.gray(`[DRY RUN] Would commit ${filesToCommit.length} files with message: "${message}"`));
      result.success = true;
      result.filesCommitted = filesToCommit.length;
      return result;
    }

    // Stage all files
    await git.add('.');
    
    // Set author if provided
    if (author) {
      await git.addConfig('user.name', author.name);
      await git.addConfig('user.email', author.email);
    }
    
    // Create commit
    const commitResult = await git.commit(message);
    
    result.success = true;
    result.commitHash = commitResult.commit;
    result.filesCommitted = filesToCommit.length;
    
    console.log(chalk.green(`✓ Created initial commit: ${commitResult.commit.substring(0, 7)}`));
    console.log(chalk.gray(`  ${result.filesCommitted} files committed`));
    
    return result;
  } catch (error) {
    result.error = error.message;
    console.error(chalk.red(`✗ Failed to create commit: ${error.message}`));
    return result;
  }
}

/**
 * Get repository status
 * @param {string} path - Repository path
 * @returns {Promise<Object>} Repository status
 */
export async function getRepositoryStatus(path) {
  try {
    const git = createGit(path);
    const status = await git.status();
    
    return {
      success: true,
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      staged: status.staged,
      modified: status.modified,
      notAdded: status.not_added,
      deleted: status.deleted,
      renamed: status.renamed,
      conflicted: status.conflicted,
      isClean: status.isClean()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle git repository setup
 * @param {string} path - Directory path
 * @param {Object} options - Setup options
 * @returns {Promise<Object>} Setup result
 */
export async function setupGitRepository(path, options = {}) {
  const {
    initialCommit = true,
    commitMessage = 'Initial commit',
    author = null,
    dryRun = false
  } = options;
  
  console.log(chalk.bold('\nSetting up git repository...\n'));
  
  // Initialize repository
  const initResult = await initRepository(path, { dryRun });
  if (!initResult.success) {
    return {
      success: false,
      error: initResult.error
    };
  }
  
  // Create initial commit if requested and not already exists
  if (initialCommit && !initResult.alreadyExists) {
    const commitResult = await createInitialCommit(path, {
      message: commitMessage,
      author,
      dryRun
    });
    
    return {
      success: commitResult.success,
      initialized: true,
      committed: commitResult.success,
      commitHash: commitResult.commitHash,
      filesCommitted: commitResult.filesCommitted,
      error: commitResult.error
    };
  }
  
  return {
    success: true,
    initialized: !initResult.alreadyExists,
    committed: false,
    alreadyExists: initResult.alreadyExists
  };
}

/**
 * Print repository status
 * @param {Object} status - Repository status object
 */
export function printRepositoryStatus(status) {
  if (!status.success) {
    console.log(chalk.red('✗ Could not get repository status'));
    if (status.error) {
      console.log(chalk.yellow(`  ${status.error}`));
    }
    return;
  }
  
  console.log(chalk.bold('\nRepository Status:'));
  console.log(chalk.gray(`  Branch: ${status.branch}`));
  
  if (status.isClean) {
    console.log(chalk.green('  ✓ Working tree clean'));
  } else {
    if (status.staged.length > 0) {
      console.log(chalk.yellow(`  Staged: ${status.staged.length} files`));
    }
    if (status.modified.length > 0) {
      console.log(chalk.yellow(`  Modified: ${status.modified.length} files`));
    }
    if (status.notAdded.length > 0) {
      console.log(chalk.yellow(`  Untracked: ${status.notAdded.length} files`));
    }
  }
}