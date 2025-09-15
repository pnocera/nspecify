import { checkAllTools } from '../utils/tools.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Check command - verify system requirements
 */
export async function checkCommand(options = {}) {
  const { quiet = false } = options;
  
  if (!quiet) {
    console.log(chalk.bold.blue('\nnspecify System Check\n'));
  }
  
  try {
    // Check all required tools
    const toolsStatus = await checkAllTools();
    
    if (!toolsStatus.allMeetRequirements) {
      console.log(chalk.red('\n✗ System check failed'));
      console.log(chalk.yellow('Please install missing tools and try again.\n'));
      return false;
    }
    
    console.log(chalk.green('\n✓ All system requirements met!'));
    console.log(chalk.gray('You can now use nspecify to create spec-driven projects.\n'));
    
    return true;
  } catch (error) {
    logger.error('System check failed:', error);
    return false;
  }
}