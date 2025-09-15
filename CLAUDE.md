# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

NSpecify is a Node.js CLI tool for implementing Spec-Driven Development (SDD) with AI assistants. It provides an npx-compatible interface to initialize projects with templates for Claude Code, Gemini CLI, GitHub Copilot, and Cursor.

## Build Commands

### Development Setup
```bash
# Install dependencies
pnpm install

# Run in development mode with auto-reload
pnpm dev
```

### Running the CLI
```bash
# Direct execution
node bin/nspecify.js init <project-name>

# Via pnpm
pnpm start init <project-name>

# Global usage (after installation)
nspecify init <project-name>
```

### Testing
```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Generate coverage report
pnpm test:coverage

# Watch mode for development
pnpm test:watch
```

### Code Quality
```bash
# Run ESLint
pnpm lint

# Format code with Prettier
pnpm format
```

### Building and Publishing
```bash
# Build for release (includes validation)
pnpm build

# Version-specific builds
pnpm build:patch
pnpm build:minor
pnpm build:major

# Validate build
pnpm validate
```

## Architecture

### Core Components

1. **CLI Entry** (`bin/nspecify.js`): Main executable using ES modules
2. **Command Router** (`src/index.js`): Commander.js setup with two commands:
   - `init [project-name]`: Project initialization with interactive prompts
   - `check`: System requirements verification

3. **Command Implementations** (`src/commands/`):
   - `init.js`: Orchestrates project setup, AI selection, template download
   - `check.js`: Verifies Node.js, Git, and shell compatibility

4. **UI System** (`src/ui/`): Custom terminal UI components
   - `selector.js`: Interactive menu with keyboard navigation
   - `tracker.js`: Progress tracking with ora spinners
   - `banner.js`: ASCII art and branding
   - `keyboard.js`: Cross-platform keyboard input handling

5. **Utilities** (`src/utils/`):
   - `templates.js`: GitHub release downloads with retry logic
   - `files.js`: File operations and permission management
   - `tools.js`: System detection (OS, shell, tools)
   - `git.js`: Repository detection via simple-git
   - `logger.js`: Colored console output with chalk
   - `errors.js`: Custom error types with user-friendly messages
   - `cache.js`: Template caching functionality

### Key Design Patterns

1. **Interactive CLI Flow**: Uses custom UI components for user-friendly selection
2. **Cross-Platform Support**: Detects OS and suggests appropriate script type (POSIX/PowerShell)
3. **Template System**: Downloads versioned templates from GitHub releases based on AI assistant choice
4. **Error Recovery**: Comprehensive error handling with retry mechanisms and fallback options
5. **Modular Architecture**: Clear separation between commands, UI, and utilities

### Template Structure

Templates are downloaded as ZIP archives containing:
```
templates/
└── sdd/
    ├── scripts/      # Shell scripts (*.sh or *.ps1)
    └── templates/    # AI command templates
```

## Development Guidelines

1. **ES Modules**: Project uses `"type": "module"` - all imports must include `.js` extension
2. **Node.js Version**: Requires Node.js >= 20.0.0 for native ES module support
3. **Error Handling**: Always provide user-friendly error messages with suggested fixes
4. **Cross-Platform**: Test on Windows (PowerShell), macOS, and Linux
5. **Testing**: Maintain 80% coverage threshold for all metrics
6. **UI Consistency**: Use existing UI components from `src/ui/` for user interaction

## Common Tasks

### Adding a New AI Assistant
1. Update `AI_ASSISTANTS` array in `src/constants.js`
2. Ensure template variant exists in GitHub releases
3. Update selector display in `src/commands/init.js`
4. Add to documentation

### Modifying Interactive Flows
1. Use `Selector` class from `src/ui/selector.js` for menus
2. Use `Tracker` class for progress indication
3. Handle keyboard interrupts gracefully
4. Provide clear instructions and feedback

### Working with Templates
1. Templates are downloaded from `https://github.com/pnocera/nspecify/releases`
2. URL format: `download/latest/nspecify-{ai}-{script}.zip`
3. Extraction preserves directory structure
4. Scripts get executable permissions on POSIX systems

### Debugging
```bash
# Enable debug logging
nspecify init my-project --debug

# Check system requirements
nspecify check --json
```

## Testing Strategy

- **Unit Tests**: Test individual modules in isolation
- **Integration Tests**: Test full command workflows
- **Test Location**: Tests live alongside source files (*.test.js)
- **Coverage**: Enforced 80% minimum for branches, functions, lines, statements
- **Test Runners**: Jest with Node.js test environment