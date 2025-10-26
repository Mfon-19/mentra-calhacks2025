module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  
  // Coverage configuration
  collectCoverage: false, // Disable by default for production
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'main.js',
    'preload.js',
    'overlay-screen/src/**/*.js',
    'frontend/src/**/*.js',
    'backend/**/*.py',
    '!**/node_modules/**',
    '!**/build/**',
    '!**/coverage/**'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Module paths
  modulePaths: ['<rootDir>'],
  
  // No transform needed for mocked tests
  
  
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};
