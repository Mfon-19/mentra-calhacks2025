const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const BackendManager = require('./scripts/start-backend');

let mainWindow;
let backendManager;

// Overlay screen function triggered by '/' key - creates a new Electron window
function triggerOverlayScreen() {
  console.log('Overlay screen triggered by "/" key press - creating new window');
  
  // Create a new overlay window - independent from main window
  const overlayWindow = new BrowserWindow({
    width: 600,
    height: 400,
    minWidth: 400,
    minHeight: 300,
    // Remove parent property to make it independent
    // parent: mainWindow, // Removed - now independent
    // modal: false, // Not needed for independent window
    alwaysOnTop: true, // Keep it above other windows
    frame: true, // Keep frame for now, can be set to false for frameless
    // transparent: true, // Uncomment for transparent effect
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    title: 'Overlay Screen',
    show: false, // Don't show until ready
    x: 100, // Position on desktop
    y: 100
  });

  // Load content for the overlay window
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // In development, load from React dev server with a different route
    overlayWindow.loadURL('http://localhost:3001');
  } else {
    // In production, load the built React app
    overlayWindow.loadFile(path.join(__dirname, 'overlay-screen/build/index.html'));
  }

  // Show window when ready
  overlayWindow.once('ready-to-show', () => {
    overlayWindow.show();
    console.log('Overlay window opened');
  });

  // Handle overlay window closed
  overlayWindow.on('closed', () => {
    console.log('Overlay window closed');
  });

  // Send message to main window that overlay was created
  if (mainWindow) {
    mainWindow.webContents.send('child-process-output', 'Overlay window created');
  }

  return overlayWindow;
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Allow localhost requests
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Optional: add an icon
    show: false // Don't show until ready
  });

  // Start the Flask backend
  backendManager = new BackendManager();
  backendManager.start();

  // Load the React app
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // In development, load from React dev server
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // In production, load from built React app
    mainWindow.loadFile(path.join(__dirname, 'frontend/build/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Register global shortcut for '/' key
  const ret = globalShortcut.register('/', () => {
    console.log('Global shortcut "/" pressed');
    triggerOverlayScreen();
  });

  if (!ret) {
    console.log('Registration of global shortcut "/" failed');
  }

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Stop the backend when app is closing
  if (backendManager) {
    backendManager.stop();
  }
  
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// IPC handlers for communication with renderer process
ipcMain.handle('get-backend-status', () => {
  return backendManager ? backendManager.getStatus() : { isRunning: false };
});

ipcMain.handle('restart-backend', () => {
  if (backendManager) {
    backendManager.restart();
    return { success: true };
  }
  return { success: false };
});

// IPC handler to trigger overlay screen from renderer
ipcMain.handle('trigger-child-process', () => {
  try {
    const process = triggerOverlayScreen();
    return { success: true, pid: process.pid };
  } catch (error) {
    console.error('Error triggering overlay screen:', error);
    return { success: false, error: error.message };
  }
});

// Handle app activation (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
