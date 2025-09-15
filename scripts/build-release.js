#!/usr/bin/env node

/**
 * Build release packages for nspecify
 * Creates distribution packages with template variants
 */

import { readFile, writeFile, rm, readdir } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { existsSync } from 'fs';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { ensureDirectory } from '../src/utils/files.js';
import { logger as log } from '../src/utils/logger.js';
import { validateTemplateStructure } from '../src/utils/templates.js';
import { execSync } from 'child_process';

const PACKAGE_JSON_PATH = join(process.cwd(), 'package.json');
const TEMPLATES_DIR = join(process.cwd(), 'templates');
const DIST_DIR = join(process.cwd(), 'dist');
const CHANGELOG_PATH = join(process.cwd(), 'CHANGELOG.md');

/**
 * Read current version from package.json
 */
async function getCurrentVersion() {
  const packageJson = JSON.parse(await readFile(PACKAGE_JSON_PATH, 'utf-8'));
  return packageJson.version;
}

/**
 * Bump version based on type
 * @param {string} currentVersion - Current version
 * @param {string} bumpType - Type of bump (major, minor, patch)
 * @returns {string} New version
 */
function bumpVersion(currentVersion, bumpType = 'patch') {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Update version in package.json
 */
async function updatePackageVersion(newVersion) {
  const packageJson = JSON.parse(await readFile(PACKAGE_JSON_PATH, 'utf-8'));
  packageJson.version = newVersion;
  await writeFile(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
}

/**
 * Create a manifest file for the release
 */
async function createManifest(version, variant) {
  return {
    version,
    variant,
    created: new Date().toISOString(),
    tool: 'nspecify',
    compatibility: {
      node: '>=18.0.0',
      platforms: ['win32', 'darwin', 'linux']
    },
    templates: {
      commands: [
        'specify',
        'plan',
        'tasks'
      ],
      scripts: variant === 'sh' ? 'bash' : 'powershell'
    }
  };
}

/**
 * Create a zip archive of templates
 */
async function createArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      log.info(`Created archive: ${basename(outputPath)} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/**
 * Build release packages
 */
async function buildRelease(options = {}) {
  const { bumpType = 'patch', skipVersionBump = false } = options;

  try {
    log.info('Starting release build...');

    // Get current version
    const currentVersion = await getCurrentVersion();
    const newVersion = skipVersionBump ? currentVersion : bumpVersion(currentVersion, bumpType);

    if (!skipVersionBump) {
      log.info(`Bumping version from ${currentVersion} to ${newVersion}`);
      await updatePackageVersion(newVersion);
    }

    // Validate template structure
    log.info('Validating template structure...');
    const validation = await validateTemplateStructure(TEMPLATES_DIR);
    if (!validation.valid) {
      throw new Error(`Template validation failed:\n${validation.errors.join('\n')}`);
    }

    // Clean dist directory
    if (existsSync(DIST_DIR)) {
      await rm(DIST_DIR, { recursive: true });
    }
    await ensureDirectory(DIST_DIR);

    // Create release packages for each variant
    const variants = ['sh', 'ps'];
    const packages = [];

    for (const variant of variants) {
      log.info(`Building ${variant} variant...`);

      // Create variant-specific directory
      const variantDir = join(DIST_DIR, `nspecify-${newVersion}-${variant}`);
      await ensureDirectory(variantDir);

      // Copy templates
      const templateFiles = await readdir(TEMPLATES_DIR, { recursive: true, withFileTypes: true });
      for (const file of templateFiles) {
        if (file.isFile()) {
          const sourcePath = join(file.path, file.name);
          const relativePath = sourcePath.substring(TEMPLATES_DIR.length + 1);
          const targetPath = join(variantDir, relativePath);

          // Skip files from other variant
          if (variant === 'sh' && relativePath.includes('.specify\\scripts\\ps')) continue;
          if (variant === 'ps' && relativePath.includes('.specify\\scripts\\sh')) continue;

          await ensureDirectory(dirname(targetPath));
          await writeFile(targetPath, await readFile(sourcePath));
        }
      }

      // Create manifest
      const manifest = await createManifest(newVersion, variant);
      await writeFile(
        join(variantDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // Create archive
      const archiveName = `nspecify-${newVersion}-${variant}.zip`;
      const archivePath = join(DIST_DIR, archiveName);
      await createArchive(variantDir, archivePath);
      packages.push(archiveName);

      // Clean up variant directory
      await rm(variantDir, { recursive: true });
    }

    // Update changelog
    if (!skipVersionBump) {
      await updateChangelog(newVersion, packages);
    }

    // Create release notes
    const releaseNotes = await createReleaseNotes(newVersion, packages);
    await writeFile(join(DIST_DIR, 'RELEASE_NOTES.md'), releaseNotes);

    log.success(`Release ${newVersion} built successfully!`);
    log.info(`Packages created in ${DIST_DIR}:`);
    packages.forEach(pkg => log.info(`  - ${pkg}`));

    return { version: newVersion, packages };
  } catch (error) {
    log.error('Release build failed:', error.message);
    throw error;
  }
}

/**
 * Update changelog with new version
 */
async function updateChangelog(version, packages) {
  const date = new Date().toISOString().split('T')[0];
  const entry = `## [${version}] - ${date}

### Added
- Template packages for shell and PowerShell variants

### Packages
${packages.map(pkg => `- ${pkg}`).join('\n')}

`;

  let changelog = '';
  if (existsSync(CHANGELOG_PATH)) {
    changelog = await readFile(CHANGELOG_PATH, 'utf-8');
  } else {
    changelog = '# Changelog\n\nAll notable changes to nspecify will be documented in this file.\n\n';
  }

  // Insert new entry after header
  const lines = changelog.split('\n');
  const headerEnd = lines.findIndex(line => line.trim() === '') + 1;
  lines.splice(headerEnd, 0, entry);

  await writeFile(CHANGELOG_PATH, lines.join('\n'));
  log.info('Updated CHANGELOG.md');
}

/**
 * Create release notes for GitHub
 */
async function createReleaseNotes(version, packages) {
  const template = `# nspecify v${version}

## 🚀 Release Packages

${packages.map(pkg => `- \`${pkg}\` - ${pkg.includes('-sh.') ? 'Shell/Bash variant' : 'PowerShell variant'}`).join('\n')}

## 📦 Installation

\`\`\`bash
npm install -g nspecify@${version}
# or
pnpm add -g nspecify@${version}
\`\`\`

## 🔧 Usage

\`\`\`bash
nspecify init my-project
\`\`\`

## 📝 What's New

See [CHANGELOG.md](CHANGELOG.md) for detailed changes.

## 🐛 Bug Reports

Please report any issues at https://github.com/pnocera/nspecify/issues

---

*Built with ❤️ by the NSpecify team*
`;

  return template;
}

/**
 * Pre-publish validation
 */
async function validateRelease() {
  const errors = [];

  // Check Node version
  const nodeVersion = process.version;
  if (!nodeVersion.match(/^v(1[89]|[2-9]\d)/)) {
    errors.push(`Node.js version ${nodeVersion} is not supported. Requires v18 or higher.`);
  }

  // Check if git is clean
  try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (gitStatus.trim()) {
      errors.push('Git working directory is not clean. Please commit or stash changes.');
    }
  } catch (error) {
    errors.push('Failed to check git status. Is this a git repository?');
  }

  // Validate templates exist
  if (!existsSync(TEMPLATES_DIR)) {
    errors.push('Templates directory not found.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// CLI interface
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const args = process.argv.slice(2);
  const bumpType = args[0] || 'patch';
  const skipVersionBump = args.includes('--no-bump');

  (async () => {
    try {
      // Pre-publish validation (skip git check for dry runs)
      if (!skipVersionBump) {
        const validation = await validateRelease();
        if (!validation.valid) {
          log.error('Pre-publish validation failed:');
          validation.errors.forEach(err => log.error(`  - ${err}`));
          process.exit(1);
        }
      }

      await buildRelease({ bumpType, skipVersionBump });
    } catch (error) {
      log.error(error.message);
      process.exit(1);
    }
  })();
}

export { buildRelease, validateRelease };