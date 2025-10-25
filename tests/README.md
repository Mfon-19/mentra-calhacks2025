# CalHacks 2025 - Test Suite

Comprehensive testing suite for the overlay screen functionality in CalHacks 2025.

## Test Structure

```
tests/
├── e2e/                    # End-to-End Tests
│   └── overlay-screen.test.js
├── unit/                   # Unit Tests
│   └── overlay-screen.test.js
├── integration/            # Integration Tests
│   └── overlay-screen.test.js
├── __mocks__/              # Mock Files
├── setup.js               # Jest Setup
├── jest.config.js         # Jest Configuration
├── package.json           # Test Dependencies
├── run-tests.sh           # Test Runner Script
├── .gitignore             # Git Ignore Rules
└── README.md              # This file
```

## Test Types

### 1. End-to-End Tests (`e2e/`)
Tests the complete user flow from main app to overlay screen:
- Global shortcut registration and triggering
- Overlay window creation and display
- IPC communication between windows
- User interactions and button clicks
- Full integration flow testing
- Error handling and recovery
- Performance benchmarks

### 2. Unit Tests (`unit/`)
Tests individual functions and components in isolation:
- `triggerOverlayScreen()` function
- Global shortcut management
- Window configuration and properties
- Event handling
- URL loading logic
- Error handling
- Utility functions

### 3. Integration Tests (`integration/`)
Tests interaction between different parts of the system:
- Main app to overlay communication
- React component integration
- Backend API integration
- Window management
- Global shortcut integration
- Error recovery
- Performance under load

## Running Tests

### Install Dependencies
```bash
cd tests
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Types
```bash
# End-to-End tests
npm run test:e2e

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration
```

### Run with Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

### CI Mode
```bash
npm run test:ci
```

## Test Coverage

The test suite covers:
- ✅ Global shortcut registration and triggering
- ✅ Overlay window creation and configuration
- ✅ IPC communication between processes
- ✅ React component rendering and interaction
- ✅ Backend API integration
- ✅ Error handling and recovery
- ✅ Performance and load testing
- ✅ Window management and lifecycle
- ✅ User interaction flows

## Mocking

The test suite includes comprehensive mocks for:
- Electron APIs (`BrowserWindow`, `globalShortcut`, `ipcMain`, `ipcRenderer`)
- Node.js modules (`child_process`, `path`)
- Browser APIs (`fetch`, `window.electronAPI`)
- React components and state management

## Test Data

Tests use mock data for:
- Backend API responses
- Window configurations
- User interactions
- Error scenarios
- Performance benchmarks

## Continuous Integration

The test suite is designed to run in CI environments:
- Headless mode support
- Timeout configurations
- Coverage reporting
- Error handling
- Performance thresholds

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Specific Test
```bash
npm test -- --testNamePattern="should create overlay window"
```

### Run Single Test File
```bash
npm test tests/unit/overlay-screen.test.js
```

## Test Environment

- **Node.js**: v16+
- **Jest**: v29+
- **Electron**: v27+
- **Babel**: v7+

## Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Add appropriate mocks for new dependencies
3. Update coverage expectations
4. Document new test scenarios
5. Ensure tests are deterministic and reliable
