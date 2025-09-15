# nspecify v1.0.0 Release Notes

## 🎉 Introducing nspecify 1.0.0

We're excited to announce the first stable release of **nspecify**, a modern Node.js implementation of the spec-driven development CLI. This tool revolutionizes how teams build software by treating specifications as primary executable artifacts.

## ✨ Highlights

### Zero-Install Usage
```bash
npx nspecify init my-awesome-project
```
No need to install globally - just use npx and start building!

### Multi-AI Assistant Support
Choose from your favorite AI coding assistant:
- 🤖 Claude Code (claude.ai/code)
- 💎 Gemini CLI
- 🐙 GitHub Copilot (CLI)
- 💻 Cursor

### Cross-Platform Excellence
- Full support for Windows, macOS, and Linux
- Choose between POSIX Shell or PowerShell scripts
- Automatic permission handling on Unix systems

### Developer Experience
- 🎨 Beautiful terminal UI with progress tracking
- 📝 Helpful error messages with actionable suggestions
- 💾 Template caching for offline work
- ⚡ Lightning-fast startup time

## 📦 Installation

### Global Installation
```bash
npm install -g nspecify
nspecify init my-project
```

### Direct Usage with npx (Recommended)
```bash
npx nspecify init my-project
```

### From Source
```bash
git clone https://github.com/pnocera/nspecify.git
cd nspecify
pnpm install
pnpm link
```

## 🚀 Quick Start

1. Initialize a new project:
   ```bash
   npx nspecify init my-project
   ```

2. Select your AI assistant and script type when prompted

3. Navigate to your project:
   ```bash
   cd my-project
   ```

4. Start creating specifications:
   - Use `/specify` to create feature specifications
   - Use `/plan` to generate implementation plans
   - Use `/tasks` to break down work

## 📚 Documentation

- [User Guide](https://github.com/pnocera/nspecify/tree/main/README.md)
- [API Reference](https://github.com/pnocera/nspecify/tree/main/docs/API.md)
- [Architecture Overview](https://github.com/pnocera/nspecify/tree/main/docs/ARCHITECTURE.md)
- [Migration from Python Version](https://github.com/pnocera/nspecify/tree/main/examples/migration-guide.md)

## 🔄 Migrating from Python Version

If you're upgrading from the Python version:
1. Node.js 20+ is now required (instead of Python 3.11+)
2. Commands remain the same: `nspecify init <project-name>`
3. Templates are fully compatible
4. See the [migration guide](https://github.com/pnocera/nspecify/tree/main/examples/migration-guide.md) for details

## 🛡️ Security

- All dependencies have been audited and updated
- Fixed axios SSRF and DoS vulnerabilities
- Secure template downloading with proper validation

## 📊 Quality Metrics

- **Test Coverage**: 95%+
- **Node.js Support**: 20.x, 22.x, 23.x
- **Package Size**: < 10MB
- **Zero Runtime Dependencies**: All dependencies bundled

## 🙏 Acknowledgments

Thanks to all contributors who helped make this release possible! Special thanks to the teams using spec-driven development in production and providing valuable feedback.

## 📝 Full Changelog

See [CHANGELOG.md](https://github.com/pnocera/nspecify/tree/main/CHANGELOG.md) for the complete list of changes.

## 🐛 Reporting Issues

Found a bug or have a feature request? Please open an issue at:
https://github.com/pnocera/nspecify/issues

---

Happy spec-driven development! 🚀