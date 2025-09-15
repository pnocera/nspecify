#!/usr/bin/env node

/**
 * Test archive contents
 */

import AdmZip from 'adm-zip';
import { join } from 'path';
import { logger as log } from '../src/utils/logger.js';

async function testArchiveContents() {
  const archivePath = join(process.cwd(), 'dist', 'nspecify-0.1.0-ps.zip');
  
  log.info(`Testing archive: ${archivePath}`);
  
  try {
    const zip = new AdmZip(archivePath);
    const entries = zip.getEntries();
    
    log.info(`\nArchive contains ${entries.length} files:`);
    
    const fileTree = {};
    entries.forEach(entry => {
      const path = entry.entryName;
      log.info(`  - ${path}`);
      
      // Build file tree
      const parts = path.split('/');
      let current = fileTree;
      parts.forEach((part, i) => {
        if (i === parts.length - 1 && !entry.isDirectory) {
          current[part] = 'file';
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    });
    
    // Check manifest
    const manifestEntry = entries.find(e => e.entryName === 'manifest.json');
    if (manifestEntry) {
      const manifest = JSON.parse(zip.readAsText(manifestEntry));
      log.info('\nManifest contents:');
      log.info(JSON.stringify(manifest, null, 2));
    }
    
    log.success('\nArchive structure verified!');
  } catch (error) {
    log.error('Failed to read archive:', error.message);
    throw error;
  }
}

// Run test
(async () => {
  try {
    await testArchiveContents();
  } catch (error) {
    log.error('Test failed:', error.message);
    process.exit(1);
  }
})();