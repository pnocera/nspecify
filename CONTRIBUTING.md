# Contributing to nspecify

Thank you for your interest in contributing to nspecify! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Style Guide](#style-guide)
- [Commit Guidelines](#commit-guidelines)
- [Release Process](#release-process)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the Repository**
   - Visit https://github.com/pnocera/nspecify
   - Click the "Fork" button in the top right
   - Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/nspecify.git
   cd nspecify
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/pnocera/nspecify.git
   ```

3. **Keep Your Fork Updated**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Git
- A code editor (VS Code recommended)

### Installation

1. **Install Dependencies**
   ```bash
   cd nspecify
   pnpm install
   ```

2. **Set Up Git Hooks** (optional but recommended)
   ```bash
   pnpm dlx husky install
   ```

3. **Verify Setup**
   ```bash
   pnpm test
   pnpm run check
   ```

### Development Commands

```bash
# Run the CLI in development mode
pnpm dev

# Run tests
pnpm test                  # All tests
pnpm test:unit            # Unit tests only
pnpm test:integration     # Integration tests only
pnpm test:coverage        # With coverage report
pnpm test:watch          # Watch mode

# Code quality
pnpm lint                 # Run ESLint
pnpm format              # Format code with Prettier

# Build
pnpm build               # Build release
pnpm build:dry          # Dry run (no version bump)
pnpm validate           # Validate build
```

## Project Structure

```
nspecify/
├── bin/
│   └── nspecify.js      # CLI entry point
├── src/
│   ├── commands/        # CLI commands
│   │   ├── init.js      # Initialize command
│   │   └── check.js     # Check command
│   ├── ui/              # User interface components
│   │   ├── banner.js    # ASCII banner
│   │   ├── selector.js  # Interactive selector
│   │   └── tracker.js   # Progress tracker
│   ├── utils/           # Utility functions
│   │   ├── files.js     # File operations
│   │   ├── git.js       # Git operations
│   │   ├── logger.js    # Logging utilities
│   │   ├── templates.js # Template management
│   │   └── tools.js     # Tool detection
│   ├── constants.js     # Application constants
│   └── index.js         # Main exports
├── templates/           # Template files
├── test/               # Test files
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── fixtures/       # Test fixtures
├── docs/               # Documentation
├── examples/           # Example projects
└── scripts/            # Build scripts
```

## Making Changes

### Branching Strategy

1. **Feature Branches**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Bug Fix Branches**
   ```bash
   git checkout -b fix/issue-description
   ```

3. **Documentation Branches**
   ```bash
   git checkout -b docs/update-description
   ```

### Development Workflow

1. **Create a Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Your Changes**
   - Write code following our style guide
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   pnpm test
   pnpm lint
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

## Testing

### Writing Tests

Tests are located in the `test/` directory and mirror the source structure:

```javascript
// test/unit/utils/files.test.js
import { describe, it, expect } from '@jest/globals';
import { ensureDirectory } from '../../../src/utils/files.js';

describe('ensureDirectory', () => {
  it('should create directory if it does not exist', async () => {
    // Test implementation
  });
});
```

### Test Guidelines

1. **Unit Tests**: Test individual functions and modules
2. **Integration Tests**: Test complete workflows
3. **Coverage**: Aim for >80% code coverage
4. **Naming**: Use descriptive test names that explain what is being tested

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/utils/files.test.js

# Run with coverage
pnpm test:coverage

# Watch mode during development
pnpm test:watch
```

## Submitting Changes

### Pull Request Process

1. **Update Your Branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push to Your Fork**
   ```bash
   git push origin feature/amazing-feature
   ```

3. **Create Pull Request**
   - Go to https://github.com/pnocera/nspecify
   - Click "Compare & pull request"
   - Fill out the PR template
   - Link any related issues

4. **PR Requirements**
   - All tests must pass
   - Code must be linted
   - Documentation must be updated
   - Commit messages follow our guidelines

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guide
- [ ] I have added tests
- [ ] I have updated documentation
- [ ] I have added JSDoc comments
```

## Style Guide

### JavaScript Style

We use ESLint with a custom configuration. Key points:

1. **ES Modules**: Use ES6 import/export
   ```javascript
   // Good
   import { readFile } from 'fs/promises';
   export const myFunction = () => {};

   // Bad
   const fs = require('fs');
   module.exports = myFunction;
   ```

2. **Async/Await**: Prefer async/await over promises
   ```javascript
   // Good
   async function loadData() {
     const data = await readFile('data.json');
     return JSON.parse(data);
   }

   // Bad
   function loadData() {
     return readFile('data.json')
       .then(data => JSON.parse(data));
   }
   ```

3. **Error Handling**: Always handle errors appropriately
   ```javascript
   try {
     await riskyOperation();
   } catch (error) {
     logger.error('Operation failed:', error);
     throw new Error(`Failed to complete operation: ${error.message}`);
   }
   ```

### Documentation Style

1. **JSDoc Comments**
   ```javascript
   /**
    * Initialize a new Spec-Driven Development project
    * @param {string} projectName - Name of the project to create
    * @param {Object} options - Configuration options
    * @param {string} [options.aiAssistant] - Pre-selected AI assistant
    * @param {string} [options.scriptType] - Pre-selected script type
    * @returns {Promise<void>}
    * @throws {Error} If project creation fails
    */
   export async function initProject(projectName, options = {}) {
     // Implementation
   }
   ```

2. **Inline Comments**
   ```javascript
   // Check if running on Windows
   const isWindows = process.platform === 'win32';
   
   // Use PowerShell on Windows, bash otherwise
   const defaultShell = isWindows ? 'powershell' : 'bash';
   ```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Test changes
- **chore**: Build process or auxiliary tool changes

### Examples

```bash
# Feature
git commit -m "feat(init): add support for Gemini CLI"

# Bug fix
git commit -m "fix(windows): correct PowerShell script execution"

# Documentation
git commit -m "docs: update installation instructions for pnpm"

# With body
git commit -m "feat(ui): add progress indicator

- Add ora spinner for download progress
- Show ETA for large downloads
- Handle cancellation gracefully"
```

## Release Process

### Version Bumping

We use semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

### Release Commands

```bash
# Create a patch release (0.1.0 -> 0.1.1)
pnpm build:patch

# Create a minor release (0.1.0 -> 0.2.0)
pnpm build:minor

# Create a major release (0.1.0 -> 1.0.0)
pnpm build:major

# Dry run (no version bump)
pnpm build:dry
```

### Release Checklist

1. [ ] All tests pass
2. [ ] Documentation is updated
3. [ ] CHANGELOG.md is updated
4. [ ] Version bumped appropriately
5. [ ] Release notes written
6. [ ] NPM package published

## Getting Help

### Resources

- [Project Documentation](./docs)
- [GitHub Issues](https://github.com/pnocera/nspecify/issues)
- [Discussions](https://github.com/pnocera/nspecify/discussions)

### Contact

- Open an issue for bug reports
- Start a discussion for feature requests
- Tag maintainers for urgent issues

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- Our contributors page

Thank you for contributing to nspecify! 🎉