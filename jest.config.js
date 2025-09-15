export default {
  testEnvironment: 'node',
  testMatch: [
    '**/src/**/*.test.js',
    '**/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {},
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  testTimeout: 10000
};