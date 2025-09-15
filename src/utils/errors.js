import chalk from 'chalk';
import { logger } from './logger.js';

/**
 * Enhanced error handling with helpful suggestions
 */

/**
 * Error types with specific handling
 */
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  PERMISSION: 'PERMISSION',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_DEPENDENCY: 'MISSING_DEPENDENCY',
  FILE_SYSTEM: 'FILE_SYSTEM',
  CONFIGURATION: 'CONFIGURATION',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Detect error type from error object
 * @param {Error} error - Error object
 * @returns {string} Error type from ErrorTypes
 */
export function detectErrorType(error) {
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';

  // Network errors
  if (code === 'econnreset' || code === 'etimedout' || code === 'enotfound' ||
    message.includes('network') || message.includes('timeout') ||
    message.includes('certificate') || message.includes('ssl')) {
    return ErrorTypes.NETWORK;
  }

  // Permission errors
  if (code === 'eacces' || code === 'eperm' || message.includes('permission')) {
    return ErrorTypes.PERMISSION;
  }

  // File system errors
  if (code === 'enoent' || code === 'eexist' || code === 'eisdir' ||
    message.includes('file') || message.includes('directory')) {
    return ErrorTypes.FILE_SYSTEM;
  }

  // Invalid input
  if (message.includes('invalid') || message.includes('illegal')) {
    return ErrorTypes.INVALID_INPUT;
  }

  // Missing dependencies
  if (message.includes('not found') || message.includes('missing')) {
    return ErrorTypes.MISSING_DEPENDENCY;
  }

  return ErrorTypes.UNKNOWN;
}

/**
 * Get helpful suggestions based on error type
 * @param {string} errorType - Error type from ErrorTypes
 * @param {Error} error - Original error object
 * @returns {string[]} Array of suggestion strings
 */
export function getErrorSuggestions(errorType, error) {
  const suggestions = [];

  switch (errorType) {
    case ErrorTypes.NETWORK:
      suggestions.push('Check your internet connection');
      suggestions.push('Verify firewall/proxy settings');

      if (error.message?.includes('certificate') || error.message?.includes('ssl')) {
        suggestions.push('Try using --skip-tls flag (not recommended for production)');
        suggestions.push('Update your system certificates');
        suggestions.push('Check if you\'re behind a corporate firewall');
      }

      if (error.message?.includes('timeout')) {
        suggestions.push('Try increasing timeout with --timeout flag');
        suggestions.push('Check if GitHub is accessible from your network');
      }

      suggestions.push('Try again in a few moments');
      break;

    case ErrorTypes.PERMISSION:
      suggestions.push('Check directory/file permissions');

      if (process.platform === 'win32') {
        suggestions.push('Run as Administrator if needed');
        suggestions.push('Check if antivirus is blocking file operations');
      } else {
        suggestions.push('Use sudo if needed (for global installs)');
        suggestions.push(`Check ownership: ls -la ${error.path || '.'}`);
      }

      suggestions.push('Try running in a different directory');
      break;

    case ErrorTypes.FILE_SYSTEM:
      if (error.code === 'ENOENT') {
        suggestions.push('Verify the file/directory path exists');
        suggestions.push('Check for typos in the path');
      } else if (error.code === 'EEXIST') {
        suggestions.push('Choose a different name or remove existing file/directory');
        suggestions.push('Use --force flag if available');
      }

      suggestions.push('Ensure you have write permissions in this directory');
      break;

    case ErrorTypes.INVALID_INPUT:
      suggestions.push('Check command syntax: nspecify --help');
      suggestions.push('Verify all required arguments are provided');
      suggestions.push('Ensure special characters are properly escaped');

      if (process.platform === 'win32') {
        suggestions.push('Use double quotes for paths with spaces');
      } else {
        suggestions.push('Use quotes for arguments with spaces');
      }
      break;

    case ErrorTypes.MISSING_DEPENDENCY:
      suggestions.push('Run: nspecify check');
      suggestions.push('Install missing dependencies');
      suggestions.push('Verify Node.js version >= 20.0.0');

      if (error.message?.includes('git')) {
        suggestions.push('Install Git from https://git-scm.com');
      }
      break;

    default:
      suggestions.push('Run with --debug flag for more details');
      suggestions.push('Check https://github.com/pnocera/nspecify/issues');
      suggestions.push('Report issue with full error message');
  }

  return suggestions;
}

/**
 * Format error message with suggestions
 * @param {Error} error - Error object
 * @param {Object} [options={}] - Formatting options
 * @param {boolean} [options.showStack=false] - Show stack trace
 * @param {string} [options.context] - Additional context
 * @returns {string} Formatted error message
 */
export function formatErrorMessage(error, options = {}) {
  const { showStack = false, context } = options;
  const errorType = detectErrorType(error);
  const suggestions = getErrorSuggestions(errorType, error);

  let output = [];

  // Error header
  output.push(chalk.red.bold('\n✗ Error: ') + chalk.red(error.message));

  // Context if provided
  if (context) {
    output.push(chalk.gray(`  Context: ${context}`));
  }

  // Error details
  if (error.code) {
    output.push(chalk.gray(`  Code: ${error.code}`));
  }

  // Suggestions
  if (suggestions.length > 0) {
    output.push(chalk.yellow.bold('\n💡 Suggestions:'));
    suggestions.forEach(suggestion => {
      output.push(chalk.yellow(`  • ${suggestion}`));
    });
  }

  // Stack trace in debug mode
  if (showStack && error.stack) {
    output.push(chalk.gray('\nStack trace:'));
    output.push(chalk.gray(error.stack));
  }

  // Help footer
  output.push(chalk.gray('\nFor more help:'));
  output.push(chalk.gray('  • Run with --debug flag'));
  output.push(chalk.gray('  • Visit https://github.com/pnocera/nspecify/issues\n'));

  return output.join('\n');
}

/**
 * Handle error with proper formatting and exit
 * @param {Error} error - Error object
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.exit=true] - Whether to exit process
 * @param {number} [options.exitCode=1] - Exit code
 * @param {boolean} [options.showStack=false] - Show stack trace
 * @param {string} [options.context] - Additional context
 */
export function handleError(error, options = {}) {
  const {
    exit = true,
    exitCode = 1,
    showStack = logger.level === 'debug',
    context
  } = options;

  // Log to debug
  logger.debug('Error details:', error);

  // Format and display error
  const formattedError = formatErrorMessage(error, { showStack, context });
  console.error(formattedError);

  // Exit if requested
  if (exit) {
    process.exit(exitCode);
  }
}

/**
 * Create a custom error with type
 * @param {string} message - Error message
 * @param {string} type - Error type from ErrorTypes
 * @param {Object} [properties={}] - Additional properties
 * @returns {Error} Enhanced error object
 */
export function createError(message, type = ErrorTypes.UNKNOWN, properties = {}) {
  const error = new Error(message);
  error.type = type;

  // Add any additional properties
  Object.assign(error, properties);

  return error;
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {Object} [options={}] - Error handling options
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, options = {}) {
  return async function wrappedFunction(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      handleError(error, options);
    }
  };
}

/**
 * Common error messages with helpful context
 */
export const ErrorMessages = {
  NETWORK_TIMEOUT: 'Network request timed out. This might be due to slow connection or firewall restrictions.',
  PERMISSION_DENIED: 'Permission denied. You may need elevated privileges or write access to this location.',
  INVALID_PROJECT_NAME: 'Invalid project name. Use only letters, numbers, hyphens, and underscores.',
  DIRECTORY_EXISTS: 'Directory already exists. Choose a different name or remove the existing directory.',
  GIT_NOT_FOUND: 'Git is not installed or not in PATH. Visit https://git-scm.com for installation.',
  NODE_VERSION_TOO_OLD: 'Node.js version is too old. Please upgrade to Node.js 20 or higher.',
  TEMPLATE_DOWNLOAD_FAILED: 'Failed to download templates. Check your internet connection and try again.',
  INVALID_SCRIPT_TYPE: 'Invalid script type. Choose either "posix" for shell scripts or "powershell" for Windows.',
  AI_ASSISTANT_NOT_SUPPORTED: 'AI assistant not supported. Choose from: claude-code, gemini-cli, github-copilot, or cursor.'
};

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Async operation to retry
 * @param {Object} [options={}] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.initialDelay=1000] - Initial delay in ms
 * @param {number} [options.maxDelay=10000] - Maximum delay in ms
 * @param {Function} [options.onRetry] - Callback on retry
 * @returns {Promise<*>} Operation result
 */
export async function retryWithBackoff(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(error, attempt + 1, delay);
        }

        await new Promise(resolve => setTimeout(resolve, delay));

        // Exponential backoff with jitter
        delay = Math.min(delay * 2 + Math.random() * 1000, maxDelay);
      }
    }
  }

  throw lastError;
}