const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Backend management
  getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  
  // Child process management
  triggerChildProcess: () => ipcRenderer.invoke('trigger-child-process'),
  
  // Screenshot functionality
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  
  // Mouse hook control
  startMouseMonitoring: () => ipcRenderer.invoke('start-mouse-monitoring'),
  stopMouseMonitoring: () => ipcRenderer.invoke('stop-mouse-monitoring'),
  getMouseHookStatus: () => ipcRenderer.invoke('get-mouse-hook-status'),
  
  // Listen for child process output
  onChildProcessOutput: (callback) => {
    ipcRenderer.on('child-process-output', (event, data) => callback(data));
  },
  
  // Listen for mouse hook debug messages
  onMouseHookDebug: (callback) => {
    ipcRenderer.on('mouse-hook-debug', (event, data) => callback(data));
  },
  
  // Platform information
  platform: process.platform,
  
  // App information
  appVersion: process.env.npm_package_version || '1.0.0',
  
  // Utility functions
  openExternal: (url) => {
    // This would need to be implemented in main.js if needed
    console.log('Opening external URL:', url);
  }
});

// Expose a simple API for the React app
contextBridge.exposeInMainWorld('api', {
  // Backend API base URL
  baseURL: 'http://localhost:5000',
  
  // Helper function to make API calls
  request: async (endpoint, options = {}) => {
    const url = `http://localhost:5000${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(url, mergedOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  // Specific API methods
  getHealth: () => fetch('http://localhost:5000/health').then(res => res.json()),
  getData: () => fetch('http://localhost:5000/api/data').then(res => res.json()),
  getTest: () => fetch('http://localhost:5000/api/test').then(res => res.json()),
  getFiles: () => fetch('http://localhost:5000/api/files').then(res => res.json()),
  
  // POST methods
  createData: (data) => fetch('http://localhost:5000/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json())
});
