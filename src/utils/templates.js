/**
 * Template processing utilities
 * Handles template loading, variable replacement, and script variant selection
 */

import { readFile, writeFile, access, readdir } from 'fs/promises';
import { join, dirname, relative, normalize } from 'path';
import { existsSync } from 'fs';
import { parse } from 'yaml';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger as log } from './logger.js';
import { ensureDirectory } from './files.js';

const execAsync = promisify(exec);

/**
 * Detect the user's shell environment on Windows
 * @returns {Promise<'ps'|'sh'>} The detected shell type
 */
export async function detectShellType() {
  // Check if we're in Git Bash
  if (process.env.MSYSTEM || process.env.MINGW_PREFIX) {
    log.info('Detected Git Bash environment');
    return 'sh';
  }

  // Check if we're in WSL
  if (process.env.WSL_DISTRO_NAME) {
    log.info('Detected WSL environment');
    return 'sh';
  }

  // Check for PowerShell
  try {
    const { stdout } = await execAsync('powershell -Command "$PSVersionTable.PSVersion.ToString()"', {
      windowsHide: true,
      timeout: 5000
    });
    if (stdout && stdout.trim()) {
      log.info(`Detected PowerShell version: ${stdout.trim()}`);
      return 'ps';
    }
  } catch (e) {
    // PowerShell not available or command failed
  }

  // Default to PowerShell on Windows
  log.info('Defaulting to PowerShell for Windows environment');
  return 'ps';
}

/**
 * Parse YAML frontmatter from template content
 * @param {string} content - The template content
 * @returns {{frontmatter: object|null, body: string}} Parsed frontmatter and body
 */
export function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: null, body: content };
  }

  try {
    const frontmatter = parse(match[1]);
    return { frontmatter, body: match[2] };
  } catch (error) {
    log.warn('Failed to parse YAML frontmatter:', error.message);
    return { frontmatter: null, body: content };
  }
}

/**
 * Replace template variables in content
 * @param {string} content - The template content
 * @param {object} variables - Variables to replace
 * @param {string} shellType - Shell type ('sh' or 'ps')
 * @returns {string} Content with replaced variables
 */
export function replaceVariables(content, variables = {}, shellType = 'ps') {
  let processed = content;

  // Handle script-specific replacements
  const { frontmatter, body } = parseFrontmatter(content);
  
  if (frontmatter && frontmatter.scripts) {
    const scriptPath = frontmatter.scripts[shellType];
    if (scriptPath) {
      // Replace {SCRIPT} with the appropriate script command
      processed = body.replace(/{SCRIPT}/g, scriptPath);
    }
  }

  // Replace {ARGS} with proper argument format
  const argFormat = shellType === 'ps' ? '-Json' : '--json';
  processed = processed.replace(/{ARGS}/g, argFormat);

  // Replace __AGENT__ with "claude" (we only support Claude Code)
  processed = processed.replace(/__AGENT__/g, 'claude');

  // Replace any custom variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    processed = processed.replace(regex, value);
  });

  return processed;
}

/**
 * Transform template paths for the target structure
 * @param {string} sourcePath - Source template path
 * @returns {string} Transformed path
 */
export function transformTemplatePath(sourcePath) {
  // Normalize the path for consistent handling
  const normalized = normalize(sourcePath);
  
  // Transform known path patterns
  const transformations = {
    'memory/': '.specify/memory/',
    'scripts/bash/': '.specify/scripts/sh/',
    'scripts/powershell/': '.specify/scripts/ps/',
    'templates/': '.specify/templates/',
    'commands/': '.claude/commands/'
  };

  let transformed = normalized;
  for (const [from, to] of Object.entries(transformations)) {
    if (normalized.includes(from)) {
      transformed = normalized.replace(from, to);
      break;
    }
  }

  return transformed;
}

/**
 * Load a template file
 * @param {string} templatePath - Path to the template file
 * @returns {Promise<string>} Template content
 */
export async function loadTemplate(templatePath) {
  try {
    const content = await readFile(templatePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to load template ${templatePath}: ${error.message}`);
  }
}

/**
 * Process a template file with variable replacement
 * @param {string} templatePath - Path to the template file
 * @param {object} variables - Variables to replace
 * @param {string} shellType - Shell type ('sh' or 'ps')
 * @returns {Promise<string>} Processed template content
 */
export async function processTemplate(templatePath, variables = {}, shellType = null) {
  const content = await loadTemplate(templatePath);
  const detectedShellType = shellType || await detectShellType();
  return replaceVariables(content, variables, detectedShellType);
}

/**
 * Copy and process template directory
 * @param {string} sourceDir - Source template directory
 * @param {string} targetDir - Target directory
 * @param {object} variables - Variables to replace
 * @param {string} shellType - Shell type ('sh' or 'ps')
 */
export async function copyTemplateDirectory(sourceDir, targetDir, variables = {}, shellType = null) {
  const detectedShellType = shellType || await detectShellType();
  
  // Ensure target directory exists
  await ensureDirectory(targetDir);

  // Get all files in source directory
  const files = await readdir(sourceDir, { withFileTypes: true, recursive: true });

  for (const file of files) {
    if (file.isFile()) {
      const sourcePath = join(file.path, file.name);
      const relativePath = relative(sourceDir, sourcePath);
      const targetPath = join(targetDir, relativePath);

      // Ensure target directory exists
      await ensureDirectory(dirname(targetPath));

      // Process template files, copy others as-is
      if (file.name.endsWith('.md') || file.name.endsWith('.sh') || file.name.endsWith('.ps1')) {
        const content = await processTemplate(sourcePath, variables, detectedShellType);
        await writeFile(targetPath, content, 'utf-8');
        log.debug(`Processed template: ${relativePath}`);
      } else {
        const content = await readFile(sourcePath);
        await writeFile(targetPath, content);
        log.debug(`Copied file: ${relativePath}`);
      }
    }
  }
}

/**
 * Get script command for a given command template
 * @param {string} commandName - Name of the command
 * @param {string} shellType - Shell type ('sh' or 'ps')
 * @returns {Promise<string|null>} Script command or null
 */
export async function getScriptCommand(commandName, shellType = null) {
  const detectedShellType = shellType || await detectShellType();
  const templatePath = join(process.cwd(), 'templates', '.claude', 'commands', `${commandName}.md`);

  try {
    const content = await loadTemplate(templatePath);
    const { frontmatter } = parseFrontmatter(content);
    
    if (frontmatter && frontmatter.scripts) {
      return frontmatter.scripts[detectedShellType] || null;
    }
  } catch (error) {
    log.warn(`Failed to get script command for ${commandName}:`, error.message);
  }

  return null;
}

/**
 * Create a script wrapper function
 * @param {string} scriptPath - Path to the script
 * @param {string} shellType - Shell type ('sh' or 'ps')
 * @returns {function} Script wrapper function
 */
export function createScriptWrapper(scriptPath, shellType = 'ps') {
  return async (args = []) => {
    const command = shellType === 'ps' 
      ? `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" ${args.join(' ')}`
      : `bash "${scriptPath}" ${args.join(' ')}`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        windowsHide: true
      });

      if (stderr) {
        log.warn('Script stderr:', stderr);
      }

      return stdout.trim();
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  };
}

/**
 * Validate template structure
 * @param {string} templateDir - Template directory to validate
 * @returns {Promise<{valid: boolean, errors: string[]}>} Validation result
 */
export async function validateTemplateStructure(templateDir) {
  const errors = [];
  const requiredPaths = [
    '.specify/memory/constitution.md',
    '.specify/scripts/sh/create-new-feature.sh',
    '.specify/scripts/ps/create-new-feature.ps1',
    '.specify/templates/spec-template.md',
    '.claude/commands/specify.md'
  ];

  for (const requiredPath of requiredPaths) {
    const fullPath = join(templateDir, requiredPath);
    if (!existsSync(fullPath)) {
      errors.push(`Missing required file: ${requiredPath}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}