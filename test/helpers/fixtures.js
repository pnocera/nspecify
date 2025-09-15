// Test fixtures
export const fixtures = {
  templates: {
    claudeCode: {
      name: 'claude-code-bash',
      url: 'https://github.com/pnocera/nspecify/releases/download/v1.0.0/claude-code-bash.zip',
      files: [
        'templates/specify.md',
        'templates/plan.md',
        'templates/tasks.md',
        'scripts/create-new-feature.sh',
        'scripts/setup-plan.sh',
        'scripts/update-claude-md.sh',
        'CLAUDE.md'
      ]
    },
    cursor: {
      name: 'cursor-powershell',
      url: 'https://github.com/pnocera/nspecify/releases/download/v1.0.0/cursor-powershell.zip',
      files: [
        'templates/specify.md',
        'templates/plan.md',
        'templates/tasks.md',
        'scripts/create-new-feature.ps1',
        'scripts/setup-plan.ps1',
        'scripts/update-claude-md.ps1',
        'CLAUDE.md'
      ]
    }
  },

  gitStatus: {
    clean: {
      current: 'main',
      tracking: 'origin/main',
      ahead: 0,
      behind: 0,
      modified: [],
      not_added: [],
      deleted: [],
      created: [],
      conflicted: [],
      renamed: [],
      files: []
    },
    dirty: {
      current: 'feature/test',
      tracking: null,
      ahead: 2,
      behind: 0,
      modified: ['src/index.js', 'README.md'],
      not_added: ['test.js'],
      deleted: [],
      created: ['new-file.js'],
      conflicted: [],
      renamed: [],
      files: [
        { path: 'src/index.js', index: 'M', working_dir: ' ' },
        { path: 'README.md', index: 'M', working_dir: ' ' },
        { path: 'test.js', index: '?', working_dir: '?' },
        { path: 'new-file.js', index: 'A', working_dir: ' ' }
      ]
    }
  },

  tools: {
    all: {
      git: { installed: true, version: '2.45.0' },
      node: { installed: true, version: '20.11.0' },
      npm: { installed: true, version: '10.2.4' },
      claude: { installed: true, version: '1.0.0' },
      cursor: { installed: true, version: '0.40.0' },
      copilot: { installed: true, version: '1.30.0' },
      gemini: { installed: false }
    },
    minimal: {
      git: { installed: true, version: '2.45.0' },
      node: { installed: true, version: '20.11.0' },
      npm: { installed: true, version: '10.2.4' },
      claude: { installed: false },
      cursor: { installed: false },
      copilot: { installed: false },
      gemini: { installed: false }
    },
    none: {
      git: { installed: false },
      node: { installed: false },
      npm: { installed: false },
      claude: { installed: false },
      cursor: { installed: false },
      copilot: { installed: false },
      gemini: { installed: false }
    }
  },

  releaseData: {
    success: {
      tag_name: 'v1.0.0',
      published_at: '2024-01-15T12:00:00Z',
      assets: [
        {
          name: 'claude-code-bash.zip',
          browser_download_url: 'https://github.com/pnocera/nspecify/releases/download/v1.0.0/claude-code-bash.zip'
        },
        {
          name: 'claude-code-powershell.zip',
          browser_download_url: 'https://github.com/pnocera/nspecify/releases/download/v1.0.0/claude-code-powershell.zip'
        },
        {
          name: 'cursor-bash.zip',
          browser_download_url: 'https://github.com/pnocera/nspecify/releases/download/v1.0.0/cursor-bash.zip'
        },
        {
          name: 'cursor-powershell.zip',
          browser_download_url: 'https://github.com/pnocera/nspecify/releases/download/v1.0.0/cursor-powershell.zip'
        }
      ]
    },
    empty: {
      tag_name: 'v1.0.0',
      published_at: '2024-01-15T12:00:00Z',
      assets: []
    }
  },

  zipContent: {
    'templates/specify.md': '# Specify Template\n\nTest content',
    'templates/plan.md': '# Plan Template\n\nTest content',
    'templates/tasks.md': '# Tasks Template\n\nTest content',
    'scripts/create-new-feature.sh': '#!/bin/bash\necho "Creating feature"',
    'scripts/create-new-feature.ps1': '# PowerShell script\nWrite-Host "Creating feature"',
    'CLAUDE.md': '# Claude Instructions\n\nTest instructions'
  },

  userInputs: {
    standard: {
      projectName: 'test-project',
      aiTool: 'claude-code',
      scriptType: 'bash',
      proceed: 'y'
    },
    windows: {
      projectName: 'test-project',
      aiTool: 'cursor',
      scriptType: 'powershell',
      proceed: 'y'
    },
    cancel: {
      projectName: 'test-project',
      aiTool: 'claude-code',
      scriptType: 'bash',
      proceed: 'n'
    }
  }
};

// Create mock zip file content
export const createMockZipBuffer = (files = fixtures.zipContent) => {
  // This would be replaced with actual zip creation in real tests
  // For now, return a buffer that our mock can recognize
  return Buffer.from(JSON.stringify(files));
};

// Create mock HTTP response
export const createMockResponse = (data, status = 200) => ({
  data,
  status,
  headers: {
    'content-type': 'application/json'
  }
});

// Create mock stream for downloads
export const createMockStream = async (data) => {
  const { Readable } = await import('stream');
  const stream = new Readable();
  stream.push(data);
  stream.push(null);
  return stream;
};