#!/usr/bin/env node

/**
 * Test shell detection functionality
 */

import { detectShellType } from '../src/utils/templates.js';
import { logger as log } from '../src/utils/logger.js';

async function testShellDetection() {
  log.info('Testing shell detection...');
  
  // Show environment info
  log.info('Environment variables:');
  log.info(`  MSYSTEM: ${process.env.MSYSTEM || '(not set)'}`);
  log.info(`  MINGW_PREFIX: ${process.env.MINGW_PREFIX || '(not set)'}`);
  log.info(`  WSL_DISTRO_NAME: ${process.env.WSL_DISTRO_NAME || '(not set)'}`);
  log.info(`  ComSpec: ${process.env.ComSpec || '(not set)'}`);
  
  // Detect shell type
  const shellType = await detectShellType();
  log.success(`Detected shell type: ${shellType}`);
  
  return shellType;
}

// Run test
(async () => {
  try {
    await testShellDetection();
  } catch (error) {
    log.error('Test failed:', error.message);
    process.exit(1);
  }
})();