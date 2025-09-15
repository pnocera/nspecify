# nspecify

npx-compatible CLI for Spec-Driven Development with Claude Code

## Description

nspecify is a Node.js implementation of the Spec-Driven Development (SDD) methodology, designed to work seamlessly with Claude Code and other AI assistants. It provides templates and automation to help teams build software by treating specifications as primary executable artifacts.

## Installation

You can use nspecify without installation via npx:

```bash
npx nspecify init my-project
```

Or install globally:

```bash
npm install -g nspecify
# or
pnpm add -g nspecify
```

## Usage

Initialize a new project with Spec-Driven Development:

```bash
nspecify init <project-name>
```

This will:
1. Create a project directory
2. Download appropriate templates for your chosen AI assistant
3. Set up scripts for your platform (POSIX Shell or PowerShell)
4. Initialize your specification-driven workflow

## Requirements

- Node.js >= 20.0.0
- Git
- An AI assistant (Claude Code, Gemini CLI, GitHub Copilot, or Cursor)

## License

ISC