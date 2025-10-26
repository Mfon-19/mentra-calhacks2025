const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const mouseHook = require('mac-mouse-hook');

let mainWindow;
let overlayWindow = null; // Track the overlay window

// Mouse hook state
let isMouseHookActive = false;

// Overlay screen function triggered by '/' key - creates a new Electron window
function triggerOverlayScreen() {
  // Check if overlay window already exists
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    console.log("Overlay window already exists - closing it");
    overlayWindow.close();
    overlayWindow = null;
    return null;
  }

  console.log(
    'Overlay screen triggered by "/" key press - creating new window'
  );

  // Create a new overlay window - independent from main window
  overlayWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    // Remove parent property to make it independent
    // parent: mainWindow, // Removed - now independent
    // modal: false, // Not needed for independent window`
    alwaysOnTop: true, // Keep it above other windows
    frame: false, // Frameless for transparent effect
    transparent: true, // Enable transparency
    hasShadow: false, // Required for transparent windows on macOS
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    },
    title: "Overlay Screen",
    show: false, // Don't show until ready
    x: 100, // Position on desktop
    y: 100,
  });

  // Load content for the overlay window
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    // In development, load from React dev server with a different route
    overlayWindow.loadURL("http://localhost:3001");
  } else {
    // In production, load the built React app
    overlayWindow.loadFile(
      path.join(__dirname, "overlay-screen/build/index.html")
    );
  }

  // Show window when ready
  overlayWindow.once("ready-to-show", () => {
    overlayWindow.show();
    overlayWindow.webContents.openDevTools(); // Open DevTools for debugging
    console.log("Overlay window opened");
  });

  // Handle overlay window closed
  overlayWindow.on("closed", () => {
    console.log("Overlay window closed");
    overlayWindow = null; // Reset the reference when closed
  });

  // Send message to main window that overlay was created
  if (mainWindow) {
    mainWindow.webContents.send(
      "child-process-output",
      "Overlay window created"
    );
  }

  return overlayWindow;
}

// Mouse hook functions
function startMouseMonitoring() {
  if (isMouseHookActive) {
    console.log('Mouse hook already active');
    return;
  }

  try {
    mouseHook.start((event) => {
      // Print coordinates and timestamp
      console.log(`Mouse click: x=${event.x}, y=${event.y}, timestamp=${new Date().toISOString()}`);
      
      // Trigger action on every click
      triggerDebugAction(event);
    });

    isMouseHookActive = true;
  } catch (error) {
    console.error('Failed to start mouse hook:', error.message);
    
    if (error.message.includes('Accessibility permissions')) {
      console.log('Please enable accessibility permissions in System Preferences > Security & Privacy > Privacy > Accessibility');
    }
  }
}

function stopMouseMonitoring() {
  if (!isMouseHookActive) {
    return;
  }

  try {
    mouseHook.stop();
    isMouseHookActive = false;
  } catch (error) {
    console.error('Failed to stop mouse hook:', error.message);
  }
}

function triggerDebugAction(lastEvent) {
  console.log(`Action triggered: x=${lastEvent.x}, y=${lastEvent.y}, timestamp=${new Date().toISOString()}`);
  
  // Send debug message to main window if it exists
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('mouse-hook-debug', {
      action: 'click-detected',
      clickData: lastEvent,
      timestamp: new Date().toISOString()
    });
  }
  
  // Send debug message to overlay window if it exists
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('mouse-hook-debug', {
      action: 'click-detected',
      clickData: lastEvent,
      timestamp: new Date().toISOString()
    });
  }
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
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false, // Allow localhost requests
    },
    icon: path.join(__dirname, "assets/icon.png"), // Optional: add an icon
    show: false, // Don't show until ready
  });

  // Load the React app
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    // In development, load from React dev server
    mainWindow.loadURL("http://localhost:3000");
  } else {
    // In production, load from built React app
    mainWindow.loadFile(path.join(__dirname, "frontend/build/index.html"));
  }

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Register global shortcut for '/' key
  // Toggle behavior: creates overlay if none exists, closes it if it exists
  const ret = globalShortcut.register("/", () => {
    console.log('Global shortcut "/" pressed');
    triggerOverlayScreen();
  });

  if (!ret) {
    console.log('Registration of global shortcut "/" failed');
  }

  // Start mouse monitoring automatically
  startMouseMonitoring();

  app.on("activate", () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle app before quit to ensure proper cleanup
app.on("before-quit", () => {
  // Stop mouse monitoring
  if (isMouseHookActive) {
    stopMouseMonitoring();
  }
  
  // Close overlay window if it exists
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
  }
});

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
    require("electron").shell.openExternal(navigationUrl);
  });
});

// IPC handler to trigger overlay screen from renderer
ipcMain.handle("trigger-child-process", () => {
  try {
    const process = triggerOverlayScreen();
    return {
      success: true,
      pid: process ? process.pid : null,
      action: overlayWindow ? "opened" : "closed",
    };
  } catch (error) {
    console.error("Error triggering overlay screen:", error);
    return { success: false, error: error.message };
  }
});

// Mouse hook IPC handlers
ipcMain.handle("start-mouse-monitoring", () => {
  startMouseMonitoring();
  return { success: true, active: isMouseHookActive };
});

ipcMain.handle("stop-mouse-monitoring", () => {
  stopMouseMonitoring();
  return { success: true, active: isMouseHookActive };
});

ipcMain.handle("get-mouse-hook-status", () => {
  return { 
    active: isMouseHookActive
  };
});

// Handle app activation (macOS)
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
