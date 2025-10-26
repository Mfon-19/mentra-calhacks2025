// Mock Electron module for testing
module.exports = {
  app: {
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
    getPath: jest.fn(() => '/mock/path')
  },
  BrowserWindow: Object.assign(jest.fn().mockImplementation((options) => {
    // Check for invalid configuration
    if (options && (options.width < 0 || options.height < 0)) {
      throw new Error('Invalid window configuration');
    }
    
    const mockWindow = {
      loadURL: jest.fn(),
      loadFile: jest.fn(),
      show: jest.fn(() => { mockWindow._visible = true; }),
      close: jest.fn(),
      on: jest.fn((event, callback) => {
        // Store event listeners for manual triggering
        if (!mockWindow._listeners) mockWindow._listeners = {};
        if (!mockWindow._listeners[event]) mockWindow._listeners[event] = [];
        mockWindow._listeners[event].push(callback);
      }),
      once: jest.fn((event, callback) => {
        // Store one-time listeners
        if (!mockWindow._onceListeners) mockWindow._onceListeners = {};
        if (!mockWindow._onceListeners[event]) mockWindow._onceListeners[event] = [];
        mockWindow._onceListeners[event].push(callback);
      }),
      emit: jest.fn((event, ...args) => {
        // Trigger stored listeners
        if (mockWindow._listeners && mockWindow._listeners[event]) {
          mockWindow._listeners[event].forEach(callback => callback(...args));
        }
        if (mockWindow._onceListeners && mockWindow._onceListeners[event]) {
          mockWindow._onceListeners[event].forEach(callback => callback(...args));
          mockWindow._onceListeners[event] = []; // Clear one-time listeners
        }
      }),
      getSize: jest.fn(() => [600, 400]),
      getPosition: jest.fn(() => [100, 100]),
      getMinimumSize: jest.fn(() => [400, 300]),
      isAlwaysOnTop: jest.fn(() => true),
      isFrameless: jest.fn(() => false),
      isVisible: jest.fn(() => mockWindow._visible || false),
      focus: jest.fn(),
      blur: jest.fn(),
      setSize: jest.fn(),
      webContents: {
        executeJavaScript: jest.fn((code) => {
          // Mock DOM queries based on the JavaScript code
          if (code.includes('document.querySelector(\'.overlay-screen__header h1\').textContent')) {
            return Promise.resolve('Overlay Screen');
          }
          if (code.includes('document.querySelector(\'.overlay-screen__status\').textContent')) {
            return Promise.resolve('Status: Active');
          }
          if (code.includes('document.querySelectorAll(\'.overlay-screen__button\').length')) {
            return Promise.resolve(2);
          }
          if (code.includes('document.querySelector(\'.overlay-screen__timestamp\').textContent')) {
            return Promise.resolve('Created: ' + new Date().toISOString());
          }
          if (code.includes('document.querySelector(\'.overlay-screen\').className')) {
            return Promise.resolve('overlay-screen');
          }
          if (code.includes('window.electronAPI.triggerChildProcess()')) {
            return Promise.resolve({ success: true });
          }
          if (code.includes('window.electronAPI.nonExistentHandler()')) {
            return Promise.reject(new Error('window.electronAPI.nonExistentHandler is not a function'));
          }
          // Default response
          return Promise.resolve({ success: true });
        }),
        send: jest.fn(),
        on: jest.fn((event, callback) => {
          // Store webContents event listeners
          if (!mockWindow.webContents._listeners) mockWindow.webContents._listeners = {};
          if (!mockWindow.webContents._listeners[event]) mockWindow.webContents._listeners[event] = [];
          mockWindow.webContents._listeners[event].push(callback);
        }),
        once: jest.fn((event, callback) => {
          // Store webContents one-time listeners
          if (!mockWindow.webContents._onceListeners) mockWindow.webContents._onceListeners = {};
          if (!mockWindow.webContents._onceListeners[event]) mockWindow.webContents._onceListeners[event] = [];
          mockWindow.webContents._onceListeners[event].push(callback);
        }),
        emit: jest.fn((event, ...args) => {
          // Trigger webContents listeners
          if (mockWindow.webContents._listeners && mockWindow.webContents._listeners[event]) {
            mockWindow.webContents._listeners[event].forEach(callback => callback(...args));
          }
          if (mockWindow.webContents._onceListeners && mockWindow.webContents._onceListeners[event]) {
            mockWindow.webContents._onceListeners[event].forEach(callback => callback(...args));
            mockWindow.webContents._onceListeners[event] = []; // Clear one-time listeners
          }
        }),
        getTitle: jest.fn(() => 'Overlay Screen'),
        getWebPreferences: jest.fn(() => ({
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false
        }))
      },
      id: Math.random(),
      _visible: false
    };
    return mockWindow;
  }), {
    getAllWindows: jest.fn(() => [
      { 
        getTitle: () => 'CalHacks Main App',
        webContents: {
          executeJavaScript: jest.fn(() => Promise.resolve({ success: true }))
        }
      },
      { 
        getTitle: () => 'Overlay Screen',
        webContents: {
          executeJavaScript: jest.fn((code) => {
            if (code.includes('document.querySelector(\'.overlay-screen\').className')) {
              return Promise.resolve('overlay-screen');
            }
            return Promise.resolve({ success: true });
          })
        }
      }
    ])
  }),
  globalShortcut: (() => {
    const registered = new Set();
    return {
      register: jest.fn((shortcut, callback) => {
        if (registered.has(shortcut)) {
          return false; // Already registered
        }
        registered.add(shortcut);
        return true;
      }),
      unregister: jest.fn((shortcut) => {
        registered.delete(shortcut);
        return true;
      }),
      unregisterAll: jest.fn(() => {
        registered.clear();
        return true;
      }),
      isRegistered: jest.fn((shortcut) => {
        return registered.has(shortcut);
      }),
      emit: jest.fn()
    };
  })(),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    send: jest.fn()
  }
};
