import { program } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const version = packageJson.version;

// Configure global error handling
process.on('SIGINT', () => {
  console.log('\nOperation cancelled by user');
  process.exit(0);
});

// Setup commander program
program
  .name('nspecify')
  .description('npx-compatible CLI for Spec-Driven Development with Claude Code')
  .version(version, '-v, --version', 'display version number')
  .helpOption('-h, --help', 'display help for command')
  .option('-d, --debug', 'enable debug logging', false)
  .hook('preAction', (thisCommand) => {
    // Enable debug mode if flag is set
    if (thisCommand.opts().debug) {
      process.env.DEBUG = 'true';
      logger.debug('Debug mode enabled');
    }
  });

// Import commands
import { registerCheckCommand } from './commands/check.js';
import { registerInitCommand } from './commands/init.js';

// Register commands
registerCheckCommand(program);
registerInitCommand(program);

// Global error handling for commands
program.exitOverride((err) => {
  if (err.code === 'commander.missingArgument') {
    console.error(`Error: ${err.message}`);
    console.error(`Run 'nspecify --help' for usage information.`);
  } else if (err.code === 'commander.unknownCommand') {
    console.error(`Error: Unknown command '${err.message}'`);
    console.error(`Run 'nspecify --help' to see available commands.`);
  } else if (err.code !== 'commander.helpDisplayed') {
    console.error(`Error: ${err.message}`);
  }
  process.exit(err.exitCode);
});

// Parse command line arguments
try {
  program.parse(process.argv);
} catch (error) {
  logger.error('Failed to parse command:', error.message);
  process.exit(1);
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}