import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { logger } from './logger.js';

/**
 * Simple template caching mechanism to improve performance
 */

/**
 * Get cache directory path
 * @returns {string} Cache directory path
 */
function getCacheDir() {
  const cacheDir = path.join(os.homedir(), '.nspecify', 'cache');
  return cacheDir;
}

/**
 * Get cache file path for a specific template
 * @param {string} aiAssistant - AI assistant name
 * @param {string} scriptType - Script type
 * @returns {string} Cache file path
 */
function getCachePath(aiAssistant, scriptType) {
  const cacheDir = getCacheDir();
  const fileName = `${aiAssistant}-${scriptType}.zip`;
  return path.join(cacheDir, fileName);
}

/**
 * Ensure cache directory exists
 * @returns {Promise<void>}
 */
async function ensureCacheDir() {
  const cacheDir = getCacheDir();
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch (error) {
    logger.debug('Failed to create cache directory:', error);
  }
}

/**
 * Check if cached template exists and is recent
 * @param {string} aiAssistant - AI assistant name
 * @param {string} scriptType - Script type
 * @param {number} [maxAge=86400000] - Maximum age in milliseconds (default: 24 hours)
 * @returns {Promise<boolean>} True if valid cache exists
 */
export async function hasValidCache(aiAssistant, scriptType, maxAge = 24 * 60 * 60 * 1000) {
  try {
    const cachePath = getCachePath(aiAssistant, scriptType);
    const stats = await fs.stat(cachePath);
    
    // Check if cache is within max age
    const age = Date.now() - stats.mtime.getTime();
    const isValid = age < maxAge;
    
    logger.debug(`Cache for ${aiAssistant}-${scriptType}: ${isValid ? 'valid' : 'expired'} (age: ${Math.round(age / 1000)}s)`);
    
    return isValid;
  } catch (error) {
    // Cache doesn't exist
    return false;
  }
}

/**
 * Get cached template path
 * @param {string} aiAssistant - AI assistant name
 * @param {string} scriptType - Script type
 * @returns {Promise<string|null>} Cache file path or null if not found
 */
export async function getCachedTemplate(aiAssistant, scriptType) {
  try {
    const isValid = await hasValidCache(aiAssistant, scriptType);
    if (!isValid) {
      return null;
    }
    
    const cachePath = getCachePath(aiAssistant, scriptType);
    logger.debug(`Using cached template: ${cachePath}`);
    return cachePath;
  } catch (error) {
    logger.debug('Failed to get cached template:', error);
    return null;
  }
}

/**
 * Save template to cache
 * @param {string} aiAssistant - AI assistant name
 * @param {string} scriptType - Script type
 * @param {string} sourcePath - Path to template file to cache
 * @returns {Promise<void>}
 */
export async function cacheTemplate(aiAssistant, scriptType, sourcePath) {
  try {
    await ensureCacheDir();
    
    const cachePath = getCachePath(aiAssistant, scriptType);
    await fs.copyFile(sourcePath, cachePath);
    
    logger.debug(`Cached template: ${cachePath}`);
  } catch (error) {
    logger.debug('Failed to cache template:', error);
    // Non-critical error, continue without caching
  }
}

/**
 * Clear template cache
 * @param {string} [aiAssistant] - AI assistant name (optional, clears all if not provided)
 * @param {string} [scriptType] - Script type (optional)
 * @returns {Promise<void>}
 */
export async function clearCache(aiAssistant, scriptType) {
  try {
    if (aiAssistant && scriptType) {
      // Clear specific cache
      const cachePath = getCachePath(aiAssistant, scriptType);
      await fs.unlink(cachePath);
      logger.debug(`Cleared cache: ${cachePath}`);
    } else {
      // Clear all cache
      const cacheDir = getCacheDir();
      await fs.rm(cacheDir, { recursive: true, force: true });
      logger.debug('Cleared all cache');
    }
  } catch (error) {
    logger.debug('Failed to clear cache:', error);
  }
}

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache statistics
 */
export async function getCacheStats() {
  const stats = {
    totalSize: 0,
    fileCount: 0,
    oldestFile: null,
    newestFile: null
  };
  
  try {
    const cacheDir = getCacheDir();
    const files = await fs.readdir(cacheDir);
    
    for (const file of files) {
      if (!file.endsWith('.zip')) continue;
      
      const filePath = path.join(cacheDir, file);
      const fileStat = await fs.stat(filePath);
      
      stats.totalSize += fileStat.size;
      stats.fileCount++;
      
      if (!stats.oldestFile || fileStat.mtime < stats.oldestFile.mtime) {
        stats.oldestFile = { name: file, mtime: fileStat.mtime };
      }
      
      if (!stats.newestFile || fileStat.mtime > stats.newestFile.mtime) {
        stats.newestFile = { name: file, mtime: fileStat.mtime };
      }
    }
  } catch (error) {
    logger.debug('Failed to get cache stats:', error);
  }
  
  return stats;
}

/**
 * Prune old cache files
 * @param {number} [maxAge=604800000] - Maximum age in milliseconds (default: 7 days)
 * @returns {Promise<number>} Number of files pruned
 */
export async function pruneCache(maxAge = 7 * 24 * 60 * 60 * 1000) {
  let prunedCount = 0;
  
  try {
    const cacheDir = getCacheDir();
    const files = await fs.readdir(cacheDir);
    const now = Date.now();
    
    for (const file of files) {
      if (!file.endsWith('.zip')) continue;
      
      const filePath = path.join(cacheDir, file);
      const fileStat = await fs.stat(filePath);
      const age = now - fileStat.mtime.getTime();
      
      if (age > maxAge) {
        await fs.unlink(filePath);
        prunedCount++;
        logger.debug(`Pruned old cache file: ${file}`);
      }
    }
    
    if (prunedCount > 0) {
      logger.debug(`Pruned ${prunedCount} old cache files`);
    }
  } catch (error) {
    logger.debug('Failed to prune cache:', error);
  }
  
  return prunedCount;
}