#!/usr/bin/env node
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';

// ASCII Art Banner - exact copy from Python version
const BANNER = `
███████╗██████╗ ███████╗ ██████╗██╗███████╗██╗   ██╗
██╔════╝██╔══██╗██╔════╝██╔════╝██║██╔════╝╚██╗ ██╔╝
███████╗██████╔╝█████╗  ██║     ██║█████╗   ╚████╔╝ 
╚════██║██╔═══╝ ██╔══╝  ██║     ██║██╔══╝    ╚██╔╝  
███████║██║     ███████╗╚██████╗██║██║        ██║   
╚══════╝╚═╝     ╚══════╝ ╚═════╝╚═╝╚═╝        ╚═╝   
`;

const MINI_BANNER = `
╔═╗╔═╗╔═╗╔═╗╦╔═╗╦ ╦
╚═╗╠═╝║╣ ║  ║╠╣ ╚╦╝
╚═╝╩  ╚═╝╚═╝╩╚   ╩ 
`;

const TAGLINE = "Spec-Driven Development Toolkit";

// Color palette matching Python version
export const COLORS = {
  gradient: ['blueBright', 'blue', 'cyan', 'cyanBright', 'white', 'whiteBright'],
  tagline: 'italic yellow',
  primary: 'cyan',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  dim: 'gray',
  brightBlack: 'gray',
  brightCyan: 'cyanBright',
  brightYellow: 'yellowBright'
};

/**
 * Get terminal width with fallback
 * @returns {number} Terminal width
 */
function getTerminalWidth() {
  return process.stdout.columns || 80;
}

/**
 * Get visible width of text (without ANSI codes)
 * @param {string} text - Text to measure
 * @returns {number} Visible width
 */
function getTextWidth(text) {
  return stripAnsi(text).length;
}

/**
 * Center align text based on terminal width
 * @param {string} text - Text to center
 * @returns {string} Centered text
 */
function centerText(text) {
  const termWidth = getTerminalWidth();
  const textWidth = getTextWidth(text);
  const padding = Math.max(0, Math.floor((termWidth - textWidth) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Apply gradient coloring to banner lines
 * @param {string} banner - Banner text
 * @param {string[]} colors - Array of color names
 * @returns {string} Colored banner
 */
function applyGradient(banner, colors) {
  const lines = banner.trim().split('\n');
  return lines.map((line, index) => {
    const colorFn = chalk[colors[index % colors.length]];
    return colorFn(line);
  }).join('\n');
}

/**
 * Display the main ASCII art banner with gradient and centering
 */
export function showBanner() {
  const termWidth = getTerminalWidth();
  
  // Use mini banner for narrow terminals
  const bannerToUse = termWidth < 60 ? MINI_BANNER : BANNER;
  
  // Apply gradient coloring
  const coloredBanner = applyGradient(bannerToUse, COLORS.gradient);
  
  // Center each line
  const centeredBanner = coloredBanner.split('\n').map(line => centerText(line)).join('\n');
  
  // Display banner
  console.log(centeredBanner);
  
  // Display tagline
  const styledTagline = chalk.italic.yellowBright(TAGLINE);
  console.log(centerText(styledTagline));
  console.log(); // Empty line after banner
}

/**
 * Check if terminal supports colors
 * @returns {boolean} True if colors are supported
 */
export function supportsColor() {
  return chalk.supportsColor !== false;
}

/**
 * Create a fallback for non-color terminals
 * @param {string} text - Text to display
 * @param {string} colorName - Color name (ignored in fallback)
 * @returns {string} Text without coloring
 */
export function colorFallback(text, colorName) {
  if (supportsColor()) {
    const colorFn = chalk[colorName] || chalk.white;
    return colorFn(text);
  }
  return text;
}

// Export theme constants
export const THEME = {
  banner: {
    colors: COLORS.gradient,
    taglineStyle: COLORS.tagline
  },
  ui: {
    primary: COLORS.primary,
    success: COLORS.success,
    error: COLORS.error,
    warning: COLORS.warning,
    dim: COLORS.dim
  },
  status: {
    pending: { symbol: '○', color: 'green', dim: true },
    running: { symbol: '○', color: 'cyan' },
    done: { symbol: '●', color: 'green' },
    error: { symbol: '●', color: 'red' },
    skipped: { symbol: '○', color: 'yellow' }
  }
};

// Export terminal width helper
export { getTerminalWidth };

// Test the banner if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  showBanner();
}