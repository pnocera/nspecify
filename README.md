# NSpecify

[![npm version](https://img.shields.io/npm/v/nspecify.svg)](https://www.npmjs.com/package/nspecify)
[![Node.js version](https://img.shields.io/node/v/nspecify.svg)](https://nodejs.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A powerful Node.js CLI tool for implementing Spec-Driven Development (SDD) with AI assistants like Claude Code, Gemini CLI, GitHub Copilot, and Cursor.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Command Reference](#command-reference)
- [Features](#features)
- [Requirements](#requirements)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

Get started with Spec-Driven Development in seconds:

```bash
npx nspecify init my-awesome-project
```

This command will interactively guide you through setting up your project with the appropriate AI assistant and script type.

## Installation

### Using npx (Recommended)

No installation required! Simply run:

```bash
npx nspecify init <project-name>
```

### Global Installation

#### Using npm

```bash
npm install -g nspecify
```

#### Using pnpm

```bash
pnpm add -g nspecify
```

#### Using yarn

```bash
yarn global add nspecify
```

### Local Installation

Add to your project as a dev dependency:

```bash
# npm
npm install --save-dev nspecify

# pnpm
pnpm add -D nspecify

# yarn
yarn add -D nspecify
```

## Usage

### Initialize a New Project

```bash
nspecify init <project-name> [options]
```

This will:
1. Create a new project directory
2. Prompt you to select your AI assistant (Claude Code, Gemini CLI, GitHub Copilot, or Cursor)
3. Detect your shell and prompt for script type (POSIX Shell or PowerShell)
4. Download and extract the appropriate templates
5. Set up executable permissions on POSIX systems
6. Initialize your Spec-Driven Development workflow

#### Options

- `--ai-assistant <assistant>` - Pre-select AI assistant (claude-code, gemini-cli, github-copilot, cursor)
- `--script-type <type>` - Pre-select script type (posix, powershell)
- `--skip-tls` - Skip TLS/SSL certificate verification (use with caution)
- `--timeout <ms>` - Download timeout in milliseconds (default: 60000)
- `--max-retries <n>` - Maximum download retry attempts (default: 3)
- `--debug` - Enable debug logging

#### Examples

```bash
# Interactive mode (recommended)
nspecify init my-project

# Pre-select options
nspecify init my-project --ai-assistant claude-code --script-type posix

# Windows PowerShell example
nspecify init my-project --ai-assistant cursor --script-type powershell

# Debug mode for troubleshooting
nspecify init my-project --debug
```

### Check System Requirements

```bash
nspecify check [options]
```

Verifies that your system has all required tools installed:
- Node.js version
- Git availability
- Script shell compatibility

#### Options

- `--json` - Output results in JSON format
- `--script-type <type>` - Check specific script type compatibility

## Command Reference

### `nspecify init <project-name>`

Initialize a new Spec-Driven Development project.

**Arguments:**
- `<project-name>` - Name of the project directory to create

**Options:**
- `--ai-assistant <assistant>` - AI assistant to use
- `--script-type <type>` - Script type to use
- `--skip-tls` - Skip TLS verification
- `--timeout <ms>` - Download timeout
- `--max-retries <n>` - Retry attempts
- `--debug` - Debug mode

### `nspecify check`

Check system requirements and compatibility.

**Options:**
- `--json` - JSON output format
- `--script-type <type>` - Check specific script type

### `nspecify --version`

Display the current version of nspecify.

### `nspecify --help`

Show help information.

## Features

### AI Assistant Support

nspecify supports multiple AI assistants with tailored templates:

- **Claude Code** - Anthropic's official CLI for Claude
- **Gemini CLI** - Google's Gemini AI CLI
- **GitHub Copilot** - GitHub's AI pair programmer
- **Cursor** - The AI code editor

### Cross-Platform Scripts

Choose the script type that works best for your environment:

- **POSIX Shell** - For macOS, Linux, and WSL (bash, zsh, sh)
- **PowerShell** - For Windows PowerShell and PowerShell Core

### Template System

Each template includes:
- `/specify` command - Create feature specifications
- `/plan` command - Generate technical implementation plans
- `/tasks` command - Break down plans into actionable tasks
- Constitutional principles for consistent AI behavior
- Best practices for Spec-Driven Development

### Smart Detection

- Automatically detects your operating system
- Identifies available shells
- Suggests the most appropriate script type
- Verifies system requirements

### Robust Error Handling

- Graceful fallback for network issues
- Detailed error messages with solutions
- Debug mode for troubleshooting
- Retry mechanism for downloads

## Requirements

- **Node.js** >= 20.0.0
- **Git** (for version control)
- **An AI Assistant**:
  - Claude Code (claude.ai/code)
  - Gemini CLI
  - GitHub Copilot
  - Cursor
- **Shell** (one of):
  - POSIX-compatible shell (bash, zsh, sh) on macOS/Linux/WSL
  - PowerShell on Windows

## Troubleshooting

### Installation Issues

#### "Command not found" after global installation

**npm:**
```bash
# Check npm global bin directory
npm config get prefix
# Add to PATH if needed
export PATH=$PATH:$(npm config get prefix)/bin
```

**pnpm:**
```bash
# Check pnpm global bin directory
pnpm config get global-bin-dir
# Add to PATH if needed
export PATH=$PATH:$(pnpm config get global-bin-dir)
```

#### Permission denied errors

On POSIX systems:
```bash
# Use sudo for global installation
sudo npm install -g nspecify

# Or configure npm to use a different directory
npm config set prefix ~/.npm-global
export PATH=$PATH:~/.npm-global/bin
```

### Download Issues

#### SSL/TLS Certificate Errors

```bash
# Temporarily skip TLS verification (use with caution)
nspecify init my-project --skip-tls

# Or set NODE_TLS_REJECT_UNAUTHORIZED=0 (not recommended for production)
NODE_TLS_REJECT_UNAUTHORIZED=0 nspecify init my-project
```

#### Timeout Errors

```bash
# Increase timeout (in milliseconds)
nspecify init my-project --timeout 120000

# Increase retry attempts
nspecify init my-project --max-retries 5
```

#### Proxy Issues

```bash
# Set proxy environment variables
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
nspecify init my-project
```

### Script Execution Issues

#### "Scripts cannot be executed" on Windows

Run in PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### "Permission denied" on POSIX systems

nspecify automatically sets execute permissions, but if issues persist:
```bash
chmod +x scripts/*.sh
```

### Debug Mode

For detailed troubleshooting information:
```bash
nspecify init my-project --debug
```

This will show:
- Download URLs and progress
- File operations
- Shell detection results
- Error stack traces

## FAQ

### What is Spec-Driven Development?

Spec-Driven Development (SDD) is a methodology where specifications are the primary artifacts that drive implementation. Instead of writing code first, you write detailed specifications that AI assistants can use to generate consistent, high-quality code.

### Which AI assistant should I choose?

- **Claude Code**: Best for complex reasoning and detailed implementations
- **Gemini CLI**: Great for Google ecosystem integration
- **GitHub Copilot**: Ideal if you're already using GitHub
- **Cursor**: Perfect for IDE-integrated development

### Can I use this with an existing project?

Yes! Run `nspecify init` in your existing project directory. It will create a `.sdd` subdirectory with the templates and scripts without affecting your existing code.

### How do I update templates?

Templates are versioned with each release. To get the latest templates:
```bash
# Reinitialize with latest templates
nspecify init . --ai-assistant <your-assistant> --script-type <your-type>
```

### Can I customize the templates?

Yes! After initialization, templates are in your project's `.sdd/templates` directory. You can modify them to fit your team's needs.

### Does this work in CI/CD pipelines?

Yes! Use the non-interactive options:
```bash
nspecify init project --ai-assistant claude-code --script-type posix
```

### Is this Windows-compatible?

Absolutely! nspecify fully supports Windows with PowerShell scripts. It also works in WSL with POSIX scripts.

### What's the difference between script types?

- **POSIX**: Uses `.sh` files, works on macOS, Linux, and WSL
- **PowerShell**: Uses `.ps1` files, works on Windows and PowerShell Core on any platform

### Can I use this offline?

The initial template download requires internet connection. After that, all operations work offline.

### How do I report issues?

Please report issues on our [GitHub repository](https://github.com/pnocera/nspecify/issues).

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by the NSpecify team