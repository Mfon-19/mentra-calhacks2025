/**
 * Jest Setup File
 * Configures test environment and global mocks
 */

// Electron modules are mocked via __mocks__/electron.js

// Mock Node.js modules
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    kill: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn()
  }))
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(() => '/mock/dir')
}));

// Preserve real fetch for node-based tests that need it
global.__realFetch = global.fetch;

// Global fetch mock (skip when explicitly disabled)
if (process.env.JEST_USE_REAL_FETCH !== 'true') {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('')
    })
  );
}

// Mock window object for browser environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'electronAPI', {
    value: {
      triggerChildProcess: jest.fn(() => Promise.resolve({ success: true })),
      onChildProcessOutput: jest.fn(),
      getBackendStatus: jest.fn(() => Promise.resolve({ isRunning: true })),
      restartBackend: jest.fn(() => Promise.resolve({ success: true }))
    },
    writable: true
  });
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.ELECTRON_IS_DEV = '1';
