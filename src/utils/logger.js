import chalk from 'chalk';
import { SYMBOLS, COLORS } from '../constants.js';

/**
 * Logger utility for consistent output formatting
 */
class Logger {
  constructor() {
    this.debugMode = process.env.DEBUG === 'true';
  }

  /**
   * Format timestamp for log messages
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    return new Date().toISOString().split('T')[1].split('.')[0];
  }

  /**
   * Log debug message (only in debug mode)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  debug(message, ...args) {
    if (this.debugMode) {
      const timestamp = this.getTimestamp();
      console.log(
        chalk.gray(`[${timestamp}] ${SYMBOLS.info} DEBUG:`),
        chalk.gray(message),
        ...args,
      );
    }
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  info(message, ...args) {
    console.log(
      chalk[COLORS.info](`${SYMBOLS.info}`),
      message,
      ...args,
    );
  }

  /**
   * Log success message
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  success(message, ...args) {
    console.log(
      chalk[COLORS.success](`${SYMBOLS.success}`),
      chalk[COLORS.success](message),
      ...args,
    );
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  warn(message, ...args) {
    console.warn(
      chalk[COLORS.warning](`${SYMBOLS.warning}`),
      chalk[COLORS.warning](message),
      ...args,
    );
  }

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  error(message, ...args) {
    console.error(
      chalk[COLORS.error](`${SYMBOLS.error}`),
      chalk[COLORS.error](message),
      ...args,
    );
  }

  /**
   * Log message with custom formatting
   * @param {string} symbol - Symbol to use
   * @param {string} color - Chalk color name
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  custom(symbol, color, message, ...args) {
    console.log(
      chalk[color](symbol),
      chalk[color](message),
      ...args,
    );
  }

  /**
   * Print a blank line
   */
  blank() {
    console.log();
  }

  /**
   * Print a divider line
   * @param {number} length - Length of divider
   * @param {string} char - Character to use for divider
   */
  divider(length = 50, char = '-') {
    console.log(chalk.gray(char.repeat(length)));
  }

  /**
   * Print the ASCII banner
   * @param {string} banner - Banner text
   * @param {string} color - Chalk color name
   */
  banner(banner, color = COLORS.primary) {
    console.log(chalk[color](banner));
  }

  /**
   * Create a formatted list
   * @param {string[]} items - Items to list
   * @param {string} bullet - Bullet character
   */
  list(items, bullet = SYMBOLS.bullet) {
    items.forEach((item) => {
      console.log(`  ${chalk.gray(bullet)} ${item}`);
    });
  }

  /**
   * Format key-value pairs
   * @param {Object} data - Object with key-value pairs
   * @param {number} indent - Indentation level
   */
  keyValue(data, indent = 2) {
    const padding = ' '.repeat(indent);
    Object.entries(data).forEach(([key, value]) => {
      console.log(
        `${padding}${chalk.gray(key + ':')} ${value}`,
      );
    });
  }
}

// Export singleton instance
export const logger = new Logger();