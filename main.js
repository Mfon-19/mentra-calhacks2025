const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  desktopCapturer,
  screen,
} = require("electron");
const path = require("path");

let mainWindow;
let overlayWindow = null; // Track the overlay window

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
    width: 500,
    height: 200,
    minWidth: 200,
    minHeight: 150,
    backgroundColor: "#f5f5f0",
    // Remove parent property to make it independent
    // parent: mainWindow, // Removed - now independent
    // modal: false, // Not needed for independent window
    alwaysOnTop: true, // Keep it above other windows
    frame: true, // Keep frame for now, can be set to false for frameless
    // transparent: true, // Uncomment for transparent effect
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
  const isDev = !app.isPackaged;

  if (isDev) {
    // In development, try dev server first; fallback to built files if it fails
    overlayWindow.loadURL("http://localhost:3001").catch(() => {
      console.log(
        "Overlay dev server not available; falling back to built files"
      );
      overlayWindow.loadFile(
        path.join(__dirname, "overlay-screen/build/index.html")
      );
    });

    // Also handle async load failures
    overlayWindow.webContents.on(
      "did-fail-load",
      (_event, _errorCode, _errorDescription, validatedURL) => {
        if (validatedURL && validatedURL.startsWith("http://localhost:3001")) {
          console.log(
            "Overlay failed to load dev server; loading built files instead"
          );
          overlayWindow.loadFile(
            path.join(__dirname, "overlay-screen/build/index.html")
          );
        }
      }
    );
  } else {
    // In production, load the built React app
    overlayWindow.loadFile(
      path.join(__dirname, "overlay-screen/build/index.html")
    );
  }

  // Show and initialize after content is fully loaded
  overlayWindow.webContents.once("did-finish-load", () => {
    overlayWindow.show();
    console.log("Overlay window opened");

    // Send initial content to overlay renderer
    overlayWindow.webContents.send("overlay-set-content", {
      header: "Step 1",
      body: "Using prototyping features to connect frames, add interactions, and create clickable mockups that simulate user flows.",
    });
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

  // Backend is managed externally; no backend process started here

  // Load the React app
  const isDev = !app.isPackaged;

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

  app.on("activate", () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  // Close overlay window if it exists
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
  }

  // Unregister all global shortcuts
  globalShortcut.unregisterAll();

  // On macOS, keep app running even when all windows are closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle app before quit to ensure proper cleanup
app.on("before-quit", () => {
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

// IPC handlers for communication with renderer process
ipcMain.handle("get-backend-status", () => ({ isRunning: false }));

ipcMain.handle("restart-backend", () => ({ success: false }));

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

// IPC handler for taking screenshots
ipcMain.handle("take-screenshot", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (sources.length === 0) {
      throw new Error("No screen sources available");
    }

    // Get the primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const source =
      sources.find(
        (source) =>
          source.name === "Entire Screen" || source.name === "Screen 1"
      ) || sources[0];

    // Convert to base64
    const screenshot = source.thumbnail.toPNG();
    const base64Image = screenshot.toString("base64");

    return {
      success: true,
      data: base64Image,
      size: screenshot.length,
      display: {
        width: primaryDisplay.bounds.width,
        height: primaryDisplay.bounds.height,
      },
    };
  } catch (error) {
    console.error("Error taking screenshot:", error);
    return { success: false, error: error.message };
  }
});

// Handle app activation (macOS)
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
