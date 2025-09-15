#!/usr/bin/env node

/**
 * Test template processing functionality
 */

import { processTemplate, parseFrontmatter, replaceVariables } from '../src/utils/templates.js';
import { logger as log } from '../src/utils/logger.js';
import { join } from 'path';

async function testTemplateProcessing() {
  log.info('Testing template processing...');
  
  // Test command template processing
  const commandPath = join(process.cwd(), 'templates', '.claude', 'commands', 'specify.md');
  
  try {
    // Test with shell variant
    log.info('Processing template for shell variant...');
    const shContent = await processTemplate(commandPath, { FEATURE: 'test-feature' }, 'sh');
    log.info('Shell variant processed successfully');
    
    // Test with PowerShell variant
    log.info('Processing template for PowerShell variant...');
    const psContent = await processTemplate(commandPath, { FEATURE: 'test-feature' }, 'ps');
    log.info('PowerShell variant processed successfully');
    
    // Show the differences
    log.info('\nShell variant script command:');
    const shMatch = shContent.match(/Run the script `([^`]+)`/);
    if (shMatch) {
      log.info(`  ${shMatch[1]}`);
    }
    
    log.info('\nPowerShell variant script command:');
    const psMatch = psContent.match(/Run the script `([^`]+)`/);
    if (psMatch) {
      log.info(`  ${psMatch[1]}`);
    }
    
    // Test frontmatter parsing
    log.info('\nTesting frontmatter parsing...');
    const { frontmatter, body } = parseFrontmatter(await processTemplate(commandPath, {}, 'sh'));
    if (frontmatter) {
      log.info('Frontmatter parsed:');
      log.info(`  Description: ${frontmatter.description}`);
      log.info(`  Scripts:`, frontmatter.scripts);
    }
    
    // Test variable replacement
    log.info('\nTesting variable replacement...');
    const testContent = 'Hello __AGENT__, run {SCRIPT} with {ARGS}';
    const replaced = replaceVariables(testContent, { SCRIPT: 'test.sh' }, 'sh');
    log.info(`  Original: ${testContent}`);
    log.info(`  Replaced: ${replaced}`);
    
    log.success('Template processing tests completed!');
  } catch (error) {
    log.error('Template processing failed:', error.message);
    throw error;
  }
}

// Run test
(async () => {
  try {
    await testTemplateProcessing();
  } catch (error) {
    log.error('Test failed:', error.message);
    process.exit(1);
  }
})();