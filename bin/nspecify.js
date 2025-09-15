#!/usr/bin/env node

'use strict';

// Set process title
process.title = 'nspecify';

// Node version check
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0], 10);

if (majorVersion < 20) {
  console.error(
    `Error: nspecify requires Node.js version 20.0.0 or higher.`,
  );
  console.error(`You are currently using Node.js ${nodeVersion}.`);
  console.error(`Please upgrade your Node.js installation.`);
  process.exit(1);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Unexpected error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Import and run the main application
try {
  await import('../src/index.js');
} catch (error) {
  console.error('Failed to start nspecify:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
}