#!/usr/bin/env node

/**
 * Test template validation functionality
 */

import { validateTemplateStructure } from '../src/utils/templates.js';
import { logger as log } from '../src/utils/logger.js';
import { join } from 'path';

async function testTemplateValidation() {
  log.info('Testing template validation...');
  
  const templateDir = join(process.cwd(), 'templates');
  const validation = await validateTemplateStructure(templateDir);
  
  if (validation.valid) {
    log.success('Template structure is valid!');
  } else {
    log.error('Template validation failed:');
    validation.errors.forEach(error => {
      log.error(`  - ${error}`);
    });
  }
  
  return validation;
}

// Run test
(async () => {
  try {
    const result = await testTemplateValidation();
    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    log.error('Test failed:', error.message);
    process.exit(1);
  }
})();