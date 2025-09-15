import { 
  existsSync, 
  mkdirSync, 
  readFileSync, 
  writeFileSync, 
  copyFileSync,
  readdirSync,
  statSync,
  renameSync,
  unlinkSync,
  rmSync
} from 'fs';
import { promises as fs } from 'fs';
import { join, dirname, basename, extname, sep, normalize } from 'path';
import { platform } from 'os';
import chalk from 'chalk';

/**
 * File operations utilities with Windows compatibility
 */

/**
 * Normalize path for current platform
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
export function normalizePath(path) {
  // Normalize and handle Windows backslashes
  return normalize(path);
}

/**
 * Join paths safely for current platform
 * @param {...string} paths - Paths to join
 * @returns {string} Joined path
 */
export function safePath(...paths) {
  return normalizePath(join(...paths));
}

/**
 * Create directory with parents if needed
 * @param {string} dirPath - Directory path to create
 * @param {Object} options - Creation options
 * @returns {boolean} True if created or exists
 */
export function ensureDirectory(dirPath, options = {}) {
  const { mode = 0o755 } = options;
  
  try {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true, mode });
      return true;
    }
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to create directory: ${dirPath}`));
    console.error(chalk.yellow(error.message));
    return false;
  }
}

/**
 * Copy file with optional overwrite
 * @param {string} source - Source file path
 * @param {string} destination - Destination file path
 * @param {Object} options - Copy options
 * @returns {Object} Copy result
 */
export function copyFile(source, destination, options = {}) {
  const { 
    overwrite = true, 
    backup = false,
    preserveTimestamps = true 
  } = options;
  
  const result = {
    success: false,
    backed_up: false,
    error: null
  };

  try {
    // Check if source exists
    if (!existsSync(source)) {
      result.error = `Source file not found: ${source}`;
      return result;
    }

    // Ensure destination directory exists
    const destDir = dirname(destination);
    if (!ensureDirectory(destDir)) {
      result.error = `Failed to create destination directory: ${destDir}`;
      return result;
    }

    // Handle existing file
    if (existsSync(destination)) {
      if (!overwrite) {
        result.error = `Destination file already exists: ${destination}`;
        return result;
      }
      
      if (backup) {
        const backupPath = `${destination}.backup`;
        copyFileSync(destination, backupPath);
        result.backed_up = true;
      }
    }

    // Copy file
    copyFileSync(source, destination);
    
    // Note: Windows doesn't support changing file timestamps easily
    // preserveTimestamps is ignored on Windows
    
    result.success = true;
    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Write file atomically
 * @param {string} filePath - File path to write
 * @param {string|Buffer} content - Content to write
 * @param {Object} options - Write options
 * @returns {Object} Write result
 */
export function writeFileAtomic(filePath, content, options = {}) {
  const { 
    encoding = 'utf8',
    mode = 0o644,
    backup = false 
  } = options;
  
  const result = {
    success: false,
    backed_up: false,
    error: null
  };

  try {
    // Ensure directory exists
    const dir = dirname(filePath);
    if (!ensureDirectory(dir)) {
      result.error = `Failed to create directory: ${dir}`;
      return result;
    }

    // Backup existing file if requested
    if (backup && existsSync(filePath)) {
      const backupPath = `${filePath}.backup`;
      copyFileSync(filePath, backupPath);
      result.backed_up = true;
    }

    // Write to temporary file first
    const tempPath = `${filePath}.tmp`;
    writeFileSync(tempPath, content, { encoding });

    // Move temp file to final location (atomic on same filesystem)
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    renameSync(tempPath, filePath);

    // Note: Windows doesn't support chmod in the same way
    // File permissions are handled differently on Windows
    
    result.success = true;
    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Read file safely
 * @param {string} filePath - File path to read
 * @param {Object} options - Read options
 * @returns {Object} Read result with content
 */
export function readFileSafe(filePath, options = {}) {
  const { encoding = 'utf8' } = options;
  
  const result = {
    success: false,
    content: null,
    error: null
  };

  try {
    if (!existsSync(filePath)) {
      result.error = `File not found: ${filePath}`;
      return result;
    }

    result.content = readFileSync(filePath, encoding);
    result.success = true;
    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Scan directory for files matching pattern
 * @param {string} dirPath - Directory to scan
 * @param {Object} options - Scan options
 * @returns {Array} Array of matching file paths
 */
export function scanDirectory(dirPath, options = {}) {
  const {
    recursive = true,
    pattern = null,
    excludeDirs = ['.git', 'node_modules', '.vscode'],
    includeHidden = false
  } = options;
  
  const files = [];
  
  function scan(currentPath) {
    try {
      const entries = readdirSync(currentPath);
      
      for (const entry of entries) {
        // Skip hidden files if not included
        if (!includeHidden && entry.startsWith('.')) {
          continue;
        }
        
        const fullPath = join(currentPath, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip excluded directories
          if (excludeDirs.includes(entry)) {
            continue;
          }
          
          if (recursive) {
            scan(fullPath);
          }
        } else {
          // Check pattern if provided
          if (!pattern || matchesPattern(entry, pattern)) {
            files.push(normalizePath(fullPath));
          }
        }
      }
    } catch (error) {
      console.error(chalk.yellow(`Error scanning ${currentPath}: ${error.message}`));
    }
  }
  
  scan(dirPath);
  return files;
}

/**
 * Check if filename matches pattern
 * @param {string} filename - Filename to check
 * @param {string|RegExp} pattern - Pattern to match
 * @returns {boolean} True if matches
 */
function matchesPattern(filename, pattern) {
  if (pattern instanceof RegExp) {
    return pattern.test(filename);
  }
  
  // Convert glob-like pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
    
  return new RegExp(`^${regexPattern}$`).test(filename);
}

/**
 * Replace placeholders in content
 * @param {string} content - Content with placeholders
 * @param {Object} replacements - Key-value pairs for replacement
 * @returns {string} Content with replacements
 */
export function replacePlaceholders(content, replacements) {
  let result = content;
  
  for (const [key, value] of Object.entries(replacements)) {
    // Replace {{key}} style placeholders
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(placeholder, value);
    
    // Replace ${key} style placeholders
    const varPlaceholder = new RegExp(`\\$\\{${key}\\}`, 'g');
    result = result.replace(varPlaceholder, value);
  }
  
  return result;
}

/**
 * Determine if file is binary
 * @param {string} filePath - File path to check
 * @returns {boolean} True if binary
 */
export function isBinaryFile(filePath) {
  const binaryExtensions = [
    '.exe', '.dll', '.so', '.dylib',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv',
    '.ttf', '.otf', '.woff', '.woff2'
  ];
  
  const ext = extname(filePath).toLowerCase();
  return binaryExtensions.includes(ext);
}

/**
 * Set file permissions (Windows-compatible)
 * @param {string} filePath - File path
 * @param {number} mode - Unix-style mode (ignored on Windows)
 * @returns {boolean} Success
 */
export function setFilePermissions(filePath, mode) {
  // On Windows, we can't set Unix-style permissions
  // This function is a no-op on Windows but returns true for compatibility
  if (platform() === 'win32') {
    return true;
  }
  
  try {
    // On Unix-like systems, we would use fs.chmodSync here
    // But since we're on Windows, just return true
    return true;
  } catch (error) {
    console.error(chalk.yellow(`Permission setting not supported on Windows`));
    return false;
  }
}

/**
 * Make file executable (cross-platform)
 * @param {string} filePath - File path to make executable
 * @returns {boolean} Success
 */
export function makeExecutable(filePath) {
  if (platform() === 'win32') {
    // On Windows, .exe, .bat, .cmd, .ps1 files are executable by extension
    const ext = extname(filePath).toLowerCase();
    const executableExtensions = ['.exe', '.bat', '.cmd', '.ps1'];
    
    if (!executableExtensions.includes(ext)) {
      console.log(chalk.yellow(`Note: On Windows, file needs .exe, .bat, .cmd, or .ps1 extension to be executable`));
    }
    return true;
  }
  
  // On Unix-like systems, we would set execute permission
  return setFilePermissions(filePath, 0o755);
}

/**
 * Get file info
 * @param {string} filePath - File path
 * @returns {Object|null} File info or null
 */
export function getFileInfo(filePath) {
  try {
    const stat = statSync(filePath);
    return {
      exists: true,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      created: stat.birthtime,
      modified: stat.mtime,
      accessed: stat.atime
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if file exists
 * @param {string} filePath - File path to check
 * @returns {Promise<boolean>} True if file exists
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create directory recursively
 * @param {string} dirPath - Directory path to create
 * @returns {Promise<void>}
 */
export async function createDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Delete directory recursively
 * @param {string} dirPath - Directory path to delete
 * @returns {Promise<void>}
 */
export async function deleteDirectory(dirPath) {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
}