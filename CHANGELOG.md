# Changelog

## [1.0.3] - 2025-09-15

### Added
- Template packages for shell and PowerShell variants

### Packages
- nspecify-1.0.3-sh.zip
- nspecify-1.0.3-ps.zip


## [1.0.2] - 2025-09-15

### Added
- Template packages for shell and PowerShell variants

### Packages
- nspecify-1.0.2-sh.zip
- nspecify-1.0.2-ps.zip


## [1.0.1] - 2025-09-15

### Added
- Template packages for shell and PowerShell variants

### Packages
- nspecify-1.0.1-sh.zip
- nspecify-1.0.1-ps.zip


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-15

### 🎉 First Stable Release

This is the first stable release of nspecify, a modern Node.js implementation of the spec-driven development CLI. The tool is production-ready and provides a complete workflow for specification-based development with AI assistants.

### Key Features
- **Zero-install usage** via npx: `npx nspecify init my-project`
- **Cross-platform support** for Windows, macOS, and Linux
- **Multiple AI assistants**: Claude Code, Gemini CLI, GitHub Copilot, and Cursor
- **Dual scripting options**: POSIX Shell and PowerShell
- **Rich terminal UI** with progress tracking and interactive selection
- **Comprehensive error handling** with helpful suggestions
- **Template caching** for offline usage
- **Robust validation** and system requirements checking

### What's Included
- Complete CLI implementation with `init` and `check` commands
- 8 template variants (4 AI tools × 2 script types)
- Extensive documentation (user guide, API reference, architecture)
- Example projects and migration guide
- Comprehensive test suite with 95%+ coverage
- Security-hardened dependencies

### Installation
```bash
# Global installation
npm install -g nspecify

# Or use directly with npx (recommended)
npx nspecify init my-project
```

### Breaking Changes from Python Version
- Node.js 20+ required (previously Python 3.11+)
- New command structure with improved error messages
- Enhanced template format with better AI guidance
- See migration guide for detailed upgrade instructions

## [1.0.0-rc.1] - 2025-01-15

### Added
- Complete Node.js implementation of spec-driven development CLI
- NPX compatibility for zero-install usage
- Interactive AI assistant selection (Claude Code, Gemini CLI, GitHub Copilot, Cursor)
- Cross-platform script support (POSIX Shell and PowerShell)
- Enhanced error messages with helpful suggestions
- Comprehensive documentation:
  - User guide with installation, usage, troubleshooting, and FAQ
  - Developer contribution guide
  - System architecture documentation
  - API reference
- Example projects and migration guide from Python version
- Security improvements with updated dependencies
- Performance optimizations for faster startup
- Template caching mechanism
- Live progress tracking for downloads
- System requirements checking with detailed feedback

### Changed
- Migrated from Python to Node.js for better performance and compatibility
- Improved error handling with contextual suggestions
- Enhanced UI with better terminal support
- Updated minimum Node.js version to 20.0.0

### Fixed
- Security vulnerabilities in axios dependency
- Cross-platform path handling issues
- Permission setting on Windows
- Network timeout handling

### Security
- Updated axios from 1.7.7 to 1.12.0 to fix SSRF and DoS vulnerabilities
- Low-severity eslint dev dependency vulnerabilities remain (not affecting runtime)

## [0.1.0] - 2024-12-15

### Added
- Initial alpha release
- Basic project initialization
- Template downloading from GitHub releases
- Simple error handling
- Basic documentation