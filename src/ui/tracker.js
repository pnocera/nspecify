import chalk from 'chalk';
import { THEME } from './banner.js';

/**
 * Step tracker for hierarchical progress display
 * Matches Python StepTracker without emojis
 */
export class StepTracker {
  constructor(title) {
    this.title = title;
    this.steps = [];
    this.statusOrder = {
      pending: 0,
      running: 1,
      done: 2,
      error: 3,
      skipped: 4
    };
    this.refreshCallback = null;
    this.lastRenderLines = 0;
  }

  /**
   * Attach a refresh callback for live updates
   * @param {Function} callback - Function to call on updates
   */
  attachRefresh(callback) {
    this.refreshCallback = callback;
  }

  /**
   * Add a new step
   * @param {string} key - Unique key for the step
   * @param {string} label - Display label for the step
   */
  add(key, label) {
    const existing = this.steps.find(s => s.key === key);
    if (!existing) {
      this.steps.push({
        key,
        label,
        status: 'pending',
        detail: ''
      });
      this.maybeRefresh();
    }
  }

  /**
   * Start a step
   * @param {string} key - Step key
   * @param {string} detail - Optional detail message
   */
  start(key, detail = '') {
    this.update(key, 'running', detail);
  }

  /**
   * Complete a step
   * @param {string} key - Step key
   * @param {string} detail - Optional detail message
   */
  complete(key, detail = '') {
    this.update(key, 'done', detail);
  }

  /**
   * Mark step as error
   * @param {string} key - Step key
   * @param {string} detail - Error detail
   */
  error(key, detail = '') {
    this.update(key, 'error', detail);
  }

  /**
   * Skip a step
   * @param {string} key - Step key
   * @param {string} detail - Skip reason
   */
  skip(key, detail = '') {
    this.update(key, 'skipped', detail);
  }

  /**
   * Update step status
   * @param {string} key - Step key
   * @param {string} status - New status
   * @param {string} detail - Detail message
   */
  update(key, status, detail) {
    let step = this.steps.find(s => s.key === key);
    
    if (!step) {
      // Add step if not present
      step = { key, label: key, status, detail };
      this.steps.push(step);
    } else {
      step.status = status;
      if (detail) {
        step.detail = detail;
      }
    }
    
    this.maybeRefresh();
  }

  /**
   * Trigger refresh if callback attached
   */
  maybeRefresh() {
    if (this.refreshCallback) {
      try {
        this.refreshCallback();
      } catch (e) {
        // Ignore refresh errors
      }
    }
  }

  /**
   * Get status symbol and color
   * @param {string} status - Step status
   * @returns {Object} Symbol and color info
   */
  getStatusDisplay(status) {
    const displays = {
      done: { symbol: '●', color: chalk.green },
      pending: { symbol: '○', color: chalk.green.dim },
      running: { symbol: '○', color: chalk.cyan },
      error: { symbol: '●', color: chalk.red },
      skipped: { symbol: '○', color: chalk.yellow }
    };
    
    return displays[status] || { symbol: ' ', color: chalk.white };
  }

  /**
   * Render the tree structure
   * @returns {string} Rendered tree
   */
  render() {
    const lines = [];
    
    // Title
    lines.push(chalk.bold.cyan(this.title));
    
    // Render each step with tree structure
    this.steps.forEach((step, index) => {
      const isLast = index === this.steps.length - 1;
      const branch = isLast ? '└─' : '├─';
      const { symbol, color } = this.getStatusDisplay(step.status);
      
      // Build the step line
      let line = chalk.gray(branch) + ' ' + color(symbol) + ' ';
      
      if (step.status === 'pending') {
        // Entire line light gray for pending
        if (step.detail) {
          line += chalk.gray(`${step.label} (${step.detail})`);
        } else {
          line += chalk.gray(step.label);
        }
      } else {
        // Label white, detail light gray in parentheses
        line += chalk.white(step.label);
        if (step.detail) {
          line += chalk.gray(` (${step.detail})`);
        }
      }
      
      lines.push(line);
    });
    
    return lines.join('\n');
  }

  /**
   * Clear previous render from terminal
   */
  clearPreviousRender() {
    if (this.lastRenderLines > 0) {
      // Move cursor up and clear lines
      for (let i = 0; i < this.lastRenderLines; i++) {
        process.stdout.write('\x1B[1A\x1B[2K');
      }
    }
  }

  /**
   * Display the tracker with live updates
   * @param {boolean} clearPrevious - Clear previous render
   */
  display(clearPrevious = true) {
    if (clearPrevious) {
      this.clearPreviousRender();
    }
    
    const rendered = this.render();
    process.stdout.write(rendered);
    
    // Count lines for next clear
    this.lastRenderLines = rendered.split('\n').length;
  }
}

/**
 * Tree rendering utilities
 */
export const tree = {
  /**
   * Unicode box drawing characters
   */
  chars: {
    vertical: '│',
    horizontal: '─',
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    cross: '┼',
    teeRight: '├',
    teeLeft: '┤',
    teeDown: '┬',
    teeUp: '┴'
  },

  /**
   * Build tree structure from items
   * @param {Array} items - Items to display
   * @param {Object} options - Display options
   * @returns {string} Tree structure
   */
  build(items, options = {}) {
    const {
      title = 'Tree',
      showRoot = true,
      compact = false
    } = options;
    
    const lines = [];
    
    if (showRoot) {
      lines.push(chalk.bold(title));
    }
    
    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const prefix = isLast ? '└─' : '├─';
      const connector = isLast ? '  ' : '│ ';
      
      // Main item line
      lines.push(chalk.gray(prefix) + ' ' + item.label);
      
      // Children or details
      if (item.children && item.children.length > 0) {
        item.children.forEach((child, childIndex) => {
          const isLastChild = childIndex === item.children.length - 1;
          const childPrefix = isLastChild ? '└─' : '├─';
          lines.push(chalk.gray(connector + childPrefix) + ' ' + child);
        });
      }
      
      // Add spacing unless compact mode
      if (!compact && !isLast) {
        lines.push(chalk.gray('│'));
      }
    });
    
    return lines.join('\n');
  }
};

/**
 * Live update manager for flicker-free rendering
 */
export class LiveUpdater {
  constructor() {
    this.isActive = false;
    this.updateQueue = [];
    this.currentLines = 0;
    this.updateInterval = null;
  }

  /**
   * Start live updates
   * @param {number} refreshRate - Updates per second
   */
  start(refreshRate = 10) {
    if (this.isActive) return;
    
    this.isActive = true;
    const interval = 1000 / refreshRate;
    
    this.updateInterval = setInterval(() => {
      this.processQueue();
    }, interval);
  }

  /**
   * Stop live updates
   */
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Queue an update
   * @param {Function} renderFn - Function that returns rendered content
   */
  queue(renderFn) {
    this.updateQueue.push(renderFn);
  }

  /**
   * Process queued updates
   */
  processQueue() {
    if (this.updateQueue.length === 0) return;
    
    // Get the latest update
    const renderFn = this.updateQueue[this.updateQueue.length - 1];
    this.updateQueue = [];
    
    // Clear previous content
    this.clearLines(this.currentLines);
    
    // Render new content
    const content = renderFn();
    process.stdout.write(content);
    
    // Track line count
    this.currentLines = content.split('\n').length;
  }

  /**
   * Clear lines from terminal
   * @param {number} count - Number of lines to clear
   */
  clearLines(count) {
    if (count <= 0) return;
    
    // Save cursor position
    process.stdout.write('\x1B[s');
    
    // Move up and clear lines
    for (let i = 0; i < count; i++) {
      process.stdout.write('\x1B[1A\x1B[2K');
    }
    
    // Restore cursor position
    process.stdout.write('\x1B[u');
  }

  /**
   * Final render and cleanup
   * @param {Function} renderFn - Final render function
   */
  finish(renderFn) {
    this.stop();
    this.clearLines(this.currentLines);
    
    const content = renderFn();
    console.log(content);
  }
}

/**
 * Create a progress tracker with live updates
 * @param {string} title - Tracker title
 * @returns {Object} Tracker and updater
 */
export function createLiveTracker(title) {
  const tracker = new StepTracker(title);
  const updater = new LiveUpdater();
  
  // Attach refresh to updater
  tracker.attachRefresh(() => {
    updater.queue(() => tracker.render());
  });
  
  return { tracker, updater };
}